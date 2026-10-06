import type { ReactNode } from "react";
import styles from "./MarginNote.module.scss";

type MarginNoteProps = {
  title?: string;
  /** «right» — стикер обтекается текстом справа на широких экранах. */
  placement?: "inline" | "right";
  children: ReactNode;
};

export function MarginNote({
  title,
  placement = "inline",
  children,
}: MarginNoteProps) {
  return (
    <aside className={`${styles.note} ${styles[placement]}`}>
      {title && <p className={styles.title}>{title}</p>}
      <div className={styles.text}>{children}</div>
    </aside>
  );
}
