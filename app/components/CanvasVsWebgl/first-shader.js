// Самый первый шейдер на чистом WebGL 2 — без библиотек.
// GLSL-исходники лежат в first-shader.wasm (см. lib/webgl/shader-wasm.js).
// Пара к gradient-2d.js: та же картинка, но цвет каждого пикселя считает GPU.

import { assetPath } from "../../lib/asset-path";
import { createProgram } from "../../lib/webgl/program";
import { loadShaderSources } from "../../lib/webgl/shader-wasm";

const WASM_URL = assetPath("/shaders/first-shader.wasm");

/**
 * Готовит шейдер на canvas. Размер кадра — canvas.width × canvas.height.
 * Если signal отменён, пока грузился wasm, контекст даже не создаётся.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {AbortSignal} [signal]
 */
export async function createFirstShader(canvas, signal) {
  const { vertex, fragment } = await loadShaderSources(WASM_URL);
  if (signal?.aborted) return null;

  const gl = canvas.getContext("webgl2");
  if (!gl) throw new Error("WebGL 2 недоступен в этом браузере");

  const program = createProgram(gl, vertex, fragment);
  const uResolution = gl.getUniformLocation(program, "u_resolution");
  const uTime = gl.getUniformLocation(program, "u_time");
  // Атрибутов нет, но WebGL 2 всё равно ждёт привязанный VAO.
  const vao = gl.createVertexArray();
  const pixel = new Uint8Array(4);

  return {
    /** Кадр в момент time (секунды). Возвращает, сколько миллисекунд он занял. */
    draw(time) {
      const start = performance.now();
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, time);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // drawArrays только ставит работу в очередь видеокарты. Чтение одного
      // пикселя ждёт, пока кадр дорисуется: иначе мы измерили бы постановку
      // в очередь, а не отрисовку. Ожидание добавляет к замеру, а не убавляет.
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      return performance.now() - start;
    },
    destroy() {
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      // loseContext() не вызываем: canvas может быть переиспользован
      // (StrictMode монтирует эффекты дважды), а потерянный контекст
      // у того же элемента уже не вернуть.
    },
  };
}
