/** Одна сторона шага: строка кода и что она значит; `обратные кавычки` → <code>. */
export type StepSide = {
  code: string;
  text: string;
};

export type Step = {
  title: string;
  /** Как то же самое делают на обычном Canvas 2D — это все знают. */
  canvas: StepSide;
  webgl: StepSide;
};

// Минимальная программа — треугольник. Каждый шаг рядом с тем, как тот же
// треугольник рисуют на Canvas 2D: шейдеры понятнее через знакомое.
export const steps: Step[] = [
  {
    title: "Контекст",
    canvas: {
      code: 'const ctx = canvas.getContext("2d")',
      text: "В `ctx` готовые фигуры и кисти: `fillRect`, `arc`, `fillStyle`.",
    },
    webgl: {
      code: 'const gl = canvas.getContext("webgl2")',
      text: "Тот же вызов, другой объект: фигур нет — только буферы, шейдеры и `drawArrays`. Без WebGL 2 вернёт `null`.",
    },
  },
  {
    title: "Чем красить",
    canvas: {
      code: 'ctx.fillStyle = "tomato"',
      text: "Цвет, градиент или узор — одно свойство. Кисти только те, что есть в браузере.",
    },
    webgl: {
      code: "const program = createProgram(gl, vert, frag)",
      text: "Кисть пишем сами — два шейдера на GLSL. Компилируются прямо в браузере, ошибки читаем через `getShaderInfoLog`.",
    },
  },
  {
    title: "Точки фигуры",
    canvas: {
      code: "ctx.moveTo(0, 0);\nctx.lineTo(100, 0);\nctx.lineTo(0, 100);",
      text: "Точки — вызовами, по одной и каждый кадр заново.",
    },
    webgl: {
      code: "const buffer = gl.createBuffer();\ngl.bindBuffer(gl.ARRAY_BUFFER, buffer);\ngl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);",
      text: "В WebGL нельзя сказать «положи точки вот в этот буфер». Сначала выбираем буфер — `bindBuffer`, потом `bufferData` кладёт в него точки. `ARRAY_BUFFER` значит «буфер с точками». Загружаем один раз — сразу в память видеокарты.",
    },
  },
  {
    title: "Как читать точки",
    canvas: {
      code: "ctx.lineTo(x, y)",
      text: "Объяснять нечего: аргументы `x` и `y` — уже координаты.",
    },
    webgl: {
      code: "gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)",
      text: "Буфер — просто байты. Говорим: по 2 `float` на вершину → в `in vec2 a_position`. Настройку запоминает VAO.",
    },
  },
  {
    title: "Нарисовать",
    canvas: {
      code: "ctx.fill()",
      text: "Браузер сам находит пиксели внутри пути и красит их `fillStyle`.",
    },
    webgl: {
      code: "gl.useProgram(program); gl.drawArrays(gl.TRIANGLES, 0, 3)",
      text: "Тоже «залей треугольник», но цвет каждого пикселя считает наш шейдер. Рисуется то, что привязано сейчас.",
    },
  },
];

// Кадр WebGL: настроить состояние `gl` и вызвать отрисовку.
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
