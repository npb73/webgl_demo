export type Step = {
  title: string;
  code: string;
  /** Что делает шаг и что нужно рядом; `обратные кавычки` → <code>. */
  text: string;
};

// Минимальная программа — по одной ключевой строке на шаг.
export const steps: Step[] = [
  {
    title: "Контекст",
    code: 'const gl = canvas.getContext("webgl2")',
    text: "Весь WebGL — методы объекта `gl`, привязанного к одному canvas. Если WebGL 2 нет, вернётся `null`, а не исключение — проверяйте сразу.",
  },
  {
    title: "Программа",
    code: "const program = createProgram(gl, vertexSrc, fragmentSrc)",
    text: "Внутри — `shaderSource` и `compileShader` для каждой половины, потом `linkProgram` склеивает пару. GLSL передаётся строкой и компилируется драйвером прямо в браузере; ошибки нужно запрашивать самим через `getShaderInfoLog`.",
  },
  {
    title: "Буфер",
    code: "gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)",
    text: "Координаты вершин — обычный typed array. Перед этим буфер создают и привязывают (`createBuffer`, `bindBuffer`), а `bufferData` один раз копирует данные в видеопамять. `STATIC_DRAW` — подсказка драйверу: данные меняться не будут.",
  },
  {
    title: "Атрибут",
    code: "gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)",
    text: "Буфер — просто байты; эта строка говорит, как их читать: по 2 `float` на вершину, подряд. `loc` — номер `in vec2 a_position` из `getAttribLocation`, и его нужно включить `enableVertexAttribArray`. Всю настройку запоминает VAO.",
  },
  {
    title: "Отрисовка",
    code: "gl.useProgram(program); gl.drawArrays(gl.TRIANGLES, 0, 3)",
    text: "`useProgram` выбирает шейдеры, `drawArrays` запускает конвейер: 3 вершины → один треугольник → фрагментный шейдер на каждом его пикселе. Что рисовать, не передаётся — берётся то, что привязано сейчас.",
  },
];

// Кадр из first-shader.js: настроить состояние `gl` и вызвать отрисовку.
export const drawFrame = `
const draw = (time) => {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(program);              // какой шейдер
  gl.bindVertexArray(vao);             // какие вершины
  gl.uniform1f(uTime, time / 1000);    // какие параметры
  gl.drawArrays(gl.TRIANGLES, 0, 3);   // рисуй тем, что привязано
  requestAnimationFrame(draw);
};
`;
