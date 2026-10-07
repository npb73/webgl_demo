import { readFileSync } from "node:fs";
import { join } from "node:path";

// Читаем GLSL на этапе сборки: на странице показан ровно тот код,
// который упакован в public/shaders/*.wasm.
const readShader = (file: string) =>
  readFileSync(join(process.cwd(), "shaders", file), "utf8");

export const firstFragmentShader = readShader("first-shader.frag");
export const scatterVertexShader = readShader("scatter.vert");
