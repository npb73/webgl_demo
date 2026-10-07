// Сцена: вся страница и окна поверх неё рисуются одним WebGL-контекстом.
//
// Страница и окна — drawable-потомки <canvas layoutsubtree>. Браузер их
// верстает и отдаёт их отрисовку в текстуры (HTML-in-Canvas), а мы сами
// решаем, где и как их показать. Поэтому окно двигается сменой матрицы,
// без перерисовки DOM, а линза видит всё, что нарисовано под ней.

import { createProgram } from "../../lib/webgl/program";
import { loadShaderSources } from "../../lib/webgl/shader-wasm";
import { createMilkdropMotion, MESH_HEIGHT, MESH_WIDTH } from "../Milkdrop/milkdrop-motion";
import { createScatterRenderer } from "../Plot/scatter-plot";

const INTRO_MS = 700;
const DEG = Math.PI / 180;
const TILT = -0.6 * DEG;
const DRAG_TILT = 0.4 * DEG;
const DRAG_SCALE = 1.01;
// За сколько миллисекунд наклон и масштаб окна проходят ~63% пути к цели.
const EASE_MS = 60;

const easeOutBack = (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
// Milkdrop, всё в пересчёте на кадр при 60 Гц — чтобы на 120-герцовых
// экранах страница не текла вдвое быстрее.
// Сколько свежей страницы подмешивается в кадр: больше — короче «шлейф».
const MILKDROP_INJECT = 0.07;
// Множитель движения пресета: меньше единицы — спокойнее оригинала.
const MILKDROP_MOTION = 0.7;
const FRAME_MS = 1000 / 60;

// Эффекты окон; шейдер лежит в /shaders/<shader или имя эффекта>.wasm.
// backdrop — эффекту нужна подложка: всё, что нарисовано под окном.
// motion — пресет Milkdrop, по полю движения которого течёт подложка.
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
  "milkdrop-sherwin": { shader: "milkdrop-warp", motion: "sherwin", backdrop: true, animated: true, strength: easeOutCubic },
  "milkdrop-cauldron": { shader: "milkdrop-warp", motion: "cauldron", backdrop: true, animated: true, strength: easeOutCubic },
  "milkdrop-spiral": { shader: "milkdrop-warp", motion: "spiral", backdrop: true, animated: true, strength: easeOutCubic },
  "milkdrop-harlequin": { shader: "milkdrop-warp", motion: "harlequin", backdrop: true, animated: true, strength: easeOutCubic },
  "milkdrop-feathers": { shader: "milkdrop-warp", motion: "feathers", backdrop: true, animated: true, strength: easeOutCubic },
  "milkdrop-sunflower": { shader: "milkdrop-warp", motion: "sunflower", backdrop: true, animated: true, strength: easeOutCubic },
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
 * @param {{ canvas: HTMLCanvasElement, page: HTMLElement, spacer: HTMLElement, signal?: AbortSignal }} options
 */
export async function createStageRenderer({ canvas, page, spacer, signal }) {
  const effectNames = Object.keys(EFFECTS);
  const shaderOf = (name) => EFFECTS[name].shader ?? name;
  const shaderNames = [...new Set(effectNames.map(shaderOf))];
  const [quadSources, ...shaderSources] = await Promise.all([
    loadShaderSources("/shaders/stage-quad.wasm"),
    ...shaderNames.map((name) => loadShaderSources(`/shaders/${name}.wasm`)),
  ]);
  if (signal?.aborted) return null;

  const gl = canvas.getContext("webgl2", { antialias: false, premultipliedAlpha: true });
  if (!gl) throw new Error("WebGL 2 недоступен в этом браузере");

  const uniforms = (program, names) =>
    Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)]));
  const quad = createProgram(gl, quadSources.vertex, quadSources.fragment);
  const quadU = uniforms(quad, ["u_rect", "u_matrix", "u_region", "u_flipTarget", "u_flipSource", "u_texture"]);

  // У всех эффектов один набор входов; если шейдеру какой-то не нужен,
  // getUniformLocation вернёт null, и WebGL просто проигнорирует запись.
  const programs = Object.fromEntries(
    shaderNames.map((name, i) => {
      const program = createProgram(gl, shaderSources[i].vertex, shaderSources[i].fragment);
      const u = uniforms(program, ["u_page", "u_previous", "u_resolution", "u_time", "u_strength", "u_inject", "u_motion"]);
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

  const allocate = (texture, width, height) => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
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
    gl.deleteTexture(target.texture);
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
  const applyGeometry = (element, matrix, cache, settled = true) => {
    if (geometryMode === "canvasTransform") {
      canvas.updateElementGeometry(element, { canvasTransform: matrix });
      return;
    }
    const transform = matrix.toString();
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
  const pageState = { size: "", scrollY: Number.NaN, transform: "" };

  const pageResizeObserver = new ResizeObserver(() => {
    spacer.style.height = `${page.offsetHeight}px`;
  });
  pageResizeObserver.observe(page);

  const canvasResizeObserver = new ResizeObserver(([entry]) => {
    const box = entry.devicePixelContentBoxSize?.[0];
    const dpr = window.devicePixelRatio;
    canvas.width = Math.max(1, box ? box.inlineSize : Math.round(entry.contentRect.width * dpr));
    canvas.height = Math.max(1, box ? box.blockSize : Math.round(entry.contentRect.height * dpr));
    canvas.requestPaint();
  });
  canvasResizeObserver.observe(canvas, { box: "device-pixel-content-box" });

  const onScroll = () => canvas.requestPaint();
  window.addEventListener("scroll", onScroll, { passive: true });

  // --- Окна ----------------------------------------------------------------
  /** @type {any[]} — в порядке отрисовки: последний сверху. */
  const windows = [];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    gl.deleteTexture(w.texture);
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
    const targetTilt = w.flat ? 0 : w.dragging ? DRAG_TILT : TILT;
    const targetScale = !w.flat && w.dragging ? DRAG_SCALE : 1;
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

    drawQuad(pageTexture, { x: 0, y: 0, width: viewport.width, height: viewport.height }, identity, false);
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
      plot ??= createScatterRenderer(gl, fx.program);
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

  let lastFrame = performance.now();

  const onPaint = (event) => {
    if (canvas.width < 2 || canvas.height < 2) return;
    if (!geometryMode) detectGeometryMode();

    const now = performance.now();
    const dt = Math.min(100, now - lastFrame);
    lastFrame = now;
    const changed = new Set(event.changedElements ?? []);
    const viewport = { width: canvas.clientWidth, height: canvas.clientHeight };
    const dpr = canvas.width / viewport.width;
    let animating = false;

    // 1. Видимая часть страницы → текстура размером с экран.
    const size = `${canvas.width}x${canvas.height}`;
    if (pageState.size !== size) {
      pageState.size = size;
      pageState.scrollY = Number.NaN;
      allocate(pageTexture, canvas.width, canvas.height);
    }
    if (pageState.scrollY !== window.scrollY || changed.has(page)) {
      pageState.scrollY = window.scrollY;
      gl.bindTexture(gl.TEXTURE_2D, pageTexture);
      gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, page, {
        sx: 0,
        sy: window.scrollY,
        swidth: viewport.width,
        sheight: viewport.height,
        width: canvas.width,
        height: canvas.height,
      });
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
          gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w.shell, { width, height });
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
    applyGeometry(page, new DOMMatrix().translate(0, -window.scrollY), pageState);
    for (const w of windows) applyGeometry(w.shell, w.matrix, w.geometry, !w.dragging && !w.animating);

    // 4. Содержимое окон снизу вверх: линза видит уже готовые окна под собой.
    for (let i = 0; i < windows.length; i++) {
      if (renderContent(i, now, dpr, viewport)) animating = true;
    }

    // 5. Кадр целиком.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    drawScene(windows.length, { x: 0, y: 0, ...viewport }, false, viewport);

    if (animating) canvas.requestPaint();
  };

  canvas.addEventListener("paint", onPaint);
  canvas.requestPaint();

  return {
    canvas,
    addWindow,
    destroy() {
      canvas.removeEventListener("paint", onPaint);
      window.removeEventListener("scroll", onScroll);
      pageResizeObserver.disconnect();
      canvasResizeObserver.disconnect();
      for (const w of windows) releaseWindow(w);
      windows.length = 0;
      gl.deleteBuffer(meshScreenBuffer);
      plot?.dispose();
      gl.deleteBuffer(meshIndexBuffer);
      gl.deleteTexture(pageTexture);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(quad);
      for (const { program } of Object.values(programs)) gl.deleteProgram(program);
    },
  };
}
