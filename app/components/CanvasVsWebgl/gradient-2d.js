// Тот же градиент, что в first-shader.frag, но на обычном Canvas 2D:
// видеокарты нет, JS сам обходит каждый пиксель и считает его цвет.

/**
 * @param {HTMLCanvasElement} canvas
 */
export function createGradient2d(canvas) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D недоступен в этом браузере");
  let image = context.createImageData(1, 1);

  return {
    /** Кадр в момент time (секунды). Возвращает, сколько миллисекунд он занял. */
    draw(time) {
      const start = performance.now();
      if (image.width !== canvas.width || image.height !== canvas.height) {
        image = context.createImageData(canvas.width, canvas.height);
      }
      const { width, height, data } = image;
      for (let y = 0; y < height; y++) {
        const v = 1 - (y + 0.5) / height; // y вверх, как gl_FragCoord
        for (let x = 0; x < width; x++) {
          const u = (x + 0.5) / width;
          const i = (y * width + x) * 4;
          data[i] = 127.5 + 127.5 * Math.cos(time + u);
          data[i + 1] = 127.5 + 127.5 * Math.cos(time + v + 2);
          data[i + 2] = 127.5 + 127.5 * Math.cos(time + u + 4);
          data[i + 3] = 255;
        }
      }
      context.putImageData(image, 0, 0);
      return performance.now() - start;
    },
  };
}
