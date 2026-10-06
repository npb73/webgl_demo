import { readFileSync } from "node:fs";
import { join } from "node:path";

// Читаем GLSL на этапе сборки: на странице показан ровно тот код,
// который упакован в public/shaders/first-shader.wasm.
const readShader = (file: string) =>
  readFileSync(join(process.cwd(), "shaders", file), "utf8");

export const firstVertexShader = readShader("first-shader.vert");
export const firstFragmentShader = readShader("first-shader.frag");

export const wasmLoaderSnippet = `
const bytes = await fetch("/shaders/first-shader.wasm")
  .then((response) => response.arrayBuffer());
const { instance } = await WebAssembly.instantiate(bytes);
const { memory, fragment_ptr, fragment_len } = instance.exports;

const fragmentSource = new TextDecoder().decode(
  new Uint8Array(memory.buffer, fragment_ptr(), fragment_len()),
);`;
