"use client";

import { useEffect, useRef, useState } from "react";
import { assetPath } from "../../lib/asset-path";
import { createProgram } from "../../lib/webgl/program";
import { loadShaderSources } from "../../lib/webgl/shader-wasm";
import { attachPlotInput, createScatterRenderer, createView } from "./scatter-plot";
import styles from "./Plot.module.scss";

/** График на миллион точек в собственном canvas (режим без HTML-in-Canvas). */
export function ScatterCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let cleanup = () => {};

    loadShaderSources(assetPath("/shaders/scatter.wasm"))
      .then(({ vertex, fragment }) => {
        if (disposed) return;
        const gl = canvas.getContext("webgl2", { antialias: false });
        if (!gl) throw new Error("WebGL 2 недоступен в этом браузере");

        const program = createProgram(gl, vertex, fragment);
        const plot = createScatterRenderer(gl, program);
        const view = createView();

        // Рисуем только когда что-то изменилось: размер или вид.
        let frame = 0;
        const render = () => {
          frame = 0;
          gl.viewport(0, 0, canvas.width, canvas.height);
          plot.draw({
            width: canvas.width,
            height: canvas.height,
            view,
            pixelRatio: canvas.width / Math.max(1, canvas.clientWidth),
          });
        };
        const schedule = () => {
          if (!frame) frame = requestAnimationFrame(render);
        };

        const resizeObserver = new ResizeObserver(([entry]) => {
          const dpr = Math.min(window.devicePixelRatio, 2);
          canvas.width = Math.max(1, Math.round(entry.contentRect.width * dpr));
          canvas.height = Math.max(1, Math.round(entry.contentRect.height * dpr));
          schedule();
        });
        resizeObserver.observe(canvas);
        const detach = attachPlotInput(canvas, view, schedule);

        cleanup = () => {
          cancelAnimationFrame(frame);
          resizeObserver.disconnect();
          detach();
          plot.dispose();
          gl.deleteProgram(program);
        };
      })
      .catch((reason: unknown) => {
        if (!disposed) setError(reason instanceof Error ? reason.message : String(reason));
      });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  if (error) return <p className={styles.error}>Не получилось: {error}</p>;

  return (
    <canvas
      ref={canvasRef}
      className={styles.plot}
      aria-label="Точечный график: миллион точек, колесо — зум, перетаскивание — сдвиг"
    />
  );
}
