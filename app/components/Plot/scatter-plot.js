// График на миллион точек: данные, отрисовка и управление мышью.
// Один модуль для обоих режимов: в DOM он рисует в свой canvas,
// на сцене HTML-in-Canvas — в текстуру окна.

export const POINT_COUNT = 1_000_000;

const MIN_SCALE = 0.5;
const MAX_SCALE = 5000;

// --- Данные ------------------------------------------------------------------
// Синтетические «сессии» из нескольких сегментов: вытянутые облака разной
// плотности плюс равномерный шум. Генератор с фиксированным зерном —
// график одинаковый при каждом открытии.
const CLUSTERS = [
  { x: -0.42, y: -0.32, sx: 0.24, sy: 0.07, angle: 0.6, weight: 0.3, group: 0 },
  { x: 0.22, y: 0.12, sx: 0.3, sy: 0.11, angle: 0.75, weight: 0.28, group: 0 },
  { x: 0.56, y: 0.56, sx: 0.11, sy: 0.11, angle: 0, weight: 0.12, group: 1 },
  { x: -0.25, y: 0.52, sx: 0.2, sy: 0.05, angle: -0.3, weight: 0.13, group: 3 },
  { x: 0.6, y: -0.48, sx: 0.07, sy: 0.24, angle: 0.2, weight: 0.11, group: 1 },
];
const NOISE_SHARE = 0.06;

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let cachedData = null;

/** 1 000 000 точек: координаты (Float32, по 2) и сегменты (Uint8). */
export function generatePoints() {
  if (cachedData) return cachedData;
  const random = mulberry32(2026);
  const positions = new Float32Array(POINT_COUNT * 2);
  const groups = new Uint8Array(POINT_COUNT);
  const totalWeight = CLUSTERS.reduce((sum, cluster) => sum + cluster.weight, 0);

  for (let i = 0; i < POINT_COUNT; i++) {
    if (random() < NOISE_SHARE) {
      positions[i * 2] = random() * 2 - 1;
      positions[i * 2 + 1] = random() * 2 - 1;
      groups[i] = 2;
      continue;
    }
    let pick = random() * totalWeight;
    let cluster = CLUSTERS[0];
    for (const candidate of CLUSTERS) {
      pick -= candidate.weight;
      if (pick <= 0) {
        cluster = candidate;
        break;
      }
    }
    // Нормальное распределение (Бокс — Мюллер), вытянутое и повёрнутое.
    const radius = Math.sqrt(-2 * Math.log(1 - random()));
    const theta = 2 * Math.PI * random();
    const u = radius * Math.cos(theta) * cluster.sx;
    const v = radius * Math.sin(theta) * cluster.sy;
    const cos = Math.cos(cluster.angle);
    const sin = Math.sin(cluster.angle);
    positions[i * 2] = cluster.x + u * cos - v * sin;
    positions[i * 2 + 1] = cluster.y + u * sin + v * cos;
    groups[i] = cluster.group;
  }

  cachedData = { positions, groups };
  return cachedData;
}

// --- Вид: зум и сдвиг ---------------------------------------------------------

export function createView() {
  return { cx: 0, cy: 0, scale: 1 };
}

