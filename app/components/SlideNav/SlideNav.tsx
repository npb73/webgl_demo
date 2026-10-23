"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getDeck, getServerDeck, openSlideFromHash, stepSlide, subscribeDeck } from "../../lib/deck";
import styles from "./SlideNav.module.scss";

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

// PageUp / PageDown — их же шлют пульты для презентаций.
const KEYS: Record<string, 1 | -1> = {
  PageDown: 1,
  ArrowRight: 1,
  PageUp: -1,
  ArrowLeft: -1,
};

/** Стрелки «к предыдущему / следующему слайду» и номер слайда. */
export function SlideNav() {
  const deck = useSyncExternalStore(subscribeDeck, getDeck, getServerDeck);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // defaultPrevented — стрелки уже забрал элемент в фокусе (уголок окна).
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTyping(event.target)) return;
      const direction = KEYS[event.key];
      if (!direction) return;
      event.preventDefault();
      stepSlide(direction);
    };
    // Ссылки оглавления меняют адрес — открываем слайд, на который он указывает.
    const onHashChange = () => openSlideFromHash(false);

    openSlideFromHash(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  return (
    <nav className={styles.nav} aria-label="Листать слайды">
      <p className={styles.counter} aria-live="polite">
        {deck.count > 0 && `${deck.index + 1} / ${deck.count}`}
      </p>
      <div className={styles.arrows}>
        <button
          type="button"
          className={styles.arrow}
          onClick={() => stepSlide(-1)}
          disabled={deck.index <= 0}
          aria-label="Предыдущий слайд"
          title="Предыдущий слайд (←, PageUp)"
        >
          ←
        </button>
        <button
          type="button"
          className={styles.arrow}
          onClick={() => stepSlide(1)}
          disabled={deck.index >= deck.count - 1}
          aria-label="Следующий слайд"
          title="Следующий слайд (→, PageDown)"
        >
          →
        </button>
      </div>
    </nav>
  );
}
