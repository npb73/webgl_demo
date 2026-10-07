import { FLAG_URL } from "../../lib/webgl/html-in-canvas";
import styles from "./ShaderDemo.module.scss";

/**
 * Окнам, которые искажают страницу под собой, нужен HTML-in-Canvas:
 * без него шейдер не видит страницу.
 */
export function NeedsHtmlInCanvas() {
  return (
    <div className={styles.placeholder}>
      <div className={styles.needsFlag}>
        <p>Шейдер не включился.</p>
        <p className={styles.needsFlagDetails}>
          Он искажает то, что лежит под окном, а для этого страница должна
          быть текстурой. Это умеет только экспериментальный API
          HTML-in-Canvas.
        </p>
        <p className={styles.needsFlagDetails}>
          Включите в Chrome <code>{FLAG_URL}</code> и перезапустите браузер.
        </p>
      </div>
    </div>
  );
}
