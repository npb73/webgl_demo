/**
 * Путь к файлу из public/ с учётом подпапки сайта на GitHub Pages.
 * Next сам префиксует ссылки и скрипты, но не наши fetch().
 *
 * @param {string} path — например, "/shaders/fisheye.wasm"
 */
export function assetPath(path) {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
}
