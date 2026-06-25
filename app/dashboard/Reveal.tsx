"use client";

import { useEffect, useState } from "react";

/**
 * Entrada escalonada: fade + slide-up sutil al montar, con delay incremental.
 * Respeta prefers-reduced-motion (aparece sin animación).
 */
export default function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(true);
      return;
    }
    const r = requestAnimationFrame(() => setShown(true));
    // Red de seguridad: si rAF se estrangula (pestaña en segundo plano, etc.),
    // revela igual para no dejar el contenido invisible.
    const t = window.setTimeout(() => setShown(true), 800);
    return () => {
      cancelAnimationFrame(r);
      window.clearTimeout(t);
    };
  }, []);

  return (
    <div
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-[400ms] ease-out ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      } ${className}`}
    >
      {children}
    </div>
  );
}
