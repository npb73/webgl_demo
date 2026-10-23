// Переход между слайдами: какой выбран и кто умеет его нарисовать.
// Стрелки листания живут вне сцены (canvas), поэтому со сценой они
// общаются через этот модуль, а не через контекст React.

export type PageTransition = "flip" | "cube" | "particles";

/**
 * Показать переход kind: сцена снимает слайд «до», вызывает show —
 * тот переключает слайд, — и рисует путь от старого к новому.
 * false — перехода не будет.
 */
type Runner = (kind: PageTransition, direction: number, show: () => void) => boolean;

// По умолчанию слайды перелистываются, как страницы тетради.
export const DEFAULT_TRANSITION: PageTransition = "flip";

let selected: PageTransition | null = DEFAULT_TRANSITION;
let runner: Runner | null = null;
const listeners = new Set<() => void>();

export function subscribeTransition(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getTransition = () => selected;

/** null — листать без перехода. */
export function setTransition(kind: PageTransition | null) {
  selected = kind;
  for (const listener of listeners) listener();
}

/** Сцена WebGL сообщает, что умеет рисовать переходы; без HTML-in-Canvas её нет. */
export function setTransitionRunner(next: Runner | null) {
  runner = next;
}

/** Переключить слайд через show с выбранным переходом. false — show не вызван, листайте сами. */
export function showWithTransition(direction: number, show: () => void) {
  return selected !== null && runner !== null && runner(selected, direction, show);
}
