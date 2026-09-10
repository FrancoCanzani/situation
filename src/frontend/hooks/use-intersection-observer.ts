import { useEffect, useRef, type RefObject } from "react";

type Options = Omit<IntersectionObserverInit, "root"> & {
  enabled?: boolean;
  rootRef?: RefObject<Element | null>;
};

export function useIntersectionObserver<T extends Element = HTMLDivElement>(
  onIntersect: () => void,
  { enabled = true, rootRef, rootMargin, threshold }: Options = {},
) {
  const ref = useRef<T | null>(null);
  const onIntersectRef = useRef(onIntersect);
  onIntersectRef.current = onIntersect;

  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) onIntersectRef.current();
      },
      { root: rootRef?.current ?? null, rootMargin, threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, rootRef, rootMargin, threshold]);

  return ref;
}
