/**
 * Shared state for synchronizing the two markdown editors. Each side reports
 * its current section (the one containing the cursor); subscribers on the
 * other side react by scrolling and highlighting the counterpart section.
 *
 * Sections are recomputed on every doc change via `parseSections` and the
 * left/right alignment is computed via `alignSections`. The context is
 * intentionally small — one focused side, one focused section index per side.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  alignSections,
  findCounterpart,
  type AlignmentEntry,
  type Section,
} from "~/lib/markdown-sections";

export type EditorSide = "left" | "right";

type SyncState = {
  leftSections: Section[];
  rightSections: Section[];
  alignment: AlignmentEntry[];
  /** The side whose cursor most recently moved. */
  activeSide: EditorSide | null;
  /** Active section index *on the active side*. */
  activeSectionIndex: number | null;
};

type SyncListener = (event: {
  side: EditorSide;
  sectionIndex: number;
  counterpartIndex: number | null;
}) => void;

type SyncContextValue = {
  state: SyncState;
  setSections: (side: EditorSide, sections: Section[]) => void;
  reportCursor: (side: EditorSide, sectionIndex: number | null) => void;
  subscribe: (listener: SyncListener) => () => void;
};

const SectionSyncContext = createContext<SyncContextValue | null>(null);

export function SectionSyncProvider({ children }: { children: ReactNode }) {
  const [leftSections, setLeftSections] = useState<Section[]>([]);
  const [rightSections, setRightSections] = useState<Section[]>([]);
  const [activeSide, setActiveSide] = useState<EditorSide | null>(null);
  const [activeSectionIndex, setActiveSectionIndex] = useState<number | null>(
    null,
  );
  const listenersRef = useRef<Set<SyncListener>>(new Set());

  const alignment = useMemo(
    () => alignSections(leftSections, rightSections),
    [leftSections, rightSections],
  );

  const setSections = useCallback(
    (side: EditorSide, sections: Section[]) => {
      if (side === "left") setLeftSections(sections);
      else setRightSections(sections);
    },
    [],
  );

  const reportCursor = useCallback(
    (side: EditorSide, sectionIndex: number | null) => {
      setActiveSide(side);
      setActiveSectionIndex(sectionIndex);
      if (sectionIndex === null) return;
      const counterpartIndex = findCounterpart(alignment, side, sectionIndex);
      for (const listener of listenersRef.current) {
        listener({ side, sectionIndex, counterpartIndex });
      }
    },
    [alignment],
  );

  const subscribe = useCallback((listener: SyncListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const value = useMemo<SyncContextValue>(
    () => ({
      state: {
        leftSections,
        rightSections,
        alignment,
        activeSide,
        activeSectionIndex,
      },
      setSections,
      reportCursor,
      subscribe,
    }),
    [
      leftSections,
      rightSections,
      alignment,
      activeSide,
      activeSectionIndex,
      setSections,
      reportCursor,
      subscribe,
    ],
  );

  return (
    <SectionSyncContext.Provider value={value}>
      {children}
    </SectionSyncContext.Provider>
  );
}

export function useSectionSync(): SyncContextValue {
  const ctx = useContext(SectionSyncContext);
  if (!ctx) {
    throw new Error(
      "useSectionSync must be used within a SectionSyncProvider",
    );
  }
  return ctx;
}
