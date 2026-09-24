"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Anima la aparición de los elementos con [data-reveal] al scrollear.
 * - data-reveal-delay="150" → retraso en ms
 * - data-reveal-stagger     → retraso según la posición entre sus hermanos
 * Sin JavaScript o con "reducir movimiento", todo se ve normal.
 */
export default function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    document.documentElement.classList.add("reveal-activo");

    const elementos = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not(.visible)"));
    elementos.forEach((el) => {
      let delay = parseInt(el.dataset.revealDelay ?? "0", 10);
      if (el.hasAttribute("data-reveal-stagger") && el.parentElement) {
        delay = Array.from(el.parentElement.children).indexOf(el) * 120;
      }
      el.style.setProperty("--reveal-delay", `${delay}ms`);
    });

    const io = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    elementos.forEach((el) => io.observe(el));

    return () => io.disconnect();
  }, [pathname]);

  return null;
}