/** Масштаб по осям: данные остаются квадратными при любых пропорциях окна. */
export function scaleFor(view, width, height) {
  const aspect = width / height;
  return aspect >= 1 ? [view.scale / aspect, view.scale] : [view.scale, view.scale * aspect];
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Колесо — зум к курсору, перетаскивание — сдвиг, двойной клик — сброс.
 * onChange вызывается, когда вид изменился и пора перерисовать график.
 *
 * wheelTarget — куда вешать обработчик колеса, если не на сам график.
 * Внутри canvas с HTML-in-Canvas элементы не рисуются на странице сами,
 * поэтому поток прокрутки не знает про их обработчики и прокручивает
 * страницу, не дожидаясь preventDefault. Обработчик на самом canvas он
 * видит — колесо над графиком ловим там.
 *
 * @param {HTMLElement} element
 * @param {{ cx: number, cy: number, scale: number }} view
 * @param {() => void} onChange
 * @param {{ wheelTarget?: HTMLElement }} [options]
 * @returns {() => void} отписка
 */
export function attachPlotInput(element, view, onChange, { wheelTarget = element } = {}) {
  const toNdc = (event) => {
    const rect = element.getBoundingClientRect();
    return {
      rect,
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: 1 - ((event.clientY - rect.top) / rect.height) * 2,
    };
  };

  const onWheel = (event) => {
    if (!(event.target instanceof Node) || !element.contains(event.target)) return;
    event.preventDefault();
    const { rect, x, y } = toNdc(event);
    const before = scaleFor(view, rect.width, rect.height);
    // Точка данных под курсором остаётся под курсором.
    const dataX = view.cx + x / before[0];
    const dataY = view.cy + y / before[1];
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : 1);
    view.scale = clamp(view.scale * Math.exp(-delta * 0.002), MIN_SCALE, MAX_SCALE);
    const after = scaleFor(view, rect.width, rect.height);
    view.cx = dataX - x / after[0];
    view.cy = dataY - y / after[1];
    onChange();
  };

  let drag = null;
  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    element.setPointerCapture(event.pointerId);
    drag = toNdc(event);
  };
  const onPointerMove = (event) => {
    if (!drag) return;
    const next = toNdc(event);
    const scale = scaleFor(view, next.rect.width, next.rect.height);
    view.cx -= (next.x - drag.x) / scale[0];
    view.cy -= (next.y - drag.y) / scale[1];
    drag = next;
    onChange();
  };
  const onPointerUp = () => {
    drag = null;
  };
  const onDoubleClick = () => {
    Object.assign(view, createView());
    onChange();
  };

  wheelTarget.addEventListener("wheel", onWheel, { passive: false });
  element.addEventListener("pointerdown", onPointerDown);
  element.addEventListener("pointermove", onPointerMove);
  element.addEventListener("pointerup", onPointerUp);
  element.addEventListener("pointercancel", onPointerUp);
  element.addEventListener("dblclick", onDoubleClick);
  return () => {
    wheelTarget.removeEventListener("wheel", onWheel);
    element.removeEventListener("pointerdown", onPointerDown);
    element.removeEventListener("pointermove", onPointerMove);
    element.removeEventListener("pointerup", onPointerUp);
    element.removeEventListener("pointercancel", onPointerUp);
    element.removeEventListener("dblclick", onDoubleClick);
  };
}

// --- Отрисовка ----------------------------------------------------------------

/** Цвет из палитры страницы (CSS-переменная с RGB-тройкой) → 0..1. */
function paletteColor(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--${name}-rgb`).trim();
  const parts = value ? value.split(/\s+/).map(Number) : fallback;
  return parts.map((channel) => channel / 255);
}

/**
 * Загружает точки в видеопамять один раз и рисует их одним вызовом.
 *
 * @param {WebGL2RenderingContext} gl
 * @param {WebGLProgram} program — собранный из scatter.vert / scatter.frag
 */
export function createScatterRenderer(gl, program) {
  const { positions, groups } = generatePoints();
  const location = (name) => gl.getUniformLocation(program, name);
  const u = {
    center: location("u_center"),
    scale: location("u_scale"),
    pointSize: location("u_pointSize"),
    palette: location("u_palette"),
    alpha: location("u_alpha"),
  };

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  const aPosition = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
  const groupBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, groupBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, groups, gl.STATIC_DRAW);
  const aGroup = gl.getAttribLocation(program, "a_group");
  gl.enableVertexAttribArray(aGroup);
  gl.vertexAttribPointer(aGroup, 1, gl.UNSIGNED_BYTE, false, 0, 0);
  gl.bindVertexArray(null);

  // Цвета — из палитры тетради: чернила, ручка, карандаш и зелёный.
  const paper = paletteColor("paper", [253, 252, 246]);
  const palette = new Float32Array([
    ...paletteColor("ink", [31, 59, 140]),
    ...paletteColor("red", [208, 69, 58]),
    ...paletteColor("pencil", [93, 99, 108]),
    0.16, 0.5, 0.36,
  ]);

  return {
    /** Рисует в текущий framebuffer с текущим viewport. */
    draw({ width, height, view, pixelRatio }) {
      gl.clearColor(paper[0], paper[1], paper[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      const [sx, sy] = scaleFor(view, width, height);
      gl.uniform2f(u.center, view.cx, view.cy);
      gl.uniform2f(u.scale, sx, sy);
      // При зуме точки чуть крупнее и плотнее, чтобы отдельные было видно.
      const grow = Math.pow(view.scale, 0.3);
      gl.uniform1f(u.pointSize, clamp(1.6 * grow, 1.6, 7) * pixelRatio);
      gl.uniform1f(u.alpha, clamp(0.1 * grow, 0.1, 0.9));
      gl.uniform3fv(u.palette, palette);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.POINTS, 0, POINT_COUNT);
      gl.disable(gl.BLEND);
      gl.bindVertexArray(null);
    },
    dispose() {
      gl.deleteVertexArray(vao);
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(groupBuffer);
    },
  };
}
