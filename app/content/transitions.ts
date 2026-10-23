import type { PageTransition } from "../lib/page-transition";

export type TransitionDemo = {
  kind: PageTransition;
  label: string;
};

// Переходы между слайдами: слайд до и после листания — две текстуры.
export const transitionDemos: TransitionDemo[] = [
  { kind: "flip", label: "Перелистнуть" },
  { kind: "cube", label: "Повернуть куб" },
  { kind: "particles", label: "Рассыпать" },
];
