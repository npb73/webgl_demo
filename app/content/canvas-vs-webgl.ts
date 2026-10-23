// Один и тот же градиент двумя способами: Canvas 2D (CanvasVsWebgl/gradient-2d.js)
// и WebGL (shaders/first-shader.frag). Строки — шаг за шагом, `код` → <code>.
export type VersusRow = {
  step: string;
  canvas: string;
  webgl: string;
};

export const versusRows: VersusRow[] = [
  {
    step: "Обход пикселей",
    canvas: "`for (y…) for (x…)` — цикл пишем сами",
    webgl: "Цикла нет: GPU сам вызывает `main()` для каждого пикселя",
  },
  {
    step: "Где пиксель",
    canvas: "`u = x / width`",
    webgl: "`uv = gl_FragCoord.xy / u_resolution`",
  },
  {
    step: "Цвет",
    canvas: "`Math.cos(time + u)` — отдельно для R, G и B",
    webgl: "`cos(u_time + uv.xyx + vec3(0, 2, 4))` — три канала разом",
  },
  {
    step: "Запись",
    canvas: "`data[i] = …`, в конце `putImageData()`",
    webgl: "`outColor = vec4(color, 1.0)`",
  },
  {
    step: "Кто считает",
    canvas: "CPU, один поток: пиксели по очереди",
    webgl: "GPU, тысячи потоков: все пиксели сразу",
  },
];
