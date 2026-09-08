import { useEffect, useRef } from "react";

type Options = IntersectionObserverInit & {
  enabled?: boolean;
};

export function useIntersectionObserver<T extends Element = HTMLDivElement>(
  onIntersect: () => void,
  { enabled = true, root, rootMargin, threshold }: Options = {},
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
      { root, rootMargin, threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, root, rootMargin, threshold]);

  return ref;
}
