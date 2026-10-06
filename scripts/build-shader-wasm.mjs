// Упаковывает GLSL-исходники первого шейдера в WebAssembly-модуль.
// Модуль экспортирует memory и функции *_ptr / *_len, по которым
// JS читает строки шейдеров из линейной памяти.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "public/shaders/first-shader.wasm");

const sources = {
  vertex: readFileSync(join(root, "shaders/first-shader.vert")),
  fragment: readFileSync(join(root, "shaders/first-shader.frag")),
};

const unsignedLeb = (value) => {
  const bytes = [];
  do {
    let byte = value & 0x7f;
    value >>>= 7;
    if (value !== 0) byte |= 0x80;
    bytes.push(byte);
  } while (value !== 0);
  return bytes;
};

const signedLeb = (value) => {
  const bytes = [];
  while (true) {
    const byte = value & 0x7f;
    value >>= 7;
    const done =
      (value === 0 && (byte & 0x40) === 0) ||
      (value === -1 && (byte & 0x40) !== 0);
    bytes.push(done ? byte : byte | 0x80);
    if (done) return bytes;
  }
};

const name = (text) => {
  const bytes = [...Buffer.from(text, "utf8")];
  return [...unsignedLeb(bytes.length), ...bytes];
};

const vector = (items) => [...unsignedLeb(items.length), ...items.flat()];

const section = (id, content) => [id, ...unsignedLeb(content.length), ...content];

// Раскладываем строки в памяти подряд.
const data = Buffer.concat([sources.vertex, sources.fragment]);
const layout = {
  vertex_ptr: 0,
  vertex_len: sources.vertex.length,
  fragment_ptr: sources.vertex.length,
  fragment_len: sources.fragment.length,
};
const exportsList = Object.entries(layout);

const I32 = 0x7f;
const FUNC = 0x60;
const I32_CONST = 0x41;
const END = 0x0b;

const typeSection = section(1, vector([[FUNC, 0, 1, I32]]));
const functionSection = section(3, vector(exportsList.map(() => [0])));
const pages = Math.max(1, Math.ceil(data.length / 65536));
const memorySection = section(5, vector([[0x00, ...unsignedLeb(pages)]]));
const exportSection = section(
  7,
  vector([
    [...name("memory"), 0x02, 0],
    ...exportsList.map(([key], index) => [...name(key), 0x00, ...unsignedLeb(index)]),
  ]),
);
const codeSection = section(
  10,
  vector(
    exportsList.map(([, value]) => {
      const body = [0, I32_CONST, ...signedLeb(value), END];
      return [...unsignedLeb(body.length), ...body];
    }),
  ),
);
const dataSection = section(
  11,
  vector([[0x00, I32_CONST, 0, END, ...unsignedLeb(data.length), ...data]]),
);

const wasm = Uint8Array.from([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
  ...typeSection,
  ...functionSection,
  ...memorySection,
  ...exportSection,
  ...codeSection,
  ...dataSection,
]);

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, wasm);
console.log(`first-shader.wasm: ${wasm.length} bytes`);
