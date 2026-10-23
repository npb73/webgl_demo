"use client";

import { createContext, useContext, useLayoutEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { getDeck, getServerDeck, subscribeDeck } from "../../lib/deck";
import { Doodle } from "./Doodle";
import styles from "./Slide.module.scss";

// Мельче — текст уже не прочитать с экрана: такой слайд прокручивается.
const MIN_ZOOM = 0.6;

type SlideProps = {
  id: string;
  as?: "section" | "header" | "nav";
  className?: string;
  "aria-labelledby"?: string;
  children: ReactNode;
};

const slideOf = (deck: ReturnType<typeof getDeck>) => deck.slide;

const SlideOpenContext = createContext(true);

/** Открыт ли слайд, на котором лежит компонент: на закрытом демо не тратит кадры. */
export const useSlideOpen = () => useContext(SlideOpenContext);

/**
 * Слайд — ровно экран. Видно только открытый слайд; если содержимое
 * не влезает (окно ниже, чем рассчитана вёрстка), оно уменьшается
 * через CSS zoom — браузер заново раскладывает текст, и он остаётся чётким.
 */
export function Slide({ id, as: Tag = "section", className, children, ...rest }: SlideProps) {
  const current = useSyncExternalStore(
    subscribeDeck,
    () => slideOf(getDeck()),
    () => slideOf(getServerDeck()),
  );
  const slideRef = useRef<HTMLElement>(null);
  const fitRef = useRef<HTMLDivElement>(null);
  const open = current === id;

  useLayoutEffect(() => {
    const slide = slideRef.current;
    const fit = fitRef.current;
    if (!open || !slide || !fit) return;

    const desktop = window.matchMedia("(min-width: 641px)");
    const update = () => {
      fit.style.zoom = "";
      slide.classList.remove(styles.scroll);
      if (!desktop.matches) return;
      const style = getComputedStyle(slide);
      const available = slide.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      const fits = (zoom: number) => {
        fit.style.zoom = String(zoom);
        return fit.getBoundingClientRect().height <= available + 0.5;
      };
      if (fits(1)) {
        fit.style.zoom = "";
        return;
      }
      // Высота от масштаба зависит не плавно: в уменьшенном слайде строки
      // шире, и сетка может перестроиться. Поэтому — бинарный поиск
      // самого крупного масштаба, при котором всё влезает.
      let low = MIN_ZOOM;
      let high = 1;
      for (let i = 0; i < 7; i++) {
        const middle = (low + high) / 2;
        if (fits(middle)) low = middle;
        else high = middle;
      }
      if (!fits(low)) slide.classList.add(styles.scroll);
    };

    update();
    // Высота меняется и без смены окна: шрифты, картинки, открытая подсказка.
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(slide);
    resizeObserver.observe(fit);
    desktop.addEventListener("change", update);
    return () => {
      resizeObserver.disconnect();
      desktop.removeEventListener("change", update);
    };
  }, [open]);

  return (
    <Tag
      ref={slideRef}
      id={id}
      data-slide=""
      hidden={!open}
      className={className ? `${styles.slide} ${className}` : styles.slide}
      {...rest}
    >
      <Doodle slide={id} open={open} />
      <div ref={fitRef} className={styles.fit}>
        <SlideOpenContext.Provider value={open}>{children}</SlideOpenContext.Provider>
      </div>
    </Tag>
  );
}
