import { useEffect, useRef, useState, type RefObject } from "react";

type OverflowDetection = {
  /** Attach to the element that defines the available width. */
  containerRef: RefObject<HTMLDivElement | null>;
  /** Attach to the element holding the items at their natural width. */
  contentRef: RefObject<HTMLDivElement | null>;
  isOverflowing: boolean;
};

/**
 * Detects whether a horizontally laid-out strip of items overflows the width
 * available in its container.
 *
 * The `contentRef` element is expected to keep being rendered (even when
 * hidden) while overflowing, so its natural width can keep being measured and
 * the detection stays reactive to container resizes.
 *
 * Pass `dependency` (e.g. the list being rendered) so the measurement re-runs
 * when the content changes.
 */
export function useOverflowDetection(dependency: unknown): OverflowDetection {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) {
      return;
    }

    const check = () => {
      setIsOverflowing(content.scrollWidth > container.clientWidth + 1);
    };

    check();
    const observer = new ResizeObserver(check);
    observer.observe(container);
    observer.observe(content);

    return () => observer.disconnect();
  }, [dependency]);

  return { containerRef, contentRef, isOverflowing };
}
