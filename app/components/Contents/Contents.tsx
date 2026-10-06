import styles from "./Contents.module.scss";

export type ContentsItem = {
  id: string;
  title: string;
  date: string;
};

type ContentsProps = {
  items: readonly ContentsItem[];
};

export function Contents({ items }: ContentsProps) {
  return (
    <nav className={styles.contents} aria-labelledby="contents-title">
      <h2 id="contents-title" className={styles.title}>
        Содержание
      </h2>
      <ol className={styles.list}>
        {items.map((item, index) => (
          <li key={item.id} className={styles.item}>
            <span className={styles.number}>{index + 1}.</span>
            <a href={`#${item.id}`} className={styles.link}>
              {item.title}
            </a>
            <span className={styles.leader} aria-hidden="true" />
            <span className={styles.date}>{item.date}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
