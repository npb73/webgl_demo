// Самый первый шейдер на чистом WebGL 2 — без библиотек.
// GLSL-исходники лежат в first-shader.wasm: модуль экспортирует memory
// и пары функций *_ptr / *_len, по которым мы читаем строки.

const WASM_URL = "/shaders/first-shader.wasm";

/** @type {Promise<{ vertex: string, fragment: string }> | null} */
let sourcesPromise = null;

function loadSources() {
  sourcesPromise ??= fetch(WASM_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`Не удалось загрузить ${WASM_URL}`);
      return response.arrayBuffer();
    })
    .then((bytes) => WebAssembly.instantiate(bytes))
    .then(({ instance }) => {
      const { memory, vertex_ptr, vertex_len, fragment_ptr, fragment_len } =
        instance.exports;
      const decoder = new TextDecoder();
      const read = (ptr, len) =>
        decoder.decode(new Uint8Array(memory.buffer, ptr, len));

      return {
        vertex: read(vertex_ptr(), vertex_len()),
        fragment: read(fragment_ptr(), fragment_len()),
      };
    })
    .catch((error) => {
      sourcesPromise = null;
      throw error;
    });

  return sourcesPromise;
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(log ?? "Ошибка компиляции шейдера");
  }
  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vertexShader = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(log ?? "Ошибка линковки программы");
  }
  return program;
}

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
  const { vertex, fragment } = await loadSources();
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
