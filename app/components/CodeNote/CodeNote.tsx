"use client";

import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { CodeNotes } from "../../content/code-notes";
import styles from "./CodeNote.module.scss";

type CodeNoteProps = {
  code: string;
  filename?: string;
  /** Подсказки к строкам: всплывают над строкой при наведении или фокусе. */
  notes?: CodeNotes;
};

// Ширина подсказки — как в .tip; нужна, чтобы подсказка не вылезала за листок.
const TIP_WIDTH = 420;

/** Подсказка к строке: самый длинный ключ, с которого начинается строка. */
function noteFor(line: string, notes: CodeNotes) {
  const text = line.trim();
  if (!text) return undefined;
  let best: string | undefined;
  for (const key of Object.keys(notes)) {
    if (text.startsWith(key) && (!best || key.length > best.length)) best = key;
  }
  return best === undefined ? undefined : notes[best];
}

type Tip = { index: number; left: number; top: number; arrow: number };

export function CodeNote({ code, filename, notes = {} }: CodeNoteProps) {
  const tipId = useId();
  const figureRef = useRef<HTMLElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const lines = code.trim().split("\n");
  const lineNotes = lines.map((line) => noteFor(line, notes));

  // Ключ, который не нашёл свою строку, — подсказка потерялась после правки кода.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const lost = Object.keys(notes).filter((key) => !lines.some((line) => line.trim().startsWith(key)));
    if (lost.length) console.warn(`CodeNote ${filename ?? ""}: нет строк для подсказок`, lost);
    // lines выводятся из code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, notes, filename]);

  // offsetLeft/offsetTop не учитывают CSS-трансформации: и наклон листка,
  // и сдвиг страницы на сцене HTML-in-Canvas не сбивают положение.
  const show = (index: number, line: HTMLElement) => {
    const figure = figureRef.current;
    const text = line.querySelector<HTMLElement>(`.${styles.text}`) ?? line;
    if (!figure) return;
    const x = text.offsetLeft - (preRef.current?.scrollLeft ?? 0);
    const left = Math.max(0, Math.min(x, figure.clientWidth - TIP_WIDTH));
    setTip({ index, left, top: line.offsetTop, arrow: Math.max(16, x - left + 24) });
  };

  const hide = (index: number) => setTip((current) => (current?.index === index ? null : current));

  return (
    <figure ref={figureRef} className={styles.note}>
      {filename && <figcaption className={styles.filename}>{filename}</figcaption>}
      <pre ref={preRef} className={styles.pre}>
        <code>
          {lines.map((line, index) => {
            const note = lineNotes[index];
            const indent = line.match(/^\s*/)?.[0] ?? "";
            if (!note) {
              return (
                <span key={index} className={styles.line}>
                  {line || " "}
                </span>
              );
            }
            return (
              <span
                key={index}
                className={`${styles.line} ${styles.annotated} ${tip?.index === index ? styles.active : ""}`}
                // Строка с подсказкой доступна и с клавиатуры.
                tabIndex={0}
                aria-describedby={tip?.index === index ? tipId : undefined}
                onPointerEnter={(event) => show(index, event.currentTarget)}
                onPointerLeave={(event: ReactPointerEvent<HTMLSpanElement>) => {
                  // На тачскрине pointerleave приходит сразу после касания — подсказку оставляем.
                  if (event.pointerType !== "touch") hide(index);
                }}
                onClick={(event) => show(index, event.currentTarget)}
                onFocus={(event) => show(index, event.currentTarget)}
                onBlur={() => hide(index)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") hide(index);
                }}
              >
                {indent}
                <span className={styles.text}>{line.slice(indent.length)}</span>
              </span>
            );
          })}
        </code>
      </pre>
      {tip && (
        <p
          key={tip.index}
          id={tipId}
          role="tooltip"
          className={styles.tip}
          style={{ left: tip.left, top: tip.top, ["--arrow" as string]: `${tip.arrow}px` }}
        >
          {lineNotes[tip.index]}
        </p>
      )}
    </figure>
  );
}
