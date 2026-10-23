"use client";

import { useEffect, useRef, useState } from "react";
import { DemoButton } from "../DemoButton/DemoButton";
import { useSlideOpen } from "../Slide/Slide";
import { createFirstShader } from "./first-shader";
import { createGradient2d } from "./gradient-2d";
import styles from "./CanvasVsWebgl.module.scss";

type Lane = "canvas" | "webgl";
type Renderer = { draw: (time: number) => number };
type Reading = { ms: number; fps: number };

// Размер кадра в пикселях: CSS-размер canvas тот же, меняется только
// число пикселей, которые надо посчитать.
const SIZES = [
  [480, 270],
  [960, 540],
  [1920, 1080],
] as const;

// Бюджет кадра при 60 Гц: дольше — экран не успевает обновиться.
const BUDGET_MS = 1000 / 60;
// Полоса — четыре бюджета; черта на ней — один.
const SCALE_MS = BUDGET_MS * 4;
// Как часто обновлять цифры: каждый кадр их не прочитать.
const READING_MS = 500;

const LANES: { lane: Lane; title: string; how: string }[] = [
  { lane: "canvas", title: "Canvas 2D", how: "цикл в JS, пиксели по очереди на CPU" },
  { lane: "webgl", title: "WebGL", how: "шейдер, все пиксели сразу на GPU" },
];

const number = (value: number, digits: number) =>
  value.toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits });

function verdict(ms: number) {
  if (ms > BUDGET_MS) return `в ${number(ms / BUDGET_MS, 1)} раза больше бюджета кадра — анимация дёргается`;
  return `${Math.max(1, Math.round((ms / BUDGET_MS) * 100))} % бюджета кадра`;
}

/**
 * Один и тот же градиент двумя способами. Работает одна дорожка за раз:
 * у обеих общий главный поток, и медленный Canvas 2D тормозил бы соседа.
 */
export function CanvasVsWebgl() {
  const open = useSlideOpen();
  const canvas2dRef = useRef<HTMLCanvasElement>(null);
  const webglRef = useRef<HTMLCanvasElement>(null);
  const renderers = useRef<Partial<Record<Lane, Renderer>>>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sizeIndex, setSizeIndex] = useState(SIZES.length - 1);
  const [running, setRunning] = useState<Lane | null>(null);
  const [readings, setReadings] = useState<Record<Lane, Reading | null>>({ canvas: null, webgl: null });
  const [width, height] = SIZES[sizeIndex];

  useEffect(() => {
    const canvas2d = canvas2dRef.current;
    const webgl = webglRef.current;
    if (!canvas2d || !webgl) return;
    const controller = new AbortController();
    let shader: Awaited<ReturnType<typeof createFirstShader>> = null;

    renderers.current.canvas = createGradient2d(canvas2d);
    createFirstShader(webgl, controller.signal)
      .then((created) => {
        if (!created) return;
        shader = created;
        renderers.current.webgl = created;
        setReady(true);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : String(reason));
      });

    return () => {
      controller.abort();
      shader?.destroy();
      renderers.current = {};
    };
  }, []);

  // Новый размер — новый буфер; неподвижный первый кадр в обеих дорожках.
  useEffect(() => {
    for (const canvas of [canvas2dRef.current, webglRef.current]) {
      if (!canvas) continue;
      canvas.width = width;
      canvas.height = height;
    }
    if (!open) return;
    renderers.current.canvas?.draw(0);
    renderers.current.webgl?.draw(0);
  }, [width, height, open, ready]);

  useEffect(() => {
    const renderer = running && renderers.current[running];
    if (!open || !running || !renderer) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let frames = 0;
    let total = 0;
    let since = performance.now();

    const loop = (now: number) => {
      // При «уменьшении движения» время стоит: кадр тот же, но считается заново.
      total += renderer.draw(reducedMotion ? 0 : now / 1000);
      frames++;
      if (now - since >= READING_MS) {
        const reading = { ms: total / frames, fps: (frames * 1000) / (now - since) };
        setReadings((current) => ({ ...current, [running]: reading }));
        frames = 0;
        total = 0;
        since = now;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [running, open, width, height, ready]);

  const pixels = width * height;

  return (
    <figure className={styles.race}>
      <div className={styles.lanes}>
        {LANES.map(({ lane, title, how }) => {
          const reading = readings[lane];
          const active = running === lane;
          return (
            <section key={lane} className={styles.lane} aria-label={title}>
              <p className={styles.title}>
                {title}
                <span className={styles.how}>{how}</span>
              </p>
              <canvas
                ref={lane === "canvas" ? canvas2dRef : webglRef}
                className={styles.canvas}
                aria-label={`Градиент, который рисует ${title}`}
              />
              <p className={styles.time} aria-live="off">
                {reading ? (
                  <>
                    <span className={styles.value}>{number(reading.ms, reading.ms < 1 ? 2 : 1)}</span> мс на
                    кадр · {number(reading.fps, 0)} кадров/с
                  </>
                ) : (
                  "нажмите ▶, чтобы замерить"
                )}
              </p>
              <div className={styles.budget} aria-hidden="true">
                <div
                  className={`${styles.bar} ${reading && reading.ms > BUDGET_MS ? styles.over : ""}`}
                  style={{ width: `${reading ? Math.min(100, (reading.ms / SCALE_MS) * 100) : 0}%` }}
                />
                <span className={styles.limit} style={{ left: `${(BUDGET_MS / SCALE_MS) * 100}%` }} />
              </div>
              <p className={styles.verdict}>{reading ? verdict(reading.ms) : "черта — бюджет кадра, 16,7 мс"}</p>
              <DemoButton
                aria-pressed={active}
                disabled={!!error || (lane === "webgl" && !ready)}
                onClick={() => setRunning(active ? null : lane)}
              >
                {active ? "Стоп" : `Запустить ${title}`}
              </DemoButton>
            </section>
          );
        })}
      </div>

      <div className={styles.sizes} role="group" aria-label="Размер кадра">
        <span className={styles.sizesLabel}>Кадр:</span>
        {SIZES.map(([w, h], index) => (
          <button
            key={w}
            type="button"
            className={styles.size}
            aria-pressed={index === sizeIndex}
            onClick={() => {
              setSizeIndex(index);
              // Замеры относятся к старому размеру — сбрасываем.
              setReadings({ canvas: null, webgl: null });
            }}
          >
            {w}×{h}
          </button>
        ))}
        <span className={styles.pixels}>
          = {pixels.toLocaleString("ru-RU")} пикселей: столько раз за кадр считается формула цвета
        </span>
      </div>
      {error && <p className={styles.error}>Не получилось: {error}</p>}
    </figure>
  );
}
