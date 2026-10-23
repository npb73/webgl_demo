// Презентация: на экране один слайд, остальные спрятаны (hidden).
// Порядок слайдов — порядок [data-slide] в документе, а открытый слайд
// записан в адресе (#lens-2): ссылка и перезагрузка ведут туда же.

import { flushSync } from "react-dom";
import { showWithTransition } from "./page-transition";

export const FIRST_SLIDE = "title";

type Deck = {
  /** id открытого слайда. */
  slide: string;
  index: number;
  count: number;
};

// На сервере и при гидратации слайдов в документе ещё никто не считал.
const SERVER_DECK: Deck = { slide: FIRST_SLIDE, index: 0, count: 0 };

let deck = SERVER_DECK;
const listeners = new Set<() => void>();

export function subscribeDeck(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getDeck = () => deck;
export const getServerDeck = () => SERVER_DECK;

const slideIds = () => [...document.querySelectorAll<HTMLElement>("[data-slide]")].map((slide) => slide.id);

function show(slide: string, sync: boolean) {
  const ids = slideIds();
  deck = { slide, index: ids.indexOf(slide), count: ids.length };
  // flushSync: к следующему кадру сцены DOM уже показывает новый слайд —
  // переход берёт его снимок как страницу «после».
  if (sync) flushSync(() => listeners.forEach((listener) => listener()));
  else listeners.forEach((listener) => listener());
  history.replaceState(null, "", `#${slide}`);
}

/** Слайд, где лежит элемент с этим id, — или сам слайд. */
function slideOf(id: string) {
  const element = id ? document.getElementById(id) : null;
  return element?.closest<HTMLElement>("[data-slide]")?.id;
}

/** Открыть слайд id; если выбран переход и есть сцена — с переходом. */
export function goToSlide(id: string) {
  const ids = slideIds();
  const from = ids.indexOf(deck.slide);
  const to = ids.indexOf(id);
  if (to < 0 || to === from) return;
  if (!showWithTransition(Math.sign(to - from), () => show(id, true))) show(id, true);
}

/** Следующий (1) или предыдущий (−1) слайд. */
export function stepSlide(direction: 1 | -1) {
  const ids = slideIds();
  const next = ids[ids.indexOf(deck.slide) + direction];
  if (next) goToSlide(next);
}

/** Слайд из адреса: при загрузке — сразу, по ссылке из оглавления — как листание. */
export function openSlideFromHash(initial: boolean) {
  const target = slideOf(decodeURIComponent(location.hash.slice(1))) ?? (initial ? FIRST_SLIDE : undefined);
  if (!target) return;
  if (initial) show(target, false);
  else goToSlide(target);
}
