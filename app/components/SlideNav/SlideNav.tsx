"use client";

import { useEffect, useState } from "react";
import styles from "./SlideNav.module.scss";

// Блок «уже тут», если его верх ближе этого к верху экрана.
const EDGE = 8;
// Длинный слайд листаем «экранами» — на такую долю высоты окна.
const PAGE = 0.8;
// Если от слайда за экраном осталось меньше этой доли — там лишь поля, листаем дальше.
const REST = 0.15;

/**
 * Верх элемента в координатах документа. offsetTop не учитывает
 * CSS-трансформации, поэтому одинаково работает и в обычном DOM, и на
 * сцене HTML-in-Canvas, где страницу сдвигает трансформация.
 */
function documentTop(element: HTMLElement) {
  let top = 0;
  for (let node: HTMLElement | null = element; node; node = node.offsetParent as HTMLElement | null) {
    top += node.offsetTop;
  }
  return top;
}

function slideTops() {
  return [...document.querySelectorAll<HTMLElement>("[data-slide]")].map(documentTop);
}

function maxScroll() {
  return document.documentElement.scrollHeight - window.innerHeight;
}

/**
 * Куда листать: к верху следующего (1) или предыдущего (−1) блока.
 * Если слайд выше экрана, сначала дочитываем его — шагами по 80% экрана,
 * чтобы кнопки и примеры внизу слайда не проскакивали.
 */
function targetFor(direction: 1 | -1): number | undefined {
  const y = window.scrollY;
  const step = window.innerHeight * PAGE;
  const tops = slideTops();
  if (direction > 0) {
    if (y >= maxScroll() - EDGE) return undefined;
    const next = tops.find((top) => top > y + EDGE) ?? maxScroll();
    const unseen = next - (y + window.innerHeight);
    const longSlide = unseen > window.innerHeight * REST;
    return Math.min(longSlide ? Math.min(y + step, next) : next, maxScroll());
  }
  const previous = tops.reverse().find((top) => top < y - EDGE);
  if (previous === undefined) return undefined;
  return y - previous > window.innerHeight ? Math.max(y - step, previous) : previous;
}

function go(direction: 1 | -1) {
  const top = targetFor(direction);
  if (top === undefined) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/** Стрелки «к предыдущему / следующему блоку», как в презентации. */
export function SlideNav() {
  const [canGo, setCanGo] = useState({ up: false, down: true });

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setCanGo({ up: targetFor(-1) !== undefined, down: targetFor(1) !== undefined });
      });
    };
    // PageUp / PageDown — их же шлют пульты для презентаций.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isTyping(event.target)) return;
      if (event.key === "PageDown" || event.key === "PageUp") {
        event.preventDefault();
        go(event.key === "PageDown" ? 1 : -1);
      }
    };

    update();
    // Высота документа меняется и без прокрутки: шрифты, картинки, а на сцене
    // HTML-in-Canvas — блок-распорка, который сцена дорисовывает чуть позже.
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(document.body);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <nav className={styles.nav} aria-label="Листать блоки">
      <button
        type="button"
        className={styles.arrow}
        onClick={() => go(-1)}
        disabled={!canGo.up}
        aria-label="Предыдущий блок"
        title="Предыдущий блок (PageUp)"
      >
        ↑
      </button>
      <button
        type="button"
        className={styles.arrow}
        onClick={() => go(1)}
        disabled={!canGo.down}
        aria-label="Следующий блок"
        title="Следующий блок (PageDown)"
      >
        ↓
      </button>
    </nav>
  );
}
