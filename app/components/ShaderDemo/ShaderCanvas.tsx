"use client";

import { useEffect, useRef, useState } from "react";
import { startFirstShader } from "./first-shader";
import styles from "./ShaderDemo.module.scss";

export function ShaderCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const controller = new AbortController();
    let stop: (() => void) | undefined;

    startFirstShader(canvas, controller.signal)
      .then((stopShader) => {
        if (controller.signal.aborted) stopShader();
        else stop = stopShader;
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : String(reason));
        }
      });

    return () => {
      controller.abort();
      stop?.();
    };
  }, []);

  if (error) {
    return <p className={styles.error}>Не получилось: {error}</p>;
  }

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      aria-label="Градиент, плавно меняющий цвета: результат работы первого шейдера"
    />
  );
}
