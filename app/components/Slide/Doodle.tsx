"use client";

import { useEffect, useRef, useSyncExternalStore, type CSSProperties } from "react";
import { assetPath } from "../../lib/asset-path";
import styles from "./Slide.module.scss";

// Пасхалка: на нескольких случайных слайдах на полях тетради — слева от
// красной линии — нарисован автопортрет в кепке с пропеллером. Какие слайды —
// решается при загрузке страницы, место — каждый раз, когда слайд открывают.
const CHANCE = 0.15;
// Где рисунок есть всегда: на слайде с линзами его можно рассмотреть под стеклом.
const ALWAYS = new Set(["lens"]);
const IMAGE = `url(${assetPath("/images/coffee-drill.png")})`;
// Высота к ширине у картинки 453 / 360.
const ASPECT = 453 / 360;
// Сколько случайных мест пробуем, прежде чем сдаться на этом слайде.
const ATTEMPTS = 60;
// Поля листа: от края слайда до красной линии ($margin-width в _tokens.scss).
const MARGIN = 144;
// Под этими элементами — не бумага, даже если текста в них нет.
const SOLID = new Set(["CANVAS", "IMG", "SVG", "BUTTON", "CODE", "PRE", "TABLE", "TR", "TD", "TH", "INPUT"]);

type Look = { width: number; rotate: number };

const between = (min: number, max: number) => min + Math.random() * (max - min);

const looks = new Map<string, Look | null>();

/** Решаем один раз на слайд: snapshot для useSyncExternalStore должен быть стабильным. */
function lookFor(slide: string) {
  if (!looks.has(slide)) {
    looks.set(
      slide,
      ALWAYS.has(slide) || Math.random() < CHANCE
        ? { width: Math.round(between(80, 110)), rotate: Math.round(between(-12, 12)) }
        : null,
    );
  }
  return looks.get(slide) ?? null;
}

/** Под точкой пустая бумага: сам слайд и его предки или прозрачная обёртка без текста. */
function isPaper(element: Element, slide: HTMLElement) {
  if (element.contains(slide)) return true;
  // Окна, стрелки листания — не наш слайд.
  if (!slide.contains(element) || SOLID.has(element.tagName)) return false;
  const hasText = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
  if (hasText) return false;
  const style = getComputedStyle(element);
  return (
    style.backgroundColor === "rgba(0, 0, 0, 0)" &&
    style.backgroundImage === "none" &&
    style.boxShadow === "none" &&
    parseFloat(style.borderTopWidth) + parseFloat(style.borderLeftWidth) === 0
  );
}

/** Случайное место на полях, где рисунок ничего не закроет (номер записи); координаты — от угла слайда. */
function findSpot(slide: HTMLElement, width: number) {
  const box = slide.getBoundingClientRect();
  const height = width * ASPECT;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const x = between(6, MARGIN - width - 10);
    const y = between(8, box.height - height - 8);
    let free = true;
    // Сетка 4×4 точек внутри рисунка, с отступом на наклон.
    for (let i = 0; i < 16 && free; i++) {
      const px = box.left + x + width * (0.1 + (0.8 * (i % 4)) / 3);
      const py = box.top + y + height * (0.1 + (0.8 * Math.floor(i / 4)) / 3);
      const hit = document.elementFromPoint(px, py);
      free = !!hit && isPaper(hit, slide);
    }
    if (free) return { x, y };
  }
  return null;
}

const subscribe = () => () => {};

/** Рисунок-пасхалка на слайде slide — или ничего. На сервере всегда ничего. */
export function Doodle({ slide, open }: { slide: string; open: boolean }) {
  const look = useSyncExternalStore(
    subscribe,
    () => lookFor(slide),
    () => null,
  );
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const doodle = ref.current;
    const parent = doodle?.parentElement;
    if (!open || !look || !doodle || !parent) return;
    if (!window.matchMedia("(min-width: 641px)").matches) return;
    // useEffect идёт после useLayoutEffect слайда: zoom под экран уже применён.
    doodle.style.visibility = "";
    const spot = findSpot(parent, look.width);
    if (!spot) return;
    doodle.style.left = `${spot.x}px`;
    doodle.style.top = `${spot.y}px`;
    doodle.style.visibility = "visible";
  }, [open, look]);

  if (!look) return null;

  const style = {
    width: `${look.width}px`,
    maskImage: IMAGE,
    WebkitMaskImage: IMAGE,
    "--rotate": `${look.rotate}deg`,
  } as CSSProperties;

  return <span ref={ref} className={styles.doodle} style={style} aria-hidden="true" />;
}
