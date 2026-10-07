// Загрузка GLSL-исходников, упакованных в WebAssembly-модуль
// скриптом scripts/build-shader-wasm.mjs. Модуль экспортирует memory
// и пары функций *_ptr / *_len, по которым мы читаем строки.

/** @type {Map<string, Promise<{ vertex: string, fragment: string }>>} */
const cache = new Map();

/**
 * @param {string} url
 * @returns {Promise<{ vertex: string, fragment: string }>}
 */
export function loadShaderSources(url) {
  let sources = cache.get(url);
  if (sources) return sources;

  sources = fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`Не удалось загрузить ${url}`);
      return response.arrayBuffer();
    })
    .then((bytes) => WebAssembly.instantiate(bytes))
    .then(({ instance }) => {
      const { memory, vertex_ptr, vertex_len, fragment_ptr, fragment_len } =
        instance.exports;
      const decoder = new TextDecoder();
      const read = (ptr, len) =>
        decoder.decode(new Uint8Array(memory.buffer, ptr, len));

      return {
        vertex: read(vertex_ptr(), vertex_len()),
        fragment: read(fragment_ptr(), fragment_len()),
      };
    })
    .catch((error) => {
      cache.delete(url);
      throw error;
    });

  cache.set(url, sources);
  return sources;
}
