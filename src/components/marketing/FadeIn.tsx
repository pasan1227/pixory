"use client";
// "use client" justified: the reveal needs IntersectionObserver + matchMedia
// at runtime. Children render VISIBLE on the server — without JS the page is
// fully readable; the fade-up is progressive enhancement only. After first
// paint, elements still below the viewport are hidden (off-screen, so the
// switch is imperceptible) and revealed when they scroll into view.

import { useEffect, useRef, useState } from "react";

type Phase = "ssr-visible" | "hidden" | "revealed";

export function FadeIn({
  children,
  className,
  delayMs = 0,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}>) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("ssr-visible");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // Reduced motion: never hide anything.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    // Only elements comfortably below the viewport get the treatment —
    // hiding in-view content would flash. rAF defers past the first paint
    // (and satisfies react-hooks/set-state-in-effect).
    let observer: IntersectionObserver | null = null;
    const frame = requestAnimationFrame(() => {
      if (node.getBoundingClientRect().top < window.innerHeight) return;
      setPhase("hidden");
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            setPhase("revealed");
            observer?.disconnect();
          }
        },
        { threshold: 0.15 },
      );
      observer.observe(node);
    });
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-500 ease-out ${
        phase === "hidden" ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"
      }${className === undefined ? "" : ` ${className}`}`}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}
