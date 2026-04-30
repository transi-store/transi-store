/**
 * Isomorphic markdown section parser.
 *
 * Splits a markdown (or MDX) document into a flat list of `Section`s using
 * headings and fenced code blocks as boundaries. Each section gets a stable
 * `structuralPath` derived from the heading hierarchy and sibling positions —
 * stable across translation of heading text, since the path only depends on
 * positions and types of blocks.
 *
 * Used:
 * - client-side, to drive cursor/scroll synchronization between two editors
 * - server-side, to reconcile per-section sidecar metadata on save and to
 *   extract a single section for AI translation.
 */
import type { Root, RootContent } from "mdast";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";

export type SectionType = "prose" | "code";

export type Section = {
  /** Position in the linear section list, 0-based. */
  index: number;
  type: SectionType;
  /**
   * For `prose` sections: heading depth (1..6) when the section is opened by
   * a heading; the parent heading depth (or 0 for root preamble) when the
   * section is a continuation between two boundaries.
   *
   * For `code` sections: always `null`.
   */
  depth: number | null;
  /** [from, to] character offsets in the source string. */
  range: [number, number];
  /**
   * Hierarchical path keying this section in the heading tree. Examples:
   * - `prose:0` — top-level preamble (no parent heading).
   * - `h1:0` — section opened by the first H1.
   * - `h1:0/h2:1` — second H2 under the first H1.
   * - `h1:0/h2:1/code:0` — first code block under that H2.
   * - `h1:0/prose:0` — continuation prose between two boundaries under H1[0].
   */
  structuralPath: string;
};

export type AlignmentEntry = {
  leftIndex: number | null;
  rightIndex: number | null;
};

const LOOKAHEAD = 3;

function buildProcessor(mdx: boolean) {
  const proc = unified().use(remarkParse).use(remarkGfm);
  return mdx ? proc.use(remarkMdx) : proc;
}

function getOffset(
  node: { position?: { start?: { offset?: number }; end?: { offset?: number } } },
): [number, number] {
  const from = node.position?.start?.offset ?? 0;
  const to = node.position?.end?.offset ?? from;
  return [from, to];
}

/**
 * Parse a markdown / MDX source string into a flat list of sections.
 *
 * Boundaries: headings (open a new prose section) and fenced code blocks
 * (atomic sections that don't merge with surrounding prose).
 */
export function parseSections(
  source: string,
  options: { mdx?: boolean } = {},
): Section[] {
  if (source.length === 0) return [];

  let tree: Root;
  try {
    tree = buildProcessor(options.mdx ?? false).parse(source) as Root;
  } catch {
    // On parse error, return a single prose section spanning the whole doc.
    // The UI will still let the user edit; alignment just won't work.
    return [
      {
        index: 0,
        type: "prose",
        depth: 0,
        range: [0, source.length],
        structuralPath: "prose:0",
      },
    ];
  }

  const sections: Omit<Section, "index">[] = [];
  // Stack of currently-open heading scopes, ordered by increasing depth.
  const headingStack: Array<{ depth: number; path: string }> = [];
  // Per-parent sibling counters: parentPath -> typeKey -> nextIndex.
  const siblingCounts = new Map<string, Map<string, number>>();

  function nextSibling(parent: string, typeKey: string): number {
    let m = siblingCounts.get(parent);
    if (!m) {
      m = new Map();
      siblingCounts.set(parent, m);
    }
    const idx = m.get(typeKey) ?? 0;
    m.set(typeKey, idx + 1);
    return idx;
  }

  function currentParent(): { path: string; depth: number } {
    if (headingStack.length === 0) return { path: "", depth: 0 };
    const top = headingStack[headingStack.length - 1];
    return { path: top.path, depth: top.depth };
  }

  let openProse: Omit<Section, "index"> | null = null;

  function flushProse() {
    if (openProse) {
      sections.push(openProse);
      openProse = null;
    }
  }

  for (const node of tree.children as RootContent[]) {
    if (!node.position) continue;

    if (node.type === "heading") {
      flushProse();

      const headingDepth = node.depth;
      // Pop the stack until top.depth < headingDepth so the new heading's
      // parent is the nearest ancestor heading of strictly lesser depth.
      while (
        headingStack.length > 0 &&
        headingStack[headingStack.length - 1].depth >= headingDepth
      ) {
        headingStack.pop();
      }

      const parent = currentParent();
      const idx = nextSibling(parent.path, `h${headingDepth}`);
      const ownPath = parent.path
        ? `${parent.path}/h${headingDepth}:${idx}`
        : `h${headingDepth}:${idx}`;
      headingStack.push({ depth: headingDepth, path: ownPath });

      const [from, to] = getOffset(node);
      openProse = {
        type: "prose",
        depth: headingDepth,
        range: [from, to],
        structuralPath: ownPath,
      };
      continue;
    }

    if (node.type === "code") {
      flushProse();

      const parent = currentParent();
      const idx = nextSibling(parent.path, "code");
      const ownPath = parent.path
        ? `${parent.path}/code:${idx}`
        : `code:${idx}`;
      const range = getOffset(node);
      sections.push({
        type: "code",
        depth: null,
        range,
        structuralPath: ownPath,
      });
      continue;
    }

    // Regular content node — extend the open prose section, or start a new
    // continuation section when there's none open (e.g. between code blocks).
    if (!openProse) {
      const parent = currentParent();
      const idx = nextSibling(parent.path, "prose");
      const ownPath = parent.path
        ? `${parent.path}/prose:${idx}`
        : `prose:${idx}`;
      const [from, to] = getOffset(node);
      openProse = {
        type: "prose",
        depth: parent.depth,
        range: [from, to],
        structuralPath: ownPath,
      };
    } else {
      const [, to] = getOffset(node);
      openProse.range = [openProse.range[0], to];
    }
  }

  flushProse();

  return sections.map((s, index) => ({ ...s, index }));
}

