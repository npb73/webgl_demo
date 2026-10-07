import type { ComponentProps } from "react";
import styles from "./DemoButton.module.scss";

/** Кнопка «▶ …», нарисованная ручкой на странице: запускает демо. */
export function DemoButton({ children, ...props }: ComponentProps<"button">) {
  return (
    <button type="button" className={styles.button} {...props}>
      <span className={styles.play} aria-hidden="true" />
      {children}
    </button>
  );
}
