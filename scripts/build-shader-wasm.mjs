// Упаковывает GLSL-исходники каждого shaders/<name>.frag вместе с вершинным
// шейдером <name>.vert (или общим fullscreen.vert, если своего нет)
// в WebAssembly-модуль public/shaders/<name>.wasm.
// Модуль экспортирует memory и функции *_ptr / *_len, по которым
// JS читает строки шейдеров из линейной памяти.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const shadersDir = join(root, "shaders");
const outputDir = join(root, "public/shaders");

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

const I32 = 0x7f;
const FUNC = 0x60;
const I32_CONST = 0x41;
const END = 0x0b;

function buildModule(sources) {
  // Раскладываем строки в памяти подряд.
  const data = Buffer.concat([sources.vertex, sources.fragment]);
  const layout = {
    vertex_ptr: 0,
    vertex_len: sources.vertex.length,
    fragment_ptr: sources.vertex.length,
    fragment_len: sources.fragment.length,
  };
  const exportsList = Object.entries(layout);

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

  return Uint8Array.from([
    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
    ...typeSection,
    ...functionSection,
    ...memorySection,
    ...exportSection,
    ...codeSection,
    ...dataSection,
  ]);
}

mkdirSync(outputDir, { recursive: true });

const sharedVertex = join(shadersDir, "fullscreen.vert");

for (const file of readdirSync(shadersDir).filter((name) => name.endsWith(".frag"))) {
  const name = basename(file, ".frag");
  const ownVertex = join(shadersDir, `${name}.vert`);

  const wasm = buildModule({
    vertex: readFileSync(existsSync(ownVertex) ? ownVertex : sharedVertex),
    fragment: readFileSync(join(shadersDir, file)),
  });
  writeFileSync(join(outputDir, `${name}.wasm`), wasm);
  console.log(`${name}.wasm: ${wasm.length} bytes`);
}
