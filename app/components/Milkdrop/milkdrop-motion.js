// Поле движения пресета Milkdrop. Butterchurn (движок визуализатора Webamp)
// считает уравнения пресета и для каждого узла сетки отдаёт, откуда брать
// прошлый кадр. Свою картинку он рисует в крошечный скрытый canvas, на
// который никто не смотрит: его цвета и фоны нам не нужны, только движение.

import { createRandomAudio } from "./random-audio";
import { presetLoaders, presetTweaks } from "./presets";

export const MESH_WIDTH = 48;
export const MESH_HEIGHT = 36;

// У скрытого визуализатора те же пропорции, что у окна: так уравнения
// считают углы и расстояния так же, и водовороты остаются круглыми.
const HIDDEN_WIDTH = 128;
const HIDDEN_HEIGHT = 96;
const MAX_HIDDEN_HEIGHT = 512;
// Часы пресета идут вдвое медленнее: водовороты и дрейф спокойнее.
const TIME_SCALE = 0.5;

/**
 * @param {import("./presets").MilkdropPresetId} presetId
 * @returns {Promise<{ step(now: number): Float32Array, setAspect(aspect: number): void, destroy(): void }>}
 */
export async function createMilkdropMotion(presetId) {
  // Движок большой — грузим, только когда окно с ним открыли.
  const [{ default: butterchurn }, { default: original }] = await Promise.all([
    import("butterchurn"),
    presetLoaders[presetId](),
  ]);
  const preset = presetTweaks[presetId]?.(original) ?? original;

  const hidden = document.createElement("canvas");
  hidden.width = HIDDEN_WIDTH;
  hidden.height = HIDDEN_HEIGHT;
  // AudioContext не нужен: «звук» подаём сами в render().
  const visualizer = butterchurn.createVisualizer(null, hidden, {
    width: HIDDEN_WIDTH,
    height: HIDDEN_HEIGHT,
    pixelRatio: 1,
    textureRatio: 1,
    meshWidth: MESH_WIDTH,
    meshHeight: MESH_HEIGHT,
  });
  // Уравнения пресета компилируются в WebAssembly — это асинхронно.
  await visualizer.loadPreset(preset, 0);

  const nextAudio = createRandomAudio();
  let aspect = HIDDEN_WIDTH / HIDDEN_HEIGHT;
  let lastStep = performance.now();

  return {
    /** Один кадр уравнений → (48+1)×(36+1) пар u, v, строки сверху вниз. */
    step(now) {
      // Butterchurn двигает время пресета на прошедшее время — даём ему вдвое меньше.
      const elapsed = Math.min(0.1, Math.max(0.001, (now - lastStep) / 1000));
      lastStep = now;
      visualizer.render({ audioLevels: nextAudio(now), elapsedTime: elapsed * TIME_SCALE });
      return visualizer.renderer.warpUVs;
    },
    /** Окно поменяло пропорции (ширина / высота) — подстраиваем уравнения. */
    setAspect(next) {
      if (Math.abs(next - aspect) < 0.01) return;
      aspect = next;
      const height = Math.min(MAX_HIDDEN_HEIGHT, Math.max(16, Math.round(HIDDEN_WIDTH / aspect)));
      visualizer.setRendererSize(HIDDEN_WIDTH, height);
    },
    destroy() {
      visualizer.gl?.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
