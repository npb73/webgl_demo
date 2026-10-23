import type { PipelineStage } from "../components/Pipeline/Pipeline";

export const pipelineStages: PipelineStage[] = [
  { name: "Вершины", hint: "массив чисел в буфере" },
  { name: "Vertex shader", hint: "раз на вершину → позиция", programmable: true },
  { name: "Растеризация", hint: "пиксели внутри треугольника" },
  { name: "Fragment shader", hint: "раз на пиксель → цвет", programmable: true },
  { name: "Экран", hint: "или текстура" },
];

export type TermItem = {
  term: string;
  text: string;
};

export type GlossaryItem = {
  /** Объявление в GLSL. */
  glsl: string;
  /** Вызов на стороне JS, который это значение заполняет. */
  js: string;
};

// Каждое объявление в шейдере — и строка JS, которая его кормит.
export const glossary: GlossaryItem[] = [
  {
    glsl: "in vec2 a_position;",
    js: "gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)",
  },
  {
    glsl: "uniform float u_time;",
    js: "gl.uniform1f(uTime, t)",
  },
  {
    glsl: "out vec3 v_color;",
    js: "→ in vec3 v_color; во фрагментном",
  },
  {
    glsl: "uniform sampler2D u_page;",
    js: "gl.texImage2D(gl.TEXTURE_2D, 0, …, image)",
  },
];

export type Weakness = {
  term: string;
  /** Что происходит и почему; `обратные кавычки` → <code>. */
  text: string;
  /** Что с этим делать. */
  fix: string;
  /** Короткий пример — одна-две строки. */
  code?: string;
};

// Слабые места: сначала самого WebGL, потом подхода «страница — текстура».
export const weaknesses: Weakness[] = [
  {
    term: "Всё держится на глобальном состоянии",
    text: "В WebGL нет объекта «нарисуй вот это». Есть текущая программа, буфер, текстура, framebuffer — и каждый вызов берёт то, что привязано прямо сейчас. Чужой код перепривязал буфер — вы рисуете не то, и никакой ошибки.",
    fix: "Привязывайте всё нужное прямо перед отрисовкой. Настройку вершин держите в VAO — одна строка восстанавливает её целиком.",
    code: "gl.useProgram(program);\ngl.bindVertexArray(vao);",
  },
  {
    term: "Ошибки молчат",
    text: "Опечатка в GLSL не бросает исключение: шейдер просто не собирается, а на экране пусто. Остальные ошибки копятся в `gl.getError()`, который никто не спрашивает.",
    fix: "После компиляции проверяйте статус и бросайте лог сами — так делает `createProgram` в `program.js`.",
    code: "if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))\n  throw new Error(gl.getShaderInfoLog(shader));",
  },
  {
    term: "Дороже всего — число вызовов",
    text: "Вершины видеокарта считает быстро, а каждый draw call — это работа драйвера на процессоре: проверить состояние, отправить команды. Тысяча вызовов по тысяче точек медленнее одного вызова на миллион.",
    fix: "Складывайте похожие объекты в один буфер и рисуйте одним вызовом, различия передавайте атрибутами — как график на слайде 5.",
    code: "gl.drawArrays(gl.POINTS, 0, 1_000_000);",
  },
  {
    term: "Мыло на ретине",
    text: "У canvas два размера: CSS — как он выглядит, и буфер — сколько в нём пикселей. По умолчанию буфер 300×150, CSS растягивает его, и картинка мутнеет. На ретине пикселей нужно в `devicePixelRatio` раз больше.",
    fix: "Ставьте размер буфера из `ResizeObserver` и после него — `gl.viewport`.",
    code: "canvas.width = Math.round(width * devicePixelRatio);\ngl.viewport(0, 0, canvas.width, canvas.height);",
  },
  {
    term: "Контекст могут отобрать",
    text: "Сбой драйвера, нехватка видеопамяти, долгий фон — и браузер забирает WebGL-контекст. Все буферы, текстуры и программы исчезают, canvas замирает. На этом сайте это не обработано: поможет только перезагрузка.",
    fix: "Ловите `webglcontextlost` с `preventDefault()` и пересоздавайте ресурсы в `webglcontextrestored`. Создание ресурсов держите в одной функции, чтобы вызвать её повторно.",
    code: 'canvas.addEventListener("webglcontextlost", (e) => e.preventDefault());\ncanvas.addEventListener("webglcontextrestored", init);',
  },
  {
    term: "HTML-in-Canvas — пока эксперимент",
    text: "API есть только в Chrome и только за флагом, а имена в нём уже меняются. Остальные браузеры видят обычную страницу без эффектов.",
    fix: "Делайте сцену улучшением, а не условием: проверяйте API и оставляйте рабочий DOM-вариант — как этот сайт без флага.",
    code: '"texElementSubImage2D" in WebGL2RenderingContext.prototype',
  },
  {
    term: "Каждое изменение — новый снимок",
    text: "Страница попадает на экран только через снимок. Прокрутка, ховер, мигающий курсор — всё это пересъёмка. Снимок длинной страницы стоил около 12,5 мс, и прокрутка съедала три четверти главного потока — поэтому этот сайт и стал презентацией.",
    fix: "Снимайте только то, что изменилось (`event.changedElements`), и держите drawable-элементы маленькими — не всю длинную страницу. Цену проверяйте замером, а не на глаз.",
  },
];
