import type { TimelineItem } from "../../content/timeline";
import { RichText } from "../RichText/RichText";
import styles from "./Timeline.module.scss";

type TimelineProps = {
  items: TimelineItem[];
};

export function Timeline({ items }: TimelineProps) {
  return (
    <ol className={styles.list}>
      {items.map((item) => (
        <li key={item.year} className={styles.item}>
          <span className={styles.year}>{item.year}</span>
          <h3 className={styles.title}>{item.title}</h3>
          <p className={styles.text}>
            <RichText text={item.text} />
          </p>
        </li>
      ))}
    </ol>
  );
}
