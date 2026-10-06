import type { ReactNode } from "react";
import styles from "./Notebook.module.scss";

type NotebookProps = {
  children: ReactNode;
};

export function Notebook({ children }: NotebookProps) {
  return (
    <div className={styles.sheet}>
      <span className={styles.holes} aria-hidden="true" />
      {children}
    </div>
  );
}
