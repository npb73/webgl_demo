import styles from "./Hero.module.scss";

export function Hero() {
  return (
    <header className={styles.hero}>
      <p className={styles.kicker}>Тетрадь № 1 · фронтенд → GPU</p>

      <h1 className={styles.title}>
        Дневник о <span className={styles.accent}>WebGL</span>
      </h1>

      <p className={styles.lead}>
        Заметки для тех, кто уверенно пишет на React, понимает event loop
        и&nbsp;знает, как браузер раскладывает слои, — но ни разу не писал
        шейдер. Без «что такое переменная», только то, что действительно
        отличается от привычного фронтенда.
      </p>

      <dl className={styles.meta}>
        <div>
          <dt>Начато:</dt>
          <dd>6 октября 2026</dd>
        </div>
        <div>
          <dt>Владелец:</dt>
          <dd>фронтендер, которому стало любопытно</dd>
        </div>
      </dl>
    </header>
  );
}
