import styles from "./Hero.module.scss";

export function Hero() {
  return (
    <header className={styles.hero} data-slide>
      <p className={styles.kicker}>Тетрадь № 1 · фронтенд → GPU</p>

      <h1 className={styles.title}>
        Дневник о <span className={styles.accent}>WebGL</span>
      </h1>

      <p className={styles.lead}>
        Как рисовать прямо на видеокарте — для тех, кто знает React,
        но ни разу не писал шейдер.
      </p>

      <dl className={styles.meta}>
        <div>
          <dt>Владелец:</dt>
          <dd>фронтендер, которому стало любопытно</dd>
        </div>
      </dl>
    </header>
  );
}
