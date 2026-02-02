"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Simple route-change progress bar for App Router.
 * Not tied to actual network timing; it improves perceived performance.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const t = useRef<number | null>(null);
  const t2 = useRef<number | null>(null);

  useEffect(() => {
    // Route changed -> show bar and animate.
    if (t.current) window.clearTimeout(t.current);
    if (t2.current) window.clearTimeout(t2.current);

    setVisible(true);
    setProgress(15);

    // Ease towards ~80% quickly.
    t.current = window.setTimeout(() => setProgress(80), 180);

    // Then finish shortly after.
    t2.current = window.setTimeout(() => {
      setProgress(100);
      window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
    }, 520);

    return () => {
      if (t.current) window.clearTimeout(t.current);
      if (t2.current) window.clearTimeout(t2.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams?.toString()]);

  return (
    <div
      aria-hidden
      className={[
        "pointer-events-none fixed left-0 top-0 z-[100] h-1 w-full",
        visible ? "opacity-100" : "opacity-0",
        "transition-opacity",
      ].join(" ")}
    >
      <div
        className="h-full w-full origin-left bg-foreground/90"
        style={{ transform: `scaleX(${progress / 100})`, transition: "transform 220ms ease" }}
      />
    </div>
  );
}