/**
 * Given two ordered section lists (one per locale), produce an interleaved
 * alignment: each entry is either a paired (left,right), a left-only orphan,
 * or a right-only orphan. Matching is by `structuralPath` equality with a
 * small look-ahead window for tolerance to one-side insertions/deletions.
 */
export function alignSections(
  left: Section[],
  right: Section[],
): AlignmentEntry[] {
  const result: AlignmentEntry[] = [];
  let i = 0;
  let j = 0;

  while (i < left.length || j < right.length) {
    if (i >= left.length) {
      result.push({ leftIndex: null, rightIndex: j });
      j++;
      continue;
    }
    if (j >= right.length) {
      result.push({ leftIndex: i, rightIndex: null });
      i++;
      continue;
    }

    if (left[i].structuralPath === right[j].structuralPath) {
      result.push({ leftIndex: i, rightIndex: j });
      i++;
      j++;
      continue;
    }

    const aheadInRight = findPathOffset(right, j, LOOKAHEAD, left[i].structuralPath);
    const aheadInLeft = findPathOffset(left, i, LOOKAHEAD, right[j].structuralPath);

    if (aheadInRight > 0 && (aheadInLeft <= 0 || aheadInRight <= aheadInLeft)) {
      for (let k = 0; k < aheadInRight; k++) {
        result.push({ leftIndex: null, rightIndex: j + k });
      }
      j += aheadInRight;
    } else if (aheadInLeft > 0) {
      for (let k = 0; k < aheadInLeft; k++) {
        result.push({ leftIndex: i + k, rightIndex: null });
      }
      i += aheadInLeft;
    } else {
      // No match within window: emit both as orphans and advance.
      result.push({ leftIndex: i, rightIndex: null });
      result.push({ leftIndex: null, rightIndex: j });
      i++;
      j++;
    }
  }

  return result;
}

function findPathOffset(
  sections: Section[],
  start: number,
  window: number,
  needle: string,
): number {
  const end = Math.min(sections.length, start + window);
  for (let k = start; k < end; k++) {
    if (sections[k].structuralPath === needle) return k - start;
  }
  return 0;
}

/**
 * Find the section that contains `offset`, or the closest preceding one.
 * Returns `undefined` if `sections` is empty.
 */
export function findSectionByOffset(
  sections: Section[],
  offset: number,
): Section | undefined {
  if (sections.length === 0) return undefined;
  if (offset < sections[0].range[0]) return sections[0];
  // Binary search for the section whose [from, to] contains the offset, or
  // whose `from` is the largest one <= offset.
  let lo = 0;
  let hi = sections.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1;
    if (sections[mid].range[0] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return sections[lo];
}

/**
 * Slice the source string for a section. Returns the verbatim markdown text
 * of that section, suitable for sending to an AI translation service.
 */
export function getSectionText(source: string, section: Section): string {
  return source.slice(section.range[0], section.range[1]);
}

/**
 * Find the counterpart section index in `other` for `sectionIndex` in `self`,
 * given the alignment between `self` and `other`. Returns `null` when the
 * source section has no counterpart on the other side.
 */
export function findCounterpart(
  alignment: AlignmentEntry[],
  side: "left" | "right",
  sectionIndex: number,
): number | null {
  for (const entry of alignment) {
    if (side === "left" && entry.leftIndex === sectionIndex) {
      return entry.rightIndex;
    }
    if (side === "right" && entry.rightIndex === sectionIndex) {
      return entry.leftIndex;
    }
  }
  return null;
}
