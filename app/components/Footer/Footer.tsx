import styles from "./Footer.module.scss";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <p className={styles.next}>Продолжение следует…</p>
      <p className={styles.text}>
        Первый живой пример уже в записи №5. Дальше — тот самый треугольник
        на canvas, шейдерный фон и первый постэффект.
      </p>
      <p className={styles.signature}>написано от руки (почти) · 2026</p>
    </footer>
  );
}
