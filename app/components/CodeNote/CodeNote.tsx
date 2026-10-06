import styles from "./CodeNote.module.scss";

type CodeNoteProps = {
  code: string;
  filename?: string;
};

export function CodeNote({ code, filename }: CodeNoteProps) {
  return (
    <figure className={styles.note}>
      {filename && <figcaption className={styles.filename}>{filename}</figcaption>}
      <pre className={styles.pre}>
        <code>{code.trim()}</code>
      </pre>
    </figure>
  );
}
