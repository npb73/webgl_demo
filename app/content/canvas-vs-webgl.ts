// Canvas 2D рядом с WebGL: шейдеры понятнее через то, что все уже знают.
// В строках `код` → <code>.
export type VersusRow = {
  step: string;
  canvas: string;
  webgl: string;
};

// Один и тот же градиент двумя способами — шаг за шагом.
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

// Привычные операции Canvas 2D — и как то же самое делают в WebGL.
export const drawingRows: VersusRow[] = [
  {
    step: "Очистить",
    canvas: "`clearRect(0, 0, w, h)`",
    webgl: "`gl.clear(gl.COLOR_BUFFER_BIT)` — почти то же самое",
  },
  {
    step: "Прямоугольник",
    canvas: "`fillRect(x, y, w, h)`",
    webgl: "Прямоугольников нет: два треугольника в буфере и шейдер, который их красит",
  },
  {
    step: "Круг",
    canvas: "`arc()`, потом `fill()`",
    webgl: "Кругов нет: много маленьких треугольников — или квадрат, где шейдер выкидывает пиксели за радиусом",
  },
  {
    step: "Линия",
    canvas: "`lineTo()`, потом `stroke()`",
    webgl: "`gl.LINES` почти везде рисует только в 1 пиксель. Толстую линию собирают из треугольников",
  },
  {
    step: "Текст",
    canvas: "`fillText(\"Привет\", x, y)`",
    webgl: "Текста нет: буквы рисуют в Canvas 2D и загружают как картинку. Или, как на этом сайте, снимают HTML",
  },
  {
    step: "Картинка",
    canvas: "`drawImage(img, x, y)`",
    webgl: "`texImage2D` кладёт картинку в видеопамять, шейдер читает её через `texture()`",
  },
  {
    step: "Сдвиг, поворот",
    canvas: "`translate()`, `rotate()`",
    webgl: "Матрица: JS передаёт её в шейдер, а шейдер сдвигает каждую вершину",
  },
  {
    step: "Тысяча фигур",
    canvas: "Цикл в JS: вызов на каждую фигуру, каждый кадр",
    webgl: "Все фигуры в одном буфере и один `drawArrays` на всех",
  },
];
