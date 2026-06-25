"use client";

import { useEffect, useRef, useState, createElement } from "react";

/**
 * Entrada al hacer scroll: fade + slide-up sutil (una vez) vía
 * IntersectionObserver. Robusto por diseño:
 *  - Si no hay IO, hay prefers-reduced-motion, o el observer no dispara,
 *    el contenido SIEMPRE termina visible (fallback inmediato + timeout).
 *  - El desplazamiento es mínimo (8px) y nunca deja contenido oculto,
 *    así no puede solaparse con el vecino si algo falla.
 */
export default function RevealOnScroll({
  children,
  delay = 0,
  className = "",
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduce || typeof IntersectionObserver === "undefined" || !el) {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);

    // Red de seguridad: si el observer nunca dispara (timing de hidratación,
    // viewports raros), revela igual para no dejar contenido invisible.
    const t = window.setTimeout(() => setShown(true), 1200);

    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, []);

  return createElement(
    as,
    {
      ref,
      style: { transitionDelay: `${delay}ms` },
      className: `transition-all duration-500 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      } ${className}`,
    },
    children
  );
}
