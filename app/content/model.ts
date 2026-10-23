import type { StaticImageData } from "next/image";
import type { PipelineStage } from "../components/Pipeline/Pipeline";
import fragmentShaderImage from "./images/fragment-shader.png";
import vertexShaderImage from "./images/vertex-shader.png";

export const pipelineStages: PipelineStage[] = [
  { name: "Вершины", hint: "массив чисел в буфере" },
  { name: "Vertex shader", hint: "раз на вершину → позиция", programmable: true },
  { name: "Растеризация", hint: "пиксели внутри треугольника" },
  { name: "Fragment shader", hint: "раз на пиксель → цвет", programmable: true },
  { name: "Экран", hint: "или текстура" },
];

export type ShaderHalf = {
  /** Расширение файла — только соглашение; для WebGL важен type в gl.createShader(type). */
  file: string;
  name: string;
  type: string;
  /** Сколько раз GPU вызывает main(). */
  runs: string;
  /** На какой вопрос отвечает шейдер и чем. */
  answers: string;
  text: string;
  /** Рисунок на полях: что шейдер получает и что отдаёт. */
  image: StaticImageData;
  imageAlt: string;
};

// Шейдерная программа — всегда пара: без любой из половин linkProgram не соберёт её.
export const shaderPair: ShaderHalf[] = [
  {
    file: ".vert",
    name: "Вершинный шейдер",
    type: "gl.VERTEX_SHADER",
    runs: "раз на каждую вершину",
    answers: "где? → gl_Position",
    text: "Получает вершины из буфера и решает, где они окажутся на экране. Это форма: треугольник, сетка листа, миллион точек. Двигать, вращать и проецировать 3D — тоже здесь.",
    image: vertexShaderImage,
    imageAlt: "Вершин немного; вершинный шейдер переводит их в координаты на экране — тетраэдр поворачивается.",
  },
  {
    file: ".frag",
    name: "Фрагментный шейдер",
    type: "gl.FRAGMENT_SHADER",
    runs: "раз на каждый пиксель внутри треугольника",
    answers: "какого цвета? → outColor",
    text: "Видит только свой пиксель: координату, то, что передал вершинный, uniform и текстуры. Градиенты, линзы, огонь и Milkdrop — всё это фрагментные шейдеры.",
    image: fragmentShaderImage,
    imageAlt: "Пикселей внутри треугольника много; фрагментный шейдер даёт цвет каждому — получается градиент.",
  },
];

// Путь first-shader.frag от файла в репозитории до пикселей на странице.
export const fragJourney: PipelineStage[] = [
  { name: "first-shader.frag", hint: "обычный текстовый файл GLSL", programmable: true },
  { name: "npm run shaders", hint: "сборка: .frag + fullscreen.vert → public/shaders/first-shader.wasm" },
  { name: "loadShaderSources()", hint: "fetch + WebAssembly.instantiate → две строки GLSL" },
  { name: "createProgram()", hint: "драйвер компилирует GLSL под эту видеокарту — прямо в браузере" },
  { name: "requestAnimationFrame", hint: "uniform1f(u_time) + drawArrays → main() на каждый пиксель", programmable: true },
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
    text: "Страница попадает на экран только через снимок. Прокрутка, ховер, мигающий курсор — всё это пересъёмка. Снимок длинной страницы стоил около 12,5 мс, и прокрутка съедала три четверти главного потока (слайд «Сколько это стоит») — поэтому этот сайт и стал презентацией.",
    fix: "Снимайте только то, что изменилось (`event.changedElements`), и держите drawable-элементы маленькими — не всю длинную страницу. Цену проверяйте замером, а не на глаз.",
  },
];
