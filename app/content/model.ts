import type { PipelineStage } from "../components/Pipeline/Pipeline";

export const pipelineStages: PipelineStage[] = [
  { name: "Буферы", hint: "вершины, цвета, UV" },
  { name: "Vertex shader", hint: "раз на вершину", programmable: true },
  { name: "Растеризация", hint: "треугольник → пиксели" },
  { name: "Fragment shader", hint: "раз на пиксель", programmable: true },
  { name: "Framebuffer", hint: "экран или текстура" },
];

export type GlossaryItem = {
  term: string;
  text: string;
};

export const glossary: GlossaryItem[] = [
  {
    term: "attribute",
    text: "«Пропсы» каждой вершины: позиция, цвет, UV. Читаются из буфера, у каждой вершины свои.",
  },
  {
    term: "uniform",
    text: "«Контекст» всего draw call: время, матрица камеры, размер экрана. Одно значение на все вершины и пиксели.",
  },
  {
    term: "varying",
    text: "Пара `out` / `in` между шейдерами. Vertex shader пишет значение в вершинах, GPU интерполирует его для каждого пикселя между ними.",
  },
  {
    term: "texture",
    text: "Не только картинки: любой 2D-массив данных, который шейдер может читать по координатам. Позиции частиц, карты высот, предыдущий кадр.",
  },
  {
    term: "framebuffer",
    text: "Куда рисуем. По умолчанию — canvas, но можно рисовать в текстуру и использовать её дальше: так устроены все постэффекты.",
  },
];

export const pitfalls: GlossaryItem[] = [
  {
    term: "Глобальное состояние",
    text: "`gl` — state machine: `bindBuffer`, `useProgram`, blending — всё глобально. Забыли переключить — следующий draw call рисует «не тем».",
  },
  {
    term: "Лимит контекстов",
    text: "Браузер держит ограниченное число живых WebGL-контекстов (в Chrome — 16), самые старые теряются. Один canvas на страницу + `scissor` лучше десятка canvas в карточках.",
  },
  {
    term: "Синхронизация с GPU",
    text: "`getError`, `readPixels`, `getParameter` в горячем цикле заставляют CPU ждать GPU. Проверяйте ошибки только в dev-сборке.",
  },
  {
    term: "Draw calls дороже вершин",
    text: "Сотни тысяч треугольников — нормально, тысячи draw call — нет. Спасают instancing (`drawArraysInstanced`) и батчинг.",
  },
  {
    term: "Точность",
    text: "`mediump` на мобильных может оказаться настоящим 16-битным float — отсюда «дрожащие» координаты и полосы в шуме.",
  },
  {
    term: "Альфа",
    text: "Canvas композитится с `premultipliedAlpha: true`. Отдаёте непремультиплицированный цвет — получаете светлые ореолы по краям.",
  },
];
