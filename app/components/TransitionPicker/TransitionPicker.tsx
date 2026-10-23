"use client";

import { useSyncExternalStore } from "react";
import { transitionDemos } from "../../content/transitions";
import { stepSlide } from "../../lib/deck";
import { DEFAULT_TRANSITION, getTransition, setTransition, subscribeTransition } from "../../lib/page-transition";
import { DemoButton } from "../DemoButton/DemoButton";
import styles from "./TransitionPicker.module.scss";

/**
 * Кнопка сразу листает на следующий слайд с выбранным переходом, и он
 * остаётся на стрелках до конца доклада. Без HTML-in-Canvas слайд
 * просто сменяется.
 */
export function TransitionPicker() {
  const selected = useSyncExternalStore(subscribeTransition, getTransition, () => DEFAULT_TRANSITION);

  return (
    <>
      <div className={styles.row}>
        {transitionDemos.map((demo) => (
          <DemoButton
            key={demo.kind}
            aria-pressed={selected === demo.kind}
            onClick={() => {
              setTransition(demo.kind);
              stepSlide(1);
            }}
          >
            {demo.label}
          </DemoButton>
        ))}
      </div>
      {/* Место под ссылку занято всегда: появляясь, она не двигает вёрстку слайда. */}
      <button
        type="button"
        className={styles.reset}
        style={{ visibility: selected ? "visible" : "hidden" }}
        onClick={() => setTransition(null)}
      >
        листать без перехода
      </button>
    </>
  );
}
