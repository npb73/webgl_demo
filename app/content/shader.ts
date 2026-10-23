import { readFileSync } from "node:fs";
import { join } from "node:path";

// Читаем GLSL на этапе сборки: на странице показан ровно тот код,
// который упакован в public/shaders/*.wasm.
const readShader = (file: string) =>
  readFileSync(join(process.cwd(), "shaders", file), "utf8");

export const scatterVertexShader = readShader("scatter.vert");

// Из линзы — чтение подложки, сама формула fish-eye и сборка цвета;
// объявления и «стеклянный» блик остаются за кадром. Целиком это не
// помещается на слайд: функции и main показаны на двух экранах.
const fisheye = readShader("fisheye.frag");
const fisheyeMainStart = fisheye.indexOf("void main()");
export const fisheyeHelpers = fisheye.slice(fisheye.indexOf("vec3 page("), fisheyeMainStart).trimEnd();
export const fisheyeMain = fisheye.slice(fisheyeMainStart, fisheye.indexOf("  // Немного «стекла»")).trimEnd() + "\n  …\n}";

// Из шейдера Milkdrop показываем только main: объявления занимают полслайда.
const milkdropWarp = readShader("milkdrop-warp.frag");
export const milkdropWarpCore = milkdropWarp.slice(milkdropWarp.indexOf("void main()"));
