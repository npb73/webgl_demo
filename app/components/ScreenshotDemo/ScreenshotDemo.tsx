"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FLAG_URL } from "../../lib/webgl/html-in-canvas";
import { DemoButton } from "../DemoButton/DemoButton";
import { useStage } from "../Stage/Stage";
import styles from "./ScreenshotDemo.module.scss";

type Shot = {
  id: number;
  url: string;
  /** Пропорции экрана в момент снимка — по ним миниатюра. */
  aspect: number;
  takenAt: Date;
};

// Сколько миниатюра ждёт в углу, если её не трогать, — как в macOS.
const THUMBNAIL_MS = 6000;
// Скачивание по blob:-ссылке идёт асинхронно: отзываем её не сразу.
const REVOKE_DELAY_MS = 60_000;

const releaseLater = (url: string) => window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** «Снимок экрана 2026-10-20 в 11.52.03.png» — как называет файлы macOS. */
function fileName(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}.${pad(date.getMinutes())}.${pad(date.getSeconds())}`;
  return `Снимок экрана ${day} в ${time}.png`;
}

/**
 * Кнопка «Сделать скриншот»: сцена отдаёт текущий кадр WebGL, а миниатюра
 * улетает в правый нижний угол. Без HTML-in-Canvas снимать нечего — браузер
 * не отдаёт пиксели обычного DOM.
 */
export function ScreenshotDemo() {
  const stage = useStage();
  const renderer = stage.mode === "canvas" ? stage.renderer : null;
  const [shot, setShot] = useState<Shot | null>(null);
  const [busy, setBusy] = useState(false);

  const take = async () => {
    if (!renderer || busy) return;
    setBusy(true);
    const blob = await renderer.capture();
    setBusy(false);
    if (!blob) return;
    // Прошлый снимок больше не покажется — его ссылку можно освободить.
    if (shot) releaseLater(shot.url);
    setShot({
      id: Date.now(),
      url: URL.createObjectURL(blob),
      aspect: window.innerWidth / window.innerHeight,
      takenAt: new Date(),
    });
  };

  return (
    <>
      <DemoButton onClick={take} disabled={stage.mode === "dom"}>
        Сделать скриншот
      </DemoButton>
      {stage.mode === "dom" && (
        <p className={styles.needsFlag}>
          Без флага кнопка не работает: страница — обычный DOM, а его пиксели браузер скрипту
          не отдаёт. Включите <code>{FLAG_URL}</code>.
        </p>
      )}
      <p className={styles.srOnly} aria-live="polite">
        {shot ? "Скриншот готов: миниатюра в правом нижнем углу, нажмите её, чтобы скачать." : ""}
      </p>
      {shot && (
        <Thumbnail
          key={shot.id}
          shot={shot}
          onDone={() => {
            releaseLater(shot.url);
            setShot(null);
          }}
        />
      )}
    </>
  );
}

/** Вспышка и миниатюра поверх всего: вне canvas, как стрелки листания. */
function Thumbnail({ shot, onDone }: { shot: Shot; onDone: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);

  // Снимок сначала на весь экран, потом уменьшается в угол.
  // useLayoutEffect: анимация стартует до первой отрисовки миниатюры в углу.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || reducedMotion()) return;
    const rect = element.getBoundingClientRect();
    const full = `translate(${-rect.left}px, ${-rect.top}px) scale(${window.innerWidth / rect.width})`;
    element.animate(
      [
        { transform: full, borderRadius: "0px", offset: 0 },
        { transform: full, borderRadius: "0px", offset: 0.2 },
        { transform: "none" },
      ],
      { duration: 650, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
  }, []);

  // Ссылку на снимок освобождает ScreenshotDemo, а не очистка эффекта здесь:
  // в dev React (StrictMode) сразу размонтирует и снова монтирует компонент,
  // и такая очистка отозвала бы ссылку до клика — файл бы не скачался.

  // Пока на миниатюру навели или она в фокусе — не прячем.
  useEffect(() => {
    if (paused || leaving) return;
    const timer = window.setTimeout(() => setLeaving(true), THUMBNAIL_MS);
    return () => window.clearTimeout(timer);
  }, [paused, leaving]);

  // Без анимации ухода ждать animationend некого.
  useEffect(() => {
    if (leaving && reducedMotion()) onDone();
  }, [leaving, onDone]);

  const download = () => {
    const link = document.createElement("a");
    link.href = shot.url;
    link.download = fileName(shot.takenAt);
    link.click();
    setLeaving(true);
  };

  return createPortal(
    <>
      <div className={styles.flash} aria-hidden="true" />
      <button
        ref={ref}
        type="button"
        className={`${styles.thumbnail} ${leaving ? styles.leaving : ""}`}
        style={{ aspectRatio: String(shot.aspect) }}
        aria-label="Скачать скриншот"
        title="Скачать скриншот"
        onClick={download}
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setLeaving(true);
        }}
        onAnimationEnd={(event) => {
          if (event.animationName.includes("leave")) onDone();
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL, оптимизировать нечего */}
        <img src={shot.url} alt="" className={styles.image} />
        <span className={styles.label}>Скачать</span>
      </button>
    </>,
    document.body,
  );
}
