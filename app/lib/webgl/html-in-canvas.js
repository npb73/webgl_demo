// Экспериментальный API HTML-in-Canvas: потомки <canvas layoutsubtree>
// с атрибутом drawable проходят обычную вёрстку, а их отрисовку браузер
// отдаёт в текстуру. В Chrome включается флагом.

export const FLAG_URL = "chrome://flags/#canvas-draw-element";

export function isHtmlInCanvasSupported() {
  return (
    typeof HTMLCanvasElement !== "undefined" &&
    "requestPaint" in HTMLCanvasElement.prototype &&
    "updateElementGeometry" in HTMLCanvasElement.prototype &&
    typeof WebGL2RenderingContext !== "undefined" &&
    "texElementSubImage2D" in WebGL2RenderingContext.prototype
  );
}
