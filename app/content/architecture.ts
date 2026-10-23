import type { PipelineStage } from "../components/Pipeline/Pipeline";
import type { TermItem } from "./model";

// Путь страницы до экрана: от React-разметки до кадра WebGL.
export const sceneStages: PipelineStage[] = [
  { name: "React-разметка", hint: "drawable-потомки <canvas layoutsubtree>" },
  { name: "Вёрстка и отрисовка", hint: "браузер, как обычно; потом событие paint" },
  { name: "texElementSubImage2D", hint: "страница и рамки окон → текстуры", programmable: true },
  { name: "Шейдеры", hint: "эффекты окон, карточки, переходы, сборка кадра", programmable: true },
  { name: "updateElementGeometry", hint: "клик попадает туда, где нарисовано", programmable: true },
];

// Обработчик paint из Stage/stage-renderer.js, без подробностей.
export const paintLoop = `
canvas.addEventListener("paint", (event) => {
  const changed = new Set(event.changedElements);

  // 1. Снимок — только если браузер перерисовал слайд
  if (changed.has(page))
    gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, page, { width, height });

  // 2. Где нарисовано — там и кликается; порядок вызовов = z-порядок
  canvas.updateElementGeometry(page, { canvasTransform: identity });
  for (const w of windows)
    canvas.updateElementGeometry(w.shell, { canvasTransform: w.matrix });

  // 3. Эффекты окон — каждый в свою текстуру, потом весь кадр
  windows.forEach(renderContent);
  drawScene();

  // 4. Следующий кадр — только пока что-то движется
  if (animating) canvas.requestPaint();
});
`;

// Как подружить HTML-in-Canvas и шейдеры — то, чему научил этот сайт.
export const practices: TermItem[] = [
  {
    term: "Сначала DOM",
    text: "Проверяйте `requestPaint` и `texElementSubImage2D`; без них, на сервере и при гидратации — обычная страница. Сцена — прогрессивное улучшение.",
  },
  {
    term: "API — за обёрткой",
    text: "Он меняется: `layoutsubtree` → `content=\"drawable\"`, а Chrome пока игнорирует `canvasTransform`. Всё экспериментальное — в одном модуле, с проверкой поведения.",
  },
  {
    term: "Где нарисовано — там кликается",
    text: "Каждый слой, который сдвинул шейдер, сообщайте через `updateElementGeometry`, по z-порядку. Иначе клики, выделение и фокус промахнутся.",
  },
  {
    term: "Снимок — по изменению",
    text: "`event.changedElements` говорит, что перерисовал браузер. Остальные текстуры живут с прошлого кадра. Длинную страницу не кладите в canvas целиком — показывайте её по экрану, как здесь слайды.",
  },
  {
    term: "Двигайте матрицей",
    text: "Положение и наклон слоя — uniform, а не CSS: смена `transform` заставляет браузер заново снимать элемент.",
  },
  {
    term: "Кадр по требованию",
    text: "`requestPaint()` — только на листание, ввод и анимацию. Статичная страница не грузит GPU; `prefers-reduced-motion` — без анимаций.",
  },
  {
    term: "Чёткий текст",
    text: "Текстура в пикселях устройства (`devicePixelContentBoxSize`), слой в покое — без наклона и по сетке пикселей, альфа premultiplied — без тёмной каймы.",
  },
  {
    term: "Шейдер — только картинка",
    text: "Текст остаётся в DOM: скринридер, Ctrl+F и выделение работают. Не запекайте контент в текстуру, которую видит только GPU.",
  },
];
