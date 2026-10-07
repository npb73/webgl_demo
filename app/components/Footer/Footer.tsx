import styles from "./Footer.module.scss";

export function Footer() {
  return (
    <footer className={styles.footer} data-slide>
      <p className={styles.next}>Продолжение следует…</p>
      <p className={styles.text}>
        Дальше — свет и тени, постэффекты и тот самый треугольник на живом
        canvas.
      </p>
      <p className={styles.signature}>написано от руки (почти)</p>
    </footer>
  );
}
