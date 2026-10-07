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

// Словарь — через то, что фронтендер и так знает.
export const glossary: TermItem[] = [
  { term: "attribute", text: "данные каждой вершины (позиция, цвет) — как пропсы" },
  { term: "uniform", text: "одно значение на весь вызов (время, матрица) — как контекст" },
  { term: "varying", text: "из вершинного шейдера во фрагментный, с интерполяцией" },
  { term: "texture", text: "изображение или массив данных, читается по координатам" },
];

export const pitfalls: TermItem[] = [
  {
    term: "Один пульт на всех",
    text: "Всё состояние `gl` глобальное. Забыл переключить буфер — рисуешь не тем.",
  },
  {
    term: "Ошибки молчат",
    text: "Шейдер не собрался — исключения нет, только чёрный экран. Проверяйте `getShaderInfoLog`.",
  },
  {
    term: "Вызовы дороже вершин",
    text: "Один draw call на миллион треугольников быстрее тысячи мелких вызовов.",
  },
  {
    term: "Мыло на ретине",
    text: "Размер буфера canvas = CSS-размер × `devicePixelRatio`.",
  },
  {
    term: "Потеря контекста",
    text: "При сбое драйвера ресурсы GPU пропадают. Обрабатывайте `webglcontextlost`.",
  },
];
