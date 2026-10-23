// Сцена: вся страница и окна поверх неё рисуются одним WebGL-контекстом.
//
// Страница и окна — drawable-потомки <canvas layoutsubtree>. Браузер их
// верстает и отдаёт их отрисовку в текстуры (HTML-in-Canvas), а мы сами
// решаем, где и как их показать. Поэтому окно двигается сменой матрицы,
// без перерисовки DOM, а линза видит всё, что нарисовано под ней.
//
// Страница — презентация: на ней виден один слайд размером с экран, и
// снимать её нужно, только когда браузер её перерисовал. Прокрутки нет:
// длинная страница стоила бы снимок на каждый кадр прокрутки.

import { assetPath } from "../../lib/asset-path";
import { createProgram } from "../../lib/webgl/program";
import { loadShaderSources } from "../../lib/webgl/shader-wasm";
import { createMilkdropMotion, MESH_HEIGHT, MESH_WIDTH } from "../Milkdrop/milkdrop-motion";
import { createScatterRenderer, POINT_COUNT } from "../Plot/scatter-plot";

const INTRO_MS = 700;
const DEG = Math.PI / 180;
const TILT = -0.6 * DEG;
const DRAG_TILT = 0.4 * DEG;
const DRAG_SCALE = 1.01;
// За сколько миллисекунд наклон и масштаб окна проходят ~63% пути к цели.
const EASE_MS = 60;

