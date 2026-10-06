import { Fragment } from "react";

type RichTextProps = {
  text: string;
};

/** Превращает фрагменты в `обратных кавычках` в <code>. */
export function RichText({ text }: RichTextProps) {
  return text
    .split(/`([^`]+)`/)
    .map((part, index) =>
      index % 2 === 1 ? (
        <code key={index}>{part}</code>
      ) : (
        <Fragment key={index}>{part}</Fragment>
      ),
    );
}
