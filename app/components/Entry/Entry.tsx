import { Children, type ReactNode } from "react";
import { Slide } from "../Slide/Slide";
import styles from "./Entry.module.scss";

type EntryProps = {
  id: string;
  number: number;
  title: string;
  /** Экраны записи — по <Page> на каждый. */
  children: ReactNode;
};

/** Один экран записи: всё, что должно поместиться на слайд целиком. */
export function Page({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/**
 * Запись — один или несколько слайдов с общим заголовком. Первый слайд
 * получает id записи (на него ведёт оглавление), следующие — id-2, id-3…
 */
export function Entry({ id, number, title, children }: EntryProps) {
  const pages = Children.toArray(children);

  return pages.map((page, index) => {
    const slideId = index === 0 ? id : `${id}-${index + 1}`;
    const headingId = `${slideId}-title`;
    return (
      <Slide key={slideId} id={slideId} className={styles.entry} aria-labelledby={headingId}>
        <header className={styles.header}>
          <p className={styles.margin}>
            <span className={styles.number}>№{number}</span>
            {pages.length > 1 && (
              <span className={styles.page}>
                {index + 1} из {pages.length}
              </span>
            )}
          </p>
          <h2 id={headingId} className={styles.title}>
            {title}
          </h2>
        </header>
        <div className={styles.body}>{page}</div>
      </Slide>
    );
  });
}