const easeOutBack = (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

// Переходы между слайдами: длительность и сетка листа (клеток по x и y).
// Куб — плоские грани, ему хватает одной клетки; частицы — квадратики
// страницы со стороной PARTICLE_CELL CSS-пикселей.
const TRANSITIONS = {
  flip: { duration: 2200, grid: [96, 60] },
  cube: { duration: 1800, grid: [1, 1] },
  particles: { duration: 3000 },
};
const PARTICLE_CELL = 5;
// Карточки товаров: насколько они наклоняются за указателем и как быстро.
const CARD_TILT = 14 * DEG;
const CARD_EASE_MS = 90;
// Эффекты карточек — номера u_effect в product-card.frag.
const CARD_EFFECTS = { holo: 0, gold: 1, prism: 2 };

// Фон за кубом — «стол», на котором лежит тетрадь.
const DESK = [0.16, 0.16, 0.18, 1];

// Milkdrop, всё в пересчёте на кадр при 60 Гц — чтобы на 120-герцовых
// экранах страница не текла вдвое быстрее.
// Сколько свежей страницы подмешивается в кадр: больше — короче «шлейф».
const MILKDROP_INJECT = 0.3;
// Множитель движения пресета: меньше единицы — спокойнее оригинала.
const MILKDROP_MOTION = 0.35;
// Сколько краски оседает на шлейфе за кадр. Против MILKDROP_INJECT
// это примерно четверть цвета: страница под окном остаётся видна.
const MILKDROP_COLOR = 0.05;
const FRAME_MS = 1000 / 60;

// Эффекты окон; шейдер лежит в /shaders/<shader или имя эффекта>.wasm.
// backdrop — эффекту нужна подложка: всё, что нарисовано под окном.
// motion — пресет Milkdrop, по полю движения которого течёт подложка;
// hue и mode — оттенок и цветовой эффект шлейфа (см. paint() в milkdrop-warp.frag).
// plot — точечный график на миллион точек (см. Plot/scatter-plot.js).
// animated — картинка меняется во времени, нужен каждый кадр.
// strength — значение u_strength, пока окно появляется (t: 0 → 1).
const EFFECTS = {
  "first-shader": { backdrop: false, animated: true, strength: () => 1 },
  scatter: { plot: true, backdrop: false, animated: false, strength: () => 1 },
  fisheye: { backdrop: true, animated: false, strength: (t) => 0.6 * easeOutBack(t) },
  "broken-glass": { backdrop: true, animated: false, strength: easeOutCubic },
  ripple: { backdrop: true, animated: true, strength: easeOutCubic },
  fire: { backdrop: true, animated: true, strength: easeOutCubic },
  "milkdrop-sherwin": { shader: "milkdrop-warp", motion: "sherwin", hue: 0.0, mode: 0, backdrop: true, animated: true, strength: easeOutCubic },
  "milkdrop-cauldron": { shader: "milkdrop-warp", motion: "cauldron", hue: 0.08, mode: 1, backdrop: true, animated: true, strength: easeOutCubic },
  "milkdrop-spiral": { shader: "milkdrop-warp", motion: "spiral", hue: 0.55, mode: 2, backdrop: true, animated: true, strength: easeOutCubic },
  "milkdrop-harlequin": { shader: "milkdrop-warp", motion: "harlequin", hue: 0.85, mode: 3, backdrop: true, animated: true, strength: easeOutCubic },
  "milkdrop-feathers": { shader: "milkdrop-warp", motion: "feathers", hue: 0.65, mode: 4, backdrop: true, animated: true, strength: easeOutCubic },
  "milkdrop-sunflower": { shader: "milkdrop-warp", motion: "sunflower", hue: 0.15, mode: 5, backdrop: true, animated: true, strength: easeOutCubic },
};

/** Сумма offsetLeft/offsetTop до корня: смещения не учитывают CSS-трансформации. */
function offsetToRoot(element) {
  let x = 0;
  let y = 0;
  for (let node = element; node; node = node.offsetParent) {
    x += node.offsetLeft;
    y += node.offsetTop;
  }
  return { x, y };
}

function offsetWithin(element, ancestor) {
  const a = offsetToRoot(element);
  const b = offsetToRoot(ancestor);
  return { x: a.x - b.x, y: a.y - b.y };
}

/** Матрица DOMMatrix → mat3 для uniform (по столбцам). */
const toMat3 = (m) => new Float32Array([m.a, m.b, 0, m.c, m.d, 0, m.e, m.f, 1]);

/**
 * @param {{ canvas: HTMLCanvasElement, page: HTMLElement, signal?: AbortSignal }} options
 */
export async function createStageRenderer({ canvas, page, signal }) {
  const effectNames = Object.keys(EFFECTS);
  const shaderOf = (name) => EFFECTS[name].shader ?? name;
  const shaderNames = [...new Set(effectNames.map(shaderOf))];
  const [quadSources, transitionSources, particleSources, cardSources, ...shaderSources] = await Promise.all([
    loadShaderSources(assetPath("/shaders/stage-quad.wasm")),
    loadShaderSources(assetPath("/shaders/page-transition.wasm")),
    loadShaderSources(assetPath("/shaders/page-particles.wasm")),
    loadShaderSources(assetPath("/shaders/product-card.wasm")),
    ...shaderNames.map((name) => loadShaderSources(assetPath(`/shaders/${name}.wasm`))),
  ]);
  if (signal?.aborted) return null;

  const gl = canvas.getContext("webgl2", { antialias: false, premultipliedAlpha: true });
  if (!gl) throw new Error("WebGL 2 недоступен в этом браузере");

  const uniforms = (program, names) =>
    Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)]));
  const quad = createProgram(gl, quadSources.vertex, quadSources.fragment);
  const quadU = uniforms(quad, ["u_rect", "u_matrix", "u_region", "u_flipTarget", "u_flipSource", "u_texture"]);
  const sheet = createProgram(gl, transitionSources.vertex, transitionSources.fragment);
  const sheetU = uniforms(sheet, ["u_viewport", "u_grid", "u_mode", "u_progress", "u_direction", "u_face", "u_texture"]);
  const particles = createProgram(gl, particleSources.vertex, particleSources.fragment);
  const particlesU = uniforms(particles, ["u_viewport", "u_columns", "u_cell", "u_pixelRatio", "u_progress", "u_direction", "u_texture"]);
  const cardProgram = createProgram(gl, cardSources.vertex, cardSources.fragment);
  const cardU = uniforms(cardProgram, ["u_rect", "u_region", "u_flipTarget", "u_tilt", "u_lift", "u_hover", "u_mode", "u_texture", "u_effect", "u_pointer"]);

  // У всех эффектов один набор входов; если шейдеру какой-то не нужен,
  // getUniformLocation вернёт null, и WebGL просто проигнорирует запись.
  const programs = Object.fromEntries(
    shaderNames.map((name, i) => {
      const program = createProgram(gl, shaderSources[i].vertex, shaderSources[i].fragment);
      const u = uniforms(program, ["u_page", "u_previous", "u_resolution", "u_time", "u_strength", "u_inject", "u_motion", "u_color", "u_hue", "u_mode"]);
      return [name, { program, u }];
    }),
  );
  const effects = Object.fromEntries(
    effectNames.map((name) => [name, { ...EFFECTS[name], ...programs[shaderOf(name)] }]),
  );

  // --- Сетка Milkdrop -------------------------------------------------------
  // Узлы (48+1)×(36+1), строки сверху вниз — как у butterchurn. Положения узлов
  // общие для всех окон, а «откуда брать кадр» у каждого окна своё.
  const meshNodes = (MESH_WIDTH + 1) * (MESH_HEIGHT + 1);
  const meshScreen = new Float32Array(meshNodes * 2);
  const meshIdentity = new Float32Array(meshNodes * 2);
  for (let iy = 0, i = 0; iy <= MESH_HEIGHT; iy++) {
    for (let ix = 0; ix <= MESH_WIDTH; ix++, i += 2) {
      meshScreen[i] = ix / MESH_WIDTH;
      meshScreen[i + 1] = iy / MESH_HEIGHT;
      // Без движения узел берёт кадр из своего же места (v в Milkdrop растёт вверх).
      meshIdentity[i] = ix / MESH_WIDTH;
      meshIdentity[i + 1] = 1 - iy / MESH_HEIGHT;
    }
  }
  const meshIndices = [];
  for (let iy = 0; iy < MESH_HEIGHT; iy++) {
    for (let ix = 0; ix < MESH_WIDTH; ix++) {
      const a = ix + (MESH_WIDTH + 1) * iy;
      const b = a + MESH_WIDTH + 1;
      meshIndices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const meshScreenBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, meshScreenBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, meshScreen, gl.STATIC_DRAW);
  const meshIndexBuffer = gl.createBuffer();
  const meshIndexCount = meshIndices.length;
  const milkdropProgram = programs["milkdrop-warp"].program;
  const aScreen = gl.getAttribLocation(milkdropProgram, "a_screen");
  const aSource = gl.getAttribLocation(milkdropProgram, "a_source");

  /** VAO окна: общие положения узлов + свой буфер «откуда брать кадр». */
  const createMesh = () => {
    const meshVao = gl.createVertexArray();
    gl.bindVertexArray(meshVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, meshScreenBuffer);
    gl.enableVertexAttribArray(aScreen);
    gl.vertexAttribPointer(aScreen, 2, gl.FLOAT, false, 0, 0);
    const sourceBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sourceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, meshIdentity, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aSource);
    gl.vertexAttribPointer(aSource, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meshIndexBuffer);
    gl.bindVertexArray(vao);
    return { meshVao, sourceBuffer };
  };

  // Вершины считаются из gl_VertexID, но WebGL 2 всё равно ждёт VAO.
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  // Индексы сетки общие для всех окон; общий VAO рисует без индексов,
  // поэтому привязка к нему ничему не мешает.
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meshIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(meshIndices), gl.STATIC_DRAW);
  // Текстуры из DOM приходят с прозрачностью — храним их premultiplied.
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

  const createTexture = () => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  };

  // --- Учёт ресурсов ----------------------------------------------------------
  // Для слайда «Сколько это стоит»: сколько видеопамяти заняли наши текстуры
  // и буферы, сколько кадров нарисовано и сколько времени ушло на наш код.
  /** @type {Map<unknown, number>} — ресурс → байт видеопамяти */
  const memory = new Map();
  const stats = { frames: 0, cpuMs: 0, snapshots: 0, snapshotMs: 0 };

  const allocate = (texture, width, height) => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    memory.set(texture, width * height * 4);
  };

  const freeTexture = (texture) => {
    memory.delete(texture);
    gl.deleteTexture(texture);
  };

  /** Снимок элемента в привязанную текстуру — с учётом, сколько их и сколько стоят. */
  const snapshot = (element, options) => {
    const start = performance.now();
    gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, element, options);
    stats.snapshots++;
    stats.snapshotMs += performance.now() - start;
  };

  /** Текстура + framebuffer: сюда рисуют эффекты и подложка линзы. */
  const createTarget = () => {
    const texture = createTexture();
    const framebuffer = gl.createFramebuffer();
    return { texture, framebuffer, width: 0, height: 0 };
  };

  const resizeTarget = (target, width, height) => {
    if (target.width === width && target.height === height) return;
    target.width = width;
    target.height = height;
    allocate(target.texture, width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target.texture, 0);
  };

  const deleteTarget = (target) => {
    freeTexture(target.texture);
    gl.deleteFramebuffer(target.framebuffer);
  };

  // --- Геометрия для хит-теста -------------------------------------------
  // По спецификации положение задаётся canvasTransform, но Chrome 154 его
  // игнорирует, зато учитывает CSS-трансформацию элемента (рисованию она не
  // мешает: снимок берётся до трансформаций). Проверяем, что работает.
  let geometryMode = null;
  const detectGeometryMode = () => {
    canvas.updateElementGeometry(page, { canvasTransform: new DOMMatrix().translate(0, 12345) });
    const moved = Math.abs(page.getBoundingClientRect().y - 12345) < 1;
    geometryMode = moved ? "canvasTransform" : "cssTransform";
  };

  // Смена CSS-трансформации Chrome считает изменением элемента и заново
  // отдаёт его снимок. Пока окно тащат, указатель захвачен заголовком и
  // хит-тест не нужен — обновляем положение, когда окно остановилось.
  // zoom — CSS zoom элемента: сдвиг в его transform браузер умножает на zoom.
  const applyGeometry = (element, matrix, cache, settled = true, zoom = 1) => {
    if (geometryMode === "canvasTransform") {
      canvas.updateElementGeometry(element, { canvasTransform: matrix });
      return;
    }
    const { a, b, c, d, e, f } = matrix;
    const transform = new DOMMatrix([a, b, c, d, e / zoom, f / zoom]).toString();
    if (cache.transform !== transform && (settled || !cache.transform)) {
      element.style.transformOrigin = "0 0";
      element.style.transform = transform;
      cache.transform = transform;
    }
    // Каждый вызов кладёт элемент наверх стека хит-теста — вызываем по z-порядку.
    canvas.updateElementGeometry(element, {});
  };

  // --- Страница -----------------------------------------------------------
  const pageTexture = createTexture();
  // fresh — в текстуре страницы её последняя отрисовка.
  const pageState = { size: "", width: 0, height: 0, fresh: false, transform: "" };
  // Страница вместе с карточками товаров (если они на экране) — с ней
  // работают переходы и окна. И то, что сцена рисует как страницу:
  // её саму или кадр перехода.
  let pageBase = pageTexture;
  let pageLayer = pageTexture;

  const canvasResizeObserver = new ResizeObserver(([entry]) => {
    const box = entry.devicePixelContentBoxSize?.[0];
    const dpr = window.devicePixelRatio;
    canvas.width = Math.max(1, box ? box.inlineSize : Math.round(entry.contentRect.width * dpr));
    canvas.height = Math.max(1, box ? box.blockSize : Math.round(entry.contentRect.height * dpr));
    canvas.requestPaint();
  });
  canvasResizeObserver.observe(canvas, { box: "device-pixel-content-box" });

  // --- Переход между слайдами ---------------------------------------------
  // Слайд до листания — копия текстуры страницы, после — сама текстура.
  // Кадр перехода рисуется в текстуру размером с экран, и дальше сцена
  // работает с ней как со страницей: окна и линзы видят переход под собой.
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pageFramebuffer = gl.createFramebuffer();
  const fromTarget = createTarget();
  const transitionTarget = createTarget();
  // Листу и кубу нужна глубина: загиб закрывает сам себя, грани — друг друга.
  const transitionDepth = gl.createRenderbuffer();
  /** @type {{ kind: keyof typeof TRANSITIONS, direction: number, startedAt: number } | null} */
  let transition = null;

  const resizeTransitionTarget = (width, height) => {
    if (transitionTarget.width === width && transitionTarget.height === height) return;
    resizeTarget(transitionTarget, width, height);
    gl.bindRenderbuffer(gl.RENDERBUFFER, transitionDepth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
    memory.set(transitionDepth, width * height * 2);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, transitionDepth);
  };

  /**
   * Сменить слайд через show, показав переход kind; direction — вперёд (1)
   * или назад (−1). false — перехода не будет (уменьшение движения, сцена
   * ещё пуста), show не вызван: листайте сами.
   */
  const transitionTo = (kind, direction, show) => {
    if (reducedMotion || !TRANSITIONS[kind] || !pageState.width || !direction) return false;

    // Снимок «до» — пока на странице ещё старый слайд.
    const { width, height } = pageState;
    resizeTarget(fromTarget, width, height);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, pageFramebuffer);
    gl.framebufferTexture2D(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pageBase, 0);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fromTarget.framebuffer);
    gl.blitFramebuffer(0, 0, width, height, 0, 0, width, height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Сам слайд меняется сразу: новый уже кликается и рисуется в текстуру,
    // а переход только показывает путь.
    transition = { kind, direction, startedAt: performance.now() };
    show();
    canvas.requestPaint();
    return true;
  };

  /** Сетка листа или куба: u_grid клеток, по 6 вершин на клетку. */
  const drawSheet = (texture, mode, [columns, rows], face = 0) => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(sheetU.u_mode, mode);
    gl.uniform2i(sheetU.u_grid, columns, rows);
    gl.uniform1f(sheetU.u_face, face);
    gl.drawArrays(gl.TRIANGLES, 0, columns * rows * 6);
  };

  /** Кадр перехода в transitionTarget; t — доля прошедшего времени. */
  const renderTransition = ({ kind, direction }, t, viewport, dpr) => {
    const { width, height } = pageState;
    const { grid } = TRANSITIONS[kind];
    resizeTransitionTarget(width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, transitionTarget.framebuffer);
    gl.viewport(0, 0, width, height);
    gl.clearColor(...(kind === "cube" ? DESK : [0, 0, 0, 0]));
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0);
    const from = fromTarget.texture;
    const to = pageBase;

    if (kind === "particles") {
      // Новая страница лежит плоско, старая рассыпается поверх неё.
      gl.useProgram(quad);
      gl.uniform4f(quadU.u_region, 0, 0, viewport.width, viewport.height);
      gl.uniform1f(quadU.u_flipTarget, 1);
      gl.uniform1i(quadU.u_texture, 0);
      drawQuad(to, { x: 0, y: 0, width: viewport.width, height: viewport.height }, identity, false);

      const columns = Math.ceil(viewport.width / PARTICLE_CELL);
      const rows = Math.ceil(viewport.height / PARTICLE_CELL);
      gl.useProgram(particles);
      gl.uniform2f(particlesU.u_viewport, viewport.width, viewport.height);
      gl.uniform1i(particlesU.u_columns, columns);
      gl.uniform1f(particlesU.u_cell, PARTICLE_CELL);
      gl.uniform1f(particlesU.u_pixelRatio, dpr);
      gl.uniform1f(particlesU.u_progress, t);
      gl.uniform1f(particlesU.u_direction, direction);
      gl.uniform1i(particlesU.u_texture, 0);
      gl.bindTexture(gl.TEXTURE_2D, from);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.POINTS, 0, columns * rows);
      gl.disable(gl.BLEND);
      return;
    }

    gl.useProgram(sheet);
    gl.uniform2f(sheetU.u_viewport, viewport.width, viewport.height);
    gl.uniform1f(sheetU.u_direction, direction);
    gl.uniform1i(sheetU.u_texture, 0);
    const eased = easeInOutCubic(t);

    if (kind === "flip") {
      // Назад — та же анимация задом наперёд: предыдущая страница
      // опускается на текущую, как перелистнутый обратно лист.
      const [curled, under] = direction > 0 ? [from, to] : [to, from];
      gl.uniform1f(sheetU.u_progress, direction > 0 ? eased : 1 - eased);
      drawSheet(under, 0, grid);
      gl.enable(gl.DEPTH_TEST);
      drawSheet(curled, 1, grid);
      gl.disable(gl.DEPTH_TEST);
      return;
    }

    gl.uniform1f(sheetU.u_progress, eased);
    gl.enable(gl.DEPTH_TEST);
    drawSheet(from, 2, grid, 0);
    drawSheet(to, 2, grid, 1);
    gl.disable(gl.DEPTH_TEST);
  };

  // --- Карточки товаров -----------------------------------------------------
  // Карточка — свой drawable-слой, как окно, а место ей держит пустой
  // блок в вёрстке слайда (anchor). Сцена ставит карточку туда, где anchor,
  // наклоняет её за указателем и рисует шейдерный эффект поверх снимка.
  /** @type {any[]} */
  const cards = [];
  // Страница с карточками — текстура размером с экран.
  const cardsTarget = createTarget();

  /**
   * @param {{ element: HTMLElement, anchor: HTMLElement, effect: keyof typeof CARD_EFFECTS }} options
   */
  const addCard = ({ element, anchor, effect }) => {
    const c = {
      element,
      anchor,
      effect: CARD_EFFECTS[effect] ?? 0,
      texture: createTexture(),
      textureSize: "",
      geometry: { transform: "" },
      rect: { x: 0, y: 0, width: 0, height: 0 },
      visible: false,
      zoom: 1,
      hovered: false,
      pointer: { x: 0.5, y: 0.5 },
      target: { x: 0.5, y: 0.5 },
      tilt: { x: 0, y: 0 },
      hover: 0,
    };
    cards.push(c);
    canvas.requestPaint();
    return {
      /** Указатель над карточкой: x и y от 0 до 1. */
      setPointer(x, y) {
        c.target = { x, y };
        canvas.requestPaint();
      },
      setHovered(hovered) {
        c.hovered = hovered;
        if (!hovered) c.target = { x: 0.5, y: 0.5 };
        canvas.requestPaint();
      },
      remove() {
        const index = cards.indexOf(c);
        if (index >= 0) cards.splice(index, 1);
        freeTexture(c.texture);
        canvas.requestPaint();
      },
    };
  };

  /** Ведёт наклон и «приподнимание» к цели. true — анимация ещё идёт. */
  const animateCard = (c, dt) => {
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt / CARD_EASE_MS);
    c.pointer.x += (c.target.x - c.pointer.x) * k;
    c.pointer.y += (c.target.y - c.pointer.y) * k;
    c.hover += ((c.hovered ? 1 : 0) - c.hover) * k;
    // Сторона под указателем «продавливается» — уходит от зрителя.
    const tilt = reducedMotion || !c.hovered ? 0 : CARD_TILT;
    c.tilt.x = -(c.pointer.y - 0.5) * 2 * tilt;
    c.tilt.y = (c.pointer.x - 0.5) * 2 * tilt;
    const settled =
      Math.abs(c.target.x - c.pointer.x) < 1e-3 &&
      Math.abs(c.target.y - c.pointer.y) < 1e-3 &&
      Math.abs((c.hovered ? 1 : 0) - c.hover) < 1e-3;
    return !settled;
  };

  /** Тень и сама карточка; цель и участок экрана уже выбраны. */
  const drawCard = (c, region, flipTarget) => {
    gl.useProgram(cardProgram);
    gl.uniform4f(cardU.u_region, region.x, region.y, region.width, region.height);
    gl.uniform1f(cardU.u_flipTarget, flipTarget ? 1 : 0);
    gl.uniform4f(cardU.u_rect, c.rect.x, c.rect.y, c.rect.width, c.rect.height);
    gl.uniform2f(cardU.u_tilt, c.tilt.x, c.tilt.y);
    gl.uniform1f(cardU.u_lift, 1 + 0.04 * c.hover);
    gl.uniform1f(cardU.u_hover, c.hover);
    gl.uniform2f(cardU.u_pointer, c.pointer.x, c.pointer.y);
    gl.uniform1i(cardU.u_effect, c.effect);
    gl.uniform1i(cardU.u_texture, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, c.texture);
    gl.uniform1i(cardU.u_mode, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.uniform1i(cardU.u_mode, 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  // --- Окна ----------------------------------------------------------------
  /** @type {any[]} — в порядке отрисовки: последний сверху. */
  const windows = [];

  const measureWindow = (w) => {
    const pad = offsetWithin(w.element, w.shell);
    const content = offsetWithin(w.content, w.shell);
    w.layout = {
      shellWidth: w.shell.offsetWidth,
      shellHeight: w.shell.offsetHeight,
      pad,
      width: w.element.offsetWidth,
      height: w.element.offsetHeight,
      content: { x: content.x, y: content.y, width: w.content.offsetWidth, height: w.content.offsetHeight },
    };
  };

  /** Матрица «слой окна → экран»: сдвиг, наклон и масштаб вокруг центра окна. */
  const windowMatrix = (w, dpr) => {
    const { pad, width, height } = w.layout;
    const cx = pad.x + width / 2;
    const cy = pad.y + height / 2;
    // Без наклона окно стоит ровно по пикселям экрана — текст остаётся чётким.
    const snap = (value) => Math.round(value * dpr) / dpr;
    return new DOMMatrix()
      .translate(snap(w.x - pad.x), snap(w.y - pad.y))
      .translate(cx, cy)
      .rotate(w.tilt / DEG)
      .scale(w.scale)
      .translate(-cx, -cy);
  };

  // Данные графика грузятся в видеопамять один раз, при первом окне с ним.
  let plot = null;

  /**
   * @param {{
   *   shell: HTMLElement, element: HTMLElement, content: HTMLElement,
   *   effect: string, flat: boolean,
   *   view?: { cx: number, cy: number, scale: number } | null,
   * }} options
   */
  const addWindow = ({ shell, element, content, effect, flat, view = null }) => {
    const fx = effects[effect];
    if (!fx) throw new Error(`Неизвестный эффект окна: ${effect}`);
    // Окна с подложкой не наклоняются: их область на экране — прямоугольник,
    // и подложка совпадает со страницей под ними пиксель в пиксель.
    const straight = flat || fx.backdrop;
    const w = {
      shell,
      element,
      content,
      effect,
      flat: straight,
      x: 0,
      y: 0,
      tilt: straight ? 0 : TILT,
      scale: 1,
      dragging: false,
      // Развёрнутое на весь экран окно стоит ровно, без наклона.
      maximized: false,
      animating: false,
      createdAt: performance.now(),
      texture: createTexture(),
      textureSize: "",
      contentTarget: createTarget(),
      backdropTarget: fx.backdrop ? createTarget() : null,
      // Milkdrop: прошлый кадр окна, сетка и источник движения (грузится позже).
      feedbackTarget: fx.motion ? createTarget() : null,
      mesh: fx.motion ? createMesh() : null,
      motion: null,
      // Зум и сдвиг графика: меняет окно по колесу и перетаскиванию.
      view,
      removed: false,
      geometry: { transform: "" },
      layout: null,
      matrix: new DOMMatrix(),
    };
    measureWindow(w);
    windows.push(w);
    canvas.requestPaint();

    if (fx.motion) {
      createMilkdropMotion(fx.motion)
        .then((motion) => {
          if (w.removed) motion.destroy();
          else w.motion = motion;
        })
        .catch((error) => console.error("Пресет Milkdrop не загрузился:", error));
    }

    return {
      get position() {
        return { x: w.x, y: w.y };
      },
      moveTo(x, y) {
        w.x = x;
        w.y = y;
        canvas.requestPaint();
      },
      /** Содержимое окна изменилось (например, зум графика) — перерисовать. */
      refresh() {
        canvas.requestPaint();
      },
      setDragging(dragging) {
        w.dragging = dragging;
        canvas.requestPaint();
      },
      setMaximized(maximized) {
        w.maximized = maximized;
        canvas.requestPaint();
      },
      raise() {
        const index = windows.indexOf(w);
        if (index === windows.length - 1) return;
        windows.splice(index, 1);
        windows.push(w);
        canvas.requestPaint();
      },
      remove() {
        const index = windows.indexOf(w);
        if (index >= 0) windows.splice(index, 1);
        releaseWindow(w);
        canvas.requestPaint();
      },
    };
  };

  const releaseWindow = (w) => {
    w.removed = true;
    w.motion?.destroy();
    freeTexture(w.texture);
    deleteTarget(w.contentTarget);
    if (w.backdropTarget) deleteTarget(w.backdropTarget);
    if (w.feedbackTarget) deleteTarget(w.feedbackTarget);
    if (w.mesh) {
      gl.deleteVertexArray(w.mesh.meshVao);
      gl.deleteBuffer(w.mesh.sourceBuffer);
    }
  };

  /** Плавно ведёт наклон и масштаб к цели. Возвращает true, пока анимация идёт. */
  const animateWindow = (w, dt) => {
    const straight = w.flat || w.maximized;
    const targetTilt = straight ? 0 : w.dragging ? DRAG_TILT : TILT;
    const targetScale = !straight && w.dragging ? DRAG_SCALE : 1;
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt / EASE_MS);
    w.tilt += (targetTilt - w.tilt) * k;
    w.scale += (targetScale - w.scale) * k;
    const settled = Math.abs(targetTilt - w.tilt) < 0.001 * DEG && Math.abs(targetScale - w.scale) < 0.0001;
    if (settled) {
      w.tilt = targetTilt;
      w.scale = targetScale;
    }
    return !settled;
  };

  // --- Отрисовка -------------------------------------------------------------
  const drawQuad = (texture, rect, matrix, flipSource) => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform4f(quadU.u_rect, rect.x, rect.y, rect.width, rect.height);
    gl.uniformMatrix3fv(quadU.u_matrix, false, toMat3(matrix));
    gl.uniform1f(quadU.u_flipSource, flipSource ? 1 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const identity = new DOMMatrix();

  /** Страница и окна [0, count) в участок экрана region. */
  const drawScene = (count, region, flipTarget, viewport) => {
    gl.useProgram(quad);
    gl.uniform4f(quadU.u_region, region.x, region.y, region.width, region.height);
    gl.uniform1f(quadU.u_flipTarget, flipTarget ? 1 : 0);
    gl.uniform1i(quadU.u_texture, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    drawQuad(pageLayer, { x: 0, y: 0, width: viewport.width, height: viewport.height }, identity, false);
    for (let i = 0; i < count; i++) {
      const w = windows[i];
      const { shellWidth, shellHeight, content } = w.layout;
      drawQuad(w.texture, { x: 0, y: 0, width: shellWidth, height: shellHeight }, w.matrix, false);
      drawQuad(w.contentTarget.texture, content, w.matrix, true);
    }
    gl.disable(gl.BLEND);
  };

  /** Содержимое окна i: эффект рисуется в свою текстуру размером с область. */
  const renderContent = (i, now, dpr, viewport) => {
    const w = windows[i];
    const { content } = w.layout;
    const width = Math.max(1, Math.round(content.width * dpr));
    const height = Math.max(1, Math.round(content.height * dpr));
    resizeTarget(w.contentTarget, width, height);

    const fx = effects[w.effect];

    if (fx.backdrop) {
      // Подложка: всё, что лежит под окном, — страница и окна ниже.
      resizeTarget(w.backdropTarget, width, height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, w.backdropTarget.framebuffer);
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const origin = w.matrix.transformPoint(new DOMPoint(content.x, content.y));
      drawScene(i, { x: origin.x, y: origin.y, width: content.width, height: content.height }, true, viewport);
    }

    const progress = reducedMotion ? 1 : Math.min(1, (now - w.createdAt) / INTRO_MS);

    if (fx.plot) {
      if (!plot) {
        plot = createScatterRenderer(gl, fx.program);
        // Позиции — два float на точку, сегмент — один байт.
        memory.set(plot, POINT_COUNT * (2 * 4 + 1));
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, w.contentTarget.framebuffer);
      gl.viewport(0, 0, width, height);
      plot.draw({ width, height, view: w.view, pixelRatio: dpr });
      gl.bindVertexArray(vao);
      return false;
    }

    if (fx.motion) {
      // Обратная связь, как в Milkdrop: прошлый кадр течёт по полю движения
      // пресета, а сверху подмешивается свежая страница. Новый кадр пишем во
      // вторую текстуру, и показывать будем уже его.
      [w.contentTarget, w.feedbackTarget] = [w.feedbackTarget, w.contentTarget];
      resizeTarget(w.contentTarget, width, height);
      resizeTarget(w.feedbackTarget, width, height);

      // Пока движок грузится, узлы берут кадр из своего же места — видна страница.
      w.motion?.setAspect(content.width / content.height);
      const sources = w.motion?.step(now);
      if (sources) {
        gl.bindBuffer(gl.ARRAY_BUFFER, w.mesh.sourceBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, sources);
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, w.contentTarget.framebuffer);
      gl.viewport(0, 0, width, height);
      gl.useProgram(fx.program);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, w.feedbackTarget.texture);
      gl.uniform1i(fx.u.u_previous, 1);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, w.backdropTarget.texture);
      gl.uniform1i(fx.u.u_page, 0);
      // Сколько «кадров по 60 Гц» прошло с прошлой отрисовки окна.
      const frames = Math.min(4, (now - (w.lastMotionAt ?? now - FRAME_MS)) / FRAME_MS);
      w.lastMotionAt = now;
      // Свежая страница копится по времени, а не по кадрам; при открытии окна
      // страница начинает течь постепенно.
      const inject = sources ? 1 - ((1 - MILKDROP_INJECT) ** frames) * fx.strength(progress) : 1;
      gl.uniform1f(fx.u.u_inject, inject);
      gl.uniform1f(fx.u.u_motion, MILKDROP_MOTION * frames);
      gl.uniform1f(fx.u.u_color, sources ? 1 - (1 - MILKDROP_COLOR) ** frames : 0);
      gl.uniform1f(fx.u.u_hue, fx.hue);
      gl.uniform1i(fx.u.u_mode, fx.mode);
      gl.uniform1f(fx.u.u_time, now / 1000);
      gl.bindVertexArray(w.mesh.meshVao);
      gl.drawElements(gl.TRIANGLES, meshIndexCount, gl.UNSIGNED_SHORT, 0);
      gl.bindVertexArray(vao);
      return true;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, w.contentTarget.framebuffer);
    gl.viewport(0, 0, width, height);
    gl.useProgram(fx.program);
    if (fx.backdrop) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, w.backdropTarget.texture);
      gl.uniform1i(fx.u.u_page, 0);
    }
    gl.uniform2f(fx.u.u_resolution, width, height);
    // При «уменьшении движения» время стоит: огонь и вода замирают.
    gl.uniform1f(fx.u.u_time, reducedMotion ? 1 : now / 1000);
    gl.uniform1f(fx.u.u_strength, fx.strength(progress));
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Следующий кадр нужен, пока окно появляется или эффект живёт во времени.
    return progress < 1 || (fx.animated && !reducedMotion);
  };

  // --- Скриншот ------------------------------------------------------------
  // Кадр целиком уже в WebGL — с окнами, линзами и карточками. Его можно
  // прочитать readPixels, но только сразу после отрисовки, в том же
  // обработчике paint: без preserveDrawingBuffer буфер потом очищается.
  /** @type {((blob: Blob | null) => void)[]} */
  let captureRequests = [];

  /** Следующий кадр — в PNG, в пикселях устройства. */
  const capture = () =>
    new Promise((resolve) => {
      captureRequests.push(resolve);
      canvas.requestPaint();
    });

  const readFrame = () => {
    const { width, height } = canvas;
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const out = document.createElement("canvas");
    out.width = width;
    out.height = height;
    const context = out.getContext("2d");
    const image = context.createImageData(width, height);
    // В WebGL строки идут снизу вверх, в картинке — сверху вниз.
    const row = width * 4;
    for (let y = 0; y < height; y++) {
      image.data.set(pixels.subarray((height - 1 - y) * row, (height - y) * row), y * row);
    }
    context.putImageData(image, 0, 0);
    return new Promise((resolve) => out.toBlob(resolve, "image/png"));
  };

  let lastFrame = performance.now();

  const onPaint = (event) => {
    if (canvas.width < 2 || canvas.height < 2) return;
    if (!geometryMode) detectGeometryMode();

    const now = performance.now();
    const frameStart = now;
    const dt = Math.min(100, now - lastFrame);
    lastFrame = now;
    const changed = new Set(event.changedElements ?? []);
    const viewport = { width: canvas.clientWidth, height: canvas.clientHeight };
    const dpr = canvas.width / viewport.width;
    let animating = false;

    // 1. Страница (открытый слайд) → текстура размером с экран — только
    //    когда браузер её перерисовал: листание, ховер, новый текст.
    const size = `${canvas.width}x${canvas.height}`;
    if (pageState.size !== size) {
      pageState.size = size;
      pageState.width = canvas.width;
      pageState.height = canvas.height;
      pageState.fresh = false;
      allocate(pageTexture, canvas.width, canvas.height);
    }
    if (!pageState.fresh || changed.has(page)) {
      pageState.fresh = true;
      gl.bindTexture(gl.TEXTURE_2D, pageTexture);
      // Страница — ровно экран, поэтому снимаем её целиком: без sx/sy.
      snapshot(page, { width: canvas.width, height: canvas.height });
    }

    // 1б. Карточки товаров: снимок — при изменении (ховер кнопки, счётчик),
    //     место — там, где их пустой блок в вёрстке слайда.
    let cardsOnScreen = false;
    for (const c of cards) {
      // Блок на закрытом слайде (display: none) — карточку не показываем,
      // и она не должна ловить клики: visibility убирает её из хит-теста.
      const visible = c.anchor.offsetParent !== null;
      if (visible !== c.visible) {
        c.visible = visible;
        c.element.style.visibility = visible ? "" : "hidden";
      }
      if (!visible) continue;
      // Слайд, который не влез в экран, уменьшен CSS zoom. Карточка лежит
      // вне слайда — в canvas, поэтому получает тот же zoom, что и её место.
      const zoom = c.anchor.currentCSSZoom ?? 1;
      if (zoom !== c.zoom) {
        c.zoom = zoom;
        c.element.style.zoom = zoom === 1 ? "" : String(zoom);
      }
      // Страница не сдвинута (прокрутки нет), поэтому место на экране —
      // просто getBoundingClientRect, уже с учётом zoom.
      const box = c.anchor.getBoundingClientRect();
      c.rect = { x: box.x, y: box.y, width: box.width, height: box.height };
      cardsOnScreen = true;
      if (changed.has(c.element) || !c.textureSize) {
        const width = Math.max(1, Math.round(c.rect.width * dpr));
        const height = Math.max(1, Math.round(c.rect.height * dpr));
        const textureSize = `${width}x${height}`;
        if (c.textureSize !== textureSize) {
          c.textureSize = textureSize;
          allocate(c.texture, width, height);
        }
        gl.bindTexture(gl.TEXTURE_2D, c.texture);
        try {
          snapshot(c.element, { width, height });
        } catch {
          c.textureSize = "";
          animating = true;
        }
      }
      if (animateCard(c, dt)) animating = true;
    }

    // Карточки впекаются в страницу: дальше переходы и линзы видят их
    // как её часть. Нет карточек на экране — лишнего прохода тоже нет.
    pageBase = pageTexture;
    if (cardsOnScreen) {
      resizeTarget(cardsTarget, canvas.width, canvas.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, cardsTarget.framebuffer);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const region = { x: 0, y: 0, ...viewport };
      gl.useProgram(quad);
      gl.uniform4f(quadU.u_region, 0, 0, viewport.width, viewport.height);
      gl.uniform1f(quadU.u_flipTarget, 1);
      gl.uniform1i(quadU.u_texture, 0);
      gl.activeTexture(gl.TEXTURE0);
      drawQuad(pageTexture, region, identity, false);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      for (const c of cards) if (c.visible && c.textureSize) drawCard(c, region, true);
      gl.disable(gl.BLEND);
      pageBase = cardsTarget.texture;
    }

    // 2. Рамки окон: браузер перерисовывает их только при изменениях
    //    (наведение на крестик, фокус), а не при перетаскивании.
    for (const w of windows) {
      if (changed.has(w.shell) || !w.textureSize) {
        measureWindow(w);
        const width = Math.max(1, Math.round(w.layout.shellWidth * dpr));
        const height = Math.max(1, Math.round(w.layout.shellHeight * dpr));
        const textureSize = `${width}x${height}`;
        if (w.textureSize !== textureSize) {
          w.textureSize = textureSize;
          allocate(w.texture, width, height);
        }
        gl.bindTexture(gl.TEXTURE_2D, w.texture);
        try {
          snapshot(w.shell, { width, height });
        } catch {
          // Снимок нового окна ещё не записан — попробуем в следующем кадре.
          w.textureSize = "";
          animating = true;
        }
      }
      w.animating = animateWindow(w, dt);
      if (w.animating) animating = true;
      w.matrix = windowMatrix(w, dpr);
    }

    // 3. Где элемент нарисован — там он и кликается. Порядок вызовов = z-порядок.
    applyGeometry(page, identity, pageState);
    // Карточка кликается без наклона: он не больше 14°, и кнопка остаётся под указателем.
    for (const c of cards) {
      if (c.visible) applyGeometry(c.element, new DOMMatrix().translate(c.rect.x, c.rect.y), c.geometry, true, c.zoom);
    }
    for (const w of windows) applyGeometry(w.shell, w.matrix, w.geometry, !w.dragging && !w.animating);

    // 4. Переход между слайдами подменяет страницу своим кадром.
    pageLayer = pageBase;
    if (transition) {
      const t = (now - transition.startedAt) / TRANSITIONS[transition.kind].duration;
      if (t < 1) {
        renderTransition(transition, t, viewport, dpr);
        pageLayer = transitionTarget.texture;
        animating = true;
      } else {
        transition = null;
      }
    }

    // 5. Содержимое окон снизу вверх: линза видит уже готовые окна под собой.
    for (let i = 0; i < windows.length; i++) {
      if (renderContent(i, now, dpr, viewport)) animating = true;
    }

    // 6. Кадр целиком.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    drawScene(windows.length, { x: 0, y: 0, ...viewport }, false, viewport);

    if (captureRequests.length) {
      const requests = captureRequests;
      captureRequests = [];
      readFrame().then((blob) => requests.forEach((resolve) => resolve(blob)));
    }

    stats.frames++;
    stats.cpuMs += performance.now() - frameStart;
    if (animating) canvas.requestPaint();
  };

  canvas.addEventListener("paint", onPaint);
  canvas.requestPaint();

  return {
    canvas,
    addWindow,
    addCard,
    transitionTo,
    capture,
    /** Счётчики с момента запуска сцены; скорость — по разнице двух вызовов. */
    getStats() {
      let gpuBytes = canvas.width * canvas.height * 4;  // сам буфер canvas
      for (const bytes of memory.values()) gpuBytes += bytes;
      return { ...stats, gpuBytes };
    },
    destroy() {
      canvas.removeEventListener("paint", onPaint);
      for (const resolve of captureRequests) resolve(null);
      captureRequests = [];
      canvasResizeObserver.disconnect();
      for (const w of windows) releaseWindow(w);
      windows.length = 0;
      for (const c of cards) freeTexture(c.texture);
      cards.length = 0;
      deleteTarget(cardsTarget);
      gl.deleteBuffer(meshScreenBuffer);
      plot?.dispose();
      gl.deleteBuffer(meshIndexBuffer);
      freeTexture(pageTexture);
      gl.deleteFramebuffer(pageFramebuffer);
      deleteTarget(fromTarget);
      deleteTarget(transitionTarget);
      gl.deleteRenderbuffer(transitionDepth);
      memory.clear();
      gl.deleteVertexArray(vao);
      gl.deleteProgram(quad);
      gl.deleteProgram(sheet);
      gl.deleteProgram(particles);
      gl.deleteProgram(cardProgram);
      for (const { program } of Object.values(programs)) gl.deleteProgram(program);
    },
  };
}
