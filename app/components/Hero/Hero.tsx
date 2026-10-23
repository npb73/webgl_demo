import { Slide } from "../Slide/Slide";
import styles from "./Hero.module.scss";

export function Hero() {
  return (
    // id — FIRST_SLIDE из lib/deck: с титула презентация открывается.
    <Slide id="title" as="header" className={styles.hero}>
      <p className={styles.kicker}>Тетрадь № 1 · фронтенд → GPU</p>

      <h1 className={styles.title}>
        Дневник о <span className={styles.accent}>WebGL</span>
      </h1>

      <p className={styles.lead}>
        Разбираем код: от <code>getContext(&quot;webgl2&quot;)</code> до шейдеров
        поверх DOM.
      </p>
    </Slide>
  );
}
