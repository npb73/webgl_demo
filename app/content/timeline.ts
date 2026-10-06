export type TimelineItem = {
  year: string;
  title: string;
  text: string;
};

export const timeline: TimelineItem[] = [
  {
    year: "2006",
    title: "Canvas 3D",
    text: "Владимир Вукичевич из Mozilla собирает прототип: `<canvas>`, который отдаёт в JavaScript контекст OpenGL. Идея — не плагин вроде Flash, а нативное API браузера.",
  },
  {
    year: "2007",
    title: "Каждый за себя",
    text: "Mozilla и Opera экспериментируют со своими реализациями 3D-canvas. Работает, но несовместимо — классическая история веба до стандарта.",
  },
  {
    year: "2009",
    title: "Khronos берётся за дело",
    text: "Khronos Group — консорциум, который отвечает за OpenGL, — создаёт рабочую группу WebGL с Mozilla, Apple, Google и Opera. Курс — тонкая обёртка над OpenGL ES 2.0, мобильным подмножеством OpenGL.",
  },
  {
    year: "2011",
    title: "WebGL 1.0",
    text: "В марте выходит спецификация 1.0. Chrome 9 и Firefox 4 включают WebGL по умолчанию — шейдеры в браузере больше не экзотика.",
  },
  {
    year: "2013",
    title: "IE11",
    text: "Microsoft долго сомневалась в безопасности прямого доступа к драйверам, но в IE11 поддержка всё-таки появляется.",
  },
  {
    year: "2014",
    title: "iOS 8",
    text: "WebGL приходит в мобильный Safari, а значит — на каждый iPhone. С этого момента WebGL можно считать доступным почти везде.",
  },
  {
    year: "2017",
    title: "WebGL 2.0",
    text: "Новая версия на базе OpenGL ES 3.0: VAO, instancing, multiple render targets, 3D-текстуры, GLSL ES 3.00. Chrome 56 и Firefox 51 включают её в январе.",
  },
  {
    year: "2021",
    title: "Safari догоняет",
    text: "Safari 15 включает WebGL 2 по умолчанию — через ANGLE поверх Metal. WebGL 2 становится базовой версией, на которую можно рассчитывать.",
  },
  {
    year: "2023",
    title: "Приходит WebGPU",
    text: "Chrome 113 выпускает WebGPU — новый API в духе Vulkan, Metal и Direct3D 12, с compute-шейдерами. Это преемник, а не замена «завтра».",
  },
  {
    year: "2025",
    title: "WebGPU везде",
    text: "WebGPU появляется в Safari 26 и Firefox. А WebGL никуда не делся: это по-прежнему самая совместимая графика в вебе, и на нём работает большинство существующих проектов.",
  },
];
