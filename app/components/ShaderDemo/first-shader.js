// Самый первый шейдер на чистом WebGL 2 — без библиотек.
// GLSL-исходники лежат в first-shader.wasm (см. lib/webgl/shader-wasm.js).

import { createProgram } from "../../lib/webgl/program";
import { loadShaderSources } from "../../lib/webgl/shader-wasm";

const WASM_URL = "/shaders/first-shader.wasm";

/**
 * Запускает шейдер на canvas. Возвращает функцию остановки,
 * которая отменяет цикл отрисовки и удаляет GPU-ресурсы.
 * Если signal отменён, пока грузился wasm, контекст даже не создаётся.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {AbortSignal} [signal]
 * @returns {Promise<() => void>}
 */
export async function startFirstShader(canvas, signal) {
  const { vertex, fragment } = await loadShaderSources(WASM_URL);
  if (signal?.aborted) return () => {};

  const gl = canvas.getContext("webgl2");
  if (!gl) throw new Error("WebGL 2 недоступен в этом браузере");

  const program = createProgram(gl, vertex, fragment);
  const uResolution = gl.getUniformLocation(program, "u_resolution");
  const uTime = gl.getUniformLocation(program, "u_time");

  // Атрибутов нет, но WebGL 2 всё равно ждёт привязанный VAO.
  const vao = gl.createVertexArray();
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const draw = (time) => {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform1f(uTime, time / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const resizeObserver = new ResizeObserver(([entry]) => {
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = Math.max(1, Math.round(entry.contentRect.width * dpr));
    canvas.height = Math.max(1, Math.round(entry.contentRect.height * dpr));
    if (reducedMotion) draw(0);
  });
  resizeObserver.observe(canvas);

  let frameId = 0;
  const loop = (time) => {
    draw(time);
    frameId = requestAnimationFrame(loop);
  };
  if (!reducedMotion) frameId = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(frameId);
    resizeObserver.disconnect();
    gl.deleteVertexArray(vao);
    gl.deleteProgram(program);
    // loseContext() не вызываем: canvas может быть переиспользован
    // (StrictMode монтирует эффекты дважды), а потерянный контекст
    // у того же элемента уже не вернуть.
  };
}
