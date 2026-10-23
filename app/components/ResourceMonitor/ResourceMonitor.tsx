"use client";

import { useEffect, useState } from "react";
import { useStage } from "../Stage/Stage";
import styles from "./ResourceMonitor.module.scss";

type Reading = {
  fps: number;
  /** Сколько миллисекунд наш обработчик paint тратит на кадр. */
  frameMs: number;
  /** Доля главного потока, занятая нашим кодом, %. */
  share: number;
  snapshots: number;
  snapshotMs: number;
  gpuMb: number;
};

const format = (value: number, digits = 1) =>
  value.toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/**
 * Живые счётчики сцены: раз в секунду берём разницу двух замеров.
 * Сам монитор меняет текст страницы, поэтому добавляет ~1 снимок в секунду.
 */
export function ResourceMonitor() {
  const stage = useStage();
  const renderer = stage.mode === "canvas" ? stage.renderer : null;
  const [reading, setReading] = useState<Reading | null>(null);

  useEffect(() => {
    if (!renderer) return;
    let previous = { ...renderer.getStats(), at: performance.now() };
    const timer = window.setInterval(() => {
      const current = { ...renderer.getStats(), at: performance.now() };
      const seconds = (current.at - previous.at) / 1000;
      const frames = current.frames - previous.frames;
      const cpuMs = current.cpuMs - previous.cpuMs;
      setReading({
        fps: frames / seconds,
        frameMs: frames ? cpuMs / frames : 0,
        share: (cpuMs / (seconds * 1000)) * 100,
        snapshots: (current.snapshots - previous.snapshots) / seconds,
        snapshotMs: (current.snapshotMs - previous.snapshotMs) / seconds,
        gpuMb: current.gpuBytes / 1024 / 1024,
      });
      previous = current;
    }, 1000);
    return () => window.clearInterval(timer);
  }, [renderer]);

  if (stage.mode === "dom") {
    return (
      <p className={styles.off}>
        Без флага сцены нет: страницу рисует сам браузер, и наш код ничего не тратит — счётчикам
        нечего показать.
      </p>
    );
  }

  const rows: [string, string, string][] = reading
    ? [
        ["Кадров нарисовано", format(reading.fps, 0), "в секунду"],
        ["Наш код на кадр", format(reading.frameMs, 2), "мс"],
        ["Доля главного потока", format(reading.share), "%"],
        ["Снимков страницы и слоёв", format(reading.snapshots, 0), "в секунду"],
        ["На снимки", format(reading.snapshotMs, 1), "мс в секунду"],
        ["Видеопамять сцены", format(reading.gpuMb, 0), "МБ"],
      ]
    : [];

  return (
    <figure className={styles.monitor} aria-live="off">
      <figcaption className={styles.title}>Сцена прямо сейчас</figcaption>
      {reading ? (
        <dl className={styles.rows}>
          {rows.map(([name, value, unit]) => (
            <div key={name} className={styles.row}>
              <dt>{name}</dt>
              <dd>
                <span className={styles.value}>{value}</span> {unit}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className={styles.wait}>Считаю…</p>
      )}
      <p className={styles.hint}>
        в покое — 1 кадр и 1 снимок в секунду: это обновляется сам монитор. Перелистните слайд или
        поводите окном — цифры вырастут
      </p>
    </figure>
  );
}
