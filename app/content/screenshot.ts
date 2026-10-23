import type { CodeNotes } from "./code-notes";

// Снятие кадра из Stage/stage-renderer.js, без подробностей.
export const captureCode = `
// В конце обработчика paint — сразу после отрисовки кадра
const pixels = new Uint8Array(width * height * 4);
gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

// В WebGL строки идут снизу вверх, в картинке — сверху вниз
for (let y = 0; y < height; y++)
  image.data.set(pixels.subarray((height - 1 - y) * row, (height - y) * row), y * row);

context.putImageData(image, 0, 0);
out.toBlob((blob) => showThumbnail(URL.createObjectURL(blob)), "image/png");
`;

export const captureNotes: CodeNotes = {
  "const pixels = new Uint8Array(": "Место под кадр: 4 байта (RGBA) на каждый пиксель устройства. На ретине это десятки мегабайт.",
  "gl.readPixels(": "Скопировать кадр из видеопамяти в JS. Синхронно: процессор ждёт, пока видеокарта дорисует.",
  "for (let y = 0; y < height; y++)": "Переворачиваем кадр построчно: у WebGL начало координат внизу.",
  "image.data.set(": "Строка y картинки — это строка height − 1 − y кадра.",
  "context.putImageData(image, 0, 0);": "Кладём пиксели в обычный 2D-canvas — он умеет кодировать PNG.",
  "out.toBlob(": "PNG-файл в памяти. Ссылка blob: годится и для <img> миниатюры, и для скачивания.",
};
