import type { CodeNotes } from "./code-notes";
import { fisheyeHelpers, fisheyeMain } from "./shader";

export type OverlayStep = {
  title: string;
  /** Пояснение; `обратные кавычки` → <code>. */
  text: string;
  filename: string;
  code: string;
  notes: CodeNotes;
};

// Как окно-линза получает страницу под собой: от разметки до пикселя.
// Код — упрощённые выдержки из Stage.tsx и stage-renderer.js.
export const overlaySteps: OverlayStep[] = [
  {
    title: "Страница — внутри canvas",
    text: "Потомки `<canvas layoutsubtree>` верстаются как обычный HTML, но на экран сами не попадают: их отрисовку браузер отдаёт нам. `drawable` помечает элемент, который можно снять в текстуру.",
    filename: "Stage.tsx",
    code: `
<canvas ref={canvasRef} layoutsubtree="">
  <div ref={pageRef} drawable="">
    {children}
  </div>
</canvas>
`,
    notes: {
      "<canvas ref={canvasRef} layoutsubtree": "Включает HTML-in-Canvas: дети canvas проходят обычную вёрстку, но на экран их выводит наш WebGL.",
      '<div ref={pageRef} drawable="">': "drawable — этот элемент можно снять в текстуру. Внутри — слайды, виден один.",
      "{children}": "Обычный React: тексты, кнопки, стикеры. Клики, ховер и выделение работают, как в DOM.",
    },
  },
  {
    title: "Страница → текстура",
    text: "Когда браузер перерисовал потомков, canvas получает событие `paint`. `texElementSubImage2D` кладёт снимок элемента в обычную текстуру — как картинку через `texImage2D`, только источник — DOM. Страница — один слайд размером с экран, его и снимаем.",
    filename: "stage-renderer.js",
    code: `
canvas.addEventListener("paint", () => {
  gl.bindTexture(gl.TEXTURE_2D, pageTexture);
  gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, page, {
    width: canvas.width, height: canvas.height,
  });
});
`,
    notes: {
      'canvas.addEventListener("paint"': "Браузер перерисовал потомков canvas — можно забирать свежий снимок.",
      "gl.bindTexture(gl.TEXTURE_2D, pageTexture);": "Текстура страницы: создана один раз, размером с экран.",
      "gl.texElementSubImage2D(": "Как texSubImage2D, только источник — DOM-элемент: браузер кладёт его отрисовку прямо в видеопамять.",
      "width: canvas.width, height: canvas.height,": "Размер в текстуре — в пикселях устройства, чтобы текст был чётким на ретине.",
    },
  },
  {
    title: "Искажение — это выбор, откуда брать пиксель",
    text: "Шейдер не рисует линзу. Для каждого пикселя окна он решает, из какой точки страницы под окном взять цвет: сдвинул координату — получил искажение. Стекло, рябь и огонь устроены так же, меняется только формула.",
    filename: "fisheye.frag",
    code: fisheyeHelpers,
    notes: {
      "vec3 page(vec2 uv)": "Прочитать цвет страницы под окном в точке uv.",
      "return texture(u_page, vec2(uv.x, 1.0 - uv.y)).rgb;": "texture() — чтение sampler2D. y переворачиваем: строки снимка идут сверху вниз, а v_uv растёт снизу вверх.",
      "vec2 fisheye(vec2 p, float k)": "Откуда брать цвет для точки p (координата от центра линзы); k — сила.",
      "float r = length(p) / RADIUS;": "Расстояние до центра: 1 — край линзы.",
      "if (r >= 1.0) return p;": "За краем линзы — страница как есть.",
      "return p * (1.0 - k + k * r * r);": "В центре берём точку ближе к центру — увеличение 1 / (1 − k). К краю сдвиг исчезает.",
    },
  },
];

// Продолжение последнего шага — main линзы: на один экран с функциями не влезает.
export const overlayFisheyeMain = {
  title: "…и собрать цвет по каналам",
  filename: "fisheye.frag",
  code: fisheyeMain,
  notes: {
    "void main()": "Вызывается для каждого пикселя окна.",
    "vec2 aspect =": "Поправка на пропорции окна, чтобы линза была круглой.",
    "vec2 p = (v_uv * 2.0 - 1.0) * aspect;": "Координата пикселя от центра окна: от −1 до 1 по вертикали.",
    "vec2 toUv = 0.5 / aspect;": "Обратный перевод: из координат линзы — в UV картинки под окном.",
    "float k = u_strength;": "Сила линзы, её ставит JS.",
    "vec3 color = vec3(": "Цвет собирается по каналам — каждый из своей точки.",
    "page(fisheye(p, k * (1.0 + DISPERSION))": "Красный преломляется чуть сильнее…",
    "page(fisheye(p, k) * toUv + 0.5).g,": "…зелёный — ровно с k…",
    "page(fisheye(p, k * (1.0 - DISPERSION))": "…синий — слабее. Отсюда радужная кайма по краю, как у настоящего стекла.",
  } satisfies CodeNotes,
};
