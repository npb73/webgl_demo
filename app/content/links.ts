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
  { name: "Three.js", url: "https://threejs.org/", text: "сцена, камера, свет, модели — стандарт де-факто" },
  { name: "React Three Fiber", url: "https://r3f.docs.pmnd.rs/", text: "Three.js как JSX-компоненты" },
  { name: "Babylon.js", url: "https://www.babylonjs.com/", text: "движок «с батарейками»: физика, редактор, WebGPU" },
  { name: "PixiJS", url: "https://pixijs.com/", text: "быстрый 2D: спрайты и фильтры" },
  { name: "OGL / twgl", url: "https://github.com/oframe/ogl", text: "тонкие помощники — когда нужен почти сырой WebGL" },
];

export const reading: Reading[] = [
  { title: "WebGL2 Fundamentals", url: "https://webgl2fundamentals.org/", note: "лучший курс с нуля" },
  { title: "The Book of Shaders", url: "https://thebookofshaders.com/", note: "как думать пикселями" },
  { title: "Shadertoy", url: "https://www.shadertoy.com/", note: "тысячи шейдеров — смотреть и ломать" },
  { title: "MDN — WebGL API", url: "https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API", note: "справочник" },
  { title: "HTML-in-Canvas", url: "https://github.com/WICG/html-in-canvas", note: "то, на чём живёт эта тетрадь" },
];
