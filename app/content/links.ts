export type Library = {
  name: string;
  url: string;
  text: string;
};

export type Reading = {
  title: string;
  url: string;
  note: string;
};

export const libraries: Library[] = [
  {
    name: "Three.js",
    url: "https://threejs.org/",
    text: "Де-факто стандарт для 3D: сцена, камеры, материалы, загрузчики моделей. Если сомневаетесь — начинайте с него.",
  },
  {
    name: "React Three Fiber",
    url: "https://r3f.docs.pmnd.rs/",
    text: "React-рендерер для Three.js: сцена как JSX, хуки вместо ручного цикла rAF. Для тех, у кого всё и так на React.",
  },
  {
    name: "Babylon.js",
    url: "https://www.babylonjs.com/",
    text: "Полноценный движок: физика, инспектор, редактор материалов, WebGPU-бэкенд из коробки.",
  },
  {
    name: "PixiJS",
    url: "https://pixijs.com/",
    text: "Быстрый 2D: спрайты, фильтры, десятки тысяч объектов. Когда Canvas 2D уже не тянет.",
  },
  {
    name: "OGL",
    url: "https://github.com/oframe/ogl",
    text: "Минималистичная обёртка в духе Three.js. Исходники читаются за вечер — отличный учебник.",
  },
  {
    name: "twgl / regl",
    url: "https://twgljs.org/",
    text: "Тонкие хелперы поверх сырого API: убирают бойлерплейт, но не навязывают «сцену».",
  },
];

export const reading: Reading[] = [
  {
    title: "MDN — WebGL API",
    url: "https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API",
    note: "справочник по каждому методу и расширению",
  },
  {
    title: "WebGL2 Fundamentals",
    url: "https://webgl2fundamentals.org/",
    note: "лучший пошаговый курс: от треугольника до теней",
  },
  {
    title: "The Book of Shaders",
    url: "https://thebookofshaders.com/",
    note: "как думать фрагментными шейдерами",
  },
  {
    title: "Shadertoy",
    url: "https://www.shadertoy.com/",
    note: "тысячи шейдеров с исходниками — смотреть и ломать",
  },
  {
    title: "Спецификация WebGL 2.0",
    url: "https://registry.khronos.org/webgl/specs/latest/2.0/",
    note: "когда нужен точный ответ, а не пересказ",
  },
  {
    title: "Spector.js",
    url: "https://spector.babylonjs.com/",
    note: "захват кадра: каждый вызов gl и всё состояние",
  },
];
