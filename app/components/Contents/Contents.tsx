import { Slide } from "../Slide/Slide";
import styles from "./Contents.module.scss";

export type ContentsItem = {
  id: string;
  title: string;
  /** Часть рассказа: подряд идущие блоки одной части собираются под общим заголовком. */
  part: string;
};

type ContentsProps = {
  items: readonly ContentsItem[];
};

/** Блоки, сгруппированные по частям; номера сквозные. */
function groupByPart(items: readonly ContentsItem[]) {
  const parts: { title: string; items: { item: ContentsItem; number: number }[] }[] = [];
  items.forEach((item, index) => {
    const last = parts.at(-1);
    const entry = { item, number: index + 1 };
    if (last?.title === item.part) last.items.push(entry);
    else parts.push({ title: item.part, items: [entry] });
  });
  return parts;
}

export function Contents({ items }: ContentsProps) {
  return (
    <Slide id="contents" as="nav" className={styles.contents} aria-labelledby="contents-title">
      <h2 id="contents-title" className={styles.title}>
        Содержание
      </h2>
      <div className={styles.parts}>
        {groupByPart(items).map((part) => (
          <section key={part.title} className={styles.part}>
            <h3 className={styles.partTitle}>{part.title}</h3>
            <ol className={styles.list} start={part.items[0].number}>
              {part.items.map(({ item, number }) => (
                <li key={item.id} className={styles.item}>
                  <span className={styles.number}>{number}.</span>
                  <a href={`#${item.id}`} className={styles.link}>
                    {item.title}
                  </a>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </Slide>
  );
}
