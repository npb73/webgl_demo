import type { ReactNode } from "react";
import styles from "./Entry.module.scss";

type EntryProps = {
  id: string;
  number: number;
  date: string;
  title: string;
  children: ReactNode;
};

export function Entry({ id, number, date, title, children }: EntryProps) {
  const headingId = `${id}-title`;

  return (
    <section id={id} className={styles.entry} aria-labelledby={headingId}>
      <header className={styles.header}>
        <p className={styles.margin}>
          <span className={styles.number}>№{number}</span>
          <span className={styles.date}>{date}</span>
        </p>
        <h2 id={headingId} className={styles.title}>
          {title}
        </h2>
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
