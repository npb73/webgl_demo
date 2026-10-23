// Замер 2026-10-20: Chrome 155, MacBook Pro M3 Pro, окно 1440×757 CSS-пикселей,
// ретина (DPR 2, буфер 2880×1514), страница 26 784 px в высоту. Каждый сценарий —
// 4 секунды, два прогона, среднее. Скрипт замера — Chrome DevTools Protocol:
// главный поток — Performance.getMetrics (TaskDuration), «наш код» и снимки —
// счётчики сцены (getStats в stage-renderer.js). Тогда сайт был одной длинной
// страницей: строка «Прокрутка» — замер той версии, после него сайт стал презентацией.
export const measuredOn =
  "Chrome 155, MacBook Pro M3 Pro, окно 1440×757, ретина (DPR 2). Каждый сценарий — 4 секунды, два прогона.";

export type ResourceRow = {
  scenario: string;
  /** Главный поток вкладки в режиме обычного DOM, % времени. */
  dom: string;
  /** То же со сценой HTML-in-Canvas. */
  stage: string;
  /** Обработчик paint сцены на один кадр. */
  ourCode: string;
  snapshots: string;
  gpu: string;
  /** Строку стоит выделить — здесь вся цена. */
  hot?: boolean;
};

export const resourceRows: ResourceRow[] = [
  { scenario: "Покой", dom: "1,0 %", stage: "1,1 %", ourCode: "0 кадров", snapshots: "0", gpu: "33 МБ" },
  { scenario: "Прокрутка длинной страницы", dom: "4,5 %", stage: "79 %", ourCode: "12,6 мс", snapshots: "60", gpu: "33 МБ", hot: true },
  { scenario: "Тащить окно-линзу", dom: "5,3 %", stage: "3,7 %", ourCode: "0,24 мс", snapshots: "0", gpu: "70 МБ" },
  { scenario: "Водить по карточке", dom: "8,6 %", stage: "6,5 %", ourCode: "0,25 мс", snapshots: "1", gpu: "56 МБ" },
  { scenario: "Переход «куб»", dom: "—", stage: "6,6 %", ourCode: "0,58 мс", snapshots: "3", gpu: "97 МБ" },
];

export type ResourceItem = {
  name: string;
  value: string;
  /** Из чего складывается — одной фразой. */
  note?: string;
};

export type ResourceBudget = {
  title: string;
  /** Главная цифра блока. */
  summary: string;
  items: ResourceItem[];
};

// Сколько сайт тратит, по трём статьям. Считано 2026-10-23 для этой версии:
// трафик — по продакшен-сборке (HTML, JS, CSS — в gzip, шрифты и картинки —
// как есть); память JS — Chrome 155, Performance.getMetrics после сборки
// мусора; видеопамять — по размерам текстур, которые создаёт сцена
// (stage-renderer.js), при окне 1440×757 на ретине.
export const resourceBudgets: ResourceBudget[] = [
  {
    title: "Трафик",
    summary: "≈ 470 КБ при первом заходе",
    items: [
      { name: "Страница и код", value: "242 КБ", note: "HTML, JS и CSS в сжатом виде" },
      { name: "Шрифты", value: "до 225 КБ", note: "рукописный, основной и для кода" },
      { name: "Шейдеры", value: "17 КБ", note: "только с флагом: 10 файлов .wasm" },
      { name: "Milkdrop", value: "+61 КБ", note: "движок butterchurn, при первом окне" },
      { name: "Пасхалка", value: "+20 КБ", note: "рисунок, когда он появился" },
    ],
  },
  {
    title: "Оперативная память",
    summary: "≈ 3 МБ в покое",
    items: [
      { name: "Без флага", value: "2,7 МБ", note: "обычная страница" },
      { name: "Со сценой", value: "3,1 МБ", note: "сцена почти ничего не добавляет" },
      { name: "График", value: "+8,6 МБ", note: "миллион точек остаётся в JS, чтобы окно открывалось сразу" },
      { name: "Milkdrop", value: "+10 МБ", note: "движок пресетов, пока окно открыто" },
    ],
  },
  {
    title: "Видеопамять",
    summary: "33 МБ в покое",
    items: [
      { name: "Один экран", value: "17 МБ", note: "2880 × 1514 точек по 4 байта; в покое их два — canvas и снимок слайда" },
      { name: "Окно-линза", value: "+37 МБ", note: "рамка, содержимое и то, что под окном" },
      { name: "Окно Milkdrop", value: "+48 МБ", note: "то же и ещё прошлый кадр" },
      { name: "График", value: "+34 МБ", note: "окно и сами точки — 8,6 МБ" },
      { name: "Карточки", value: "+21 МБ", note: "слайд с карточками и три снимка" },
      { name: "Переход", value: "+42 МБ", note: "снимок «до», кадр перехода и глубина" },
    ],
  },
];
