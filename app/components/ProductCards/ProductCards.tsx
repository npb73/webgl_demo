"use client";

import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { productCards, type ProductCard } from "../../content/cards";
import { useStage, type StageContextValue } from "../Stage/Stage";
import styles from "./ProductCards.module.scss";

type StageRenderer = NonNullable<Extract<StageContextValue, { mode: "canvas" }>["renderer"]>;
type CardHandle = ReturnType<StageRenderer["addCard"]>;

/** Сетка карточек: каждая занимает своё место в вёрстке слайда. */
export function ProductCards() {
  return (
    <ul className={styles.grid}>
      {productCards.map((card) => (
        <li key={card.id} className={styles.slot}>
          <Card card={card} />
        </li>
      ))}
    </ul>
  );
}

function Card({ card }: { card: ProductCard }) {
  const stage = useStage();
  if (stage.mode === "canvas" && stage.renderer) return <StageCard card={card} renderer={stage.renderer} />;
  return <DomCard card={card} />;
}

/** Содержимое карточки — обычный HTML: текст, цена и рабочая кнопка. */
function CardFace({ card }: { card: ProductCard }) {
  const titleId = useId();
  const [count, setCount] = useState(0);
  return (
    <article className={`${styles.card} ${styles[card.theme]}`} aria-labelledby={titleId}>
      <p className={styles.top}>
        <span>{card.kind}</span>
        <span className={styles.badge}>{card.effectName}</span>
      </p>
      <div className={styles.art} aria-hidden="true">
        <span className={styles.emoji}>{card.emoji}</span>
      </div>
      <h3 id={titleId} className={styles.name}>
        {card.name}
      </h3>
      <p className={styles.description}>{card.description}</p>
      <p className={styles.meta}>
        <span className={styles.price}>{card.price}</span>
        <span>★ {card.rating}</span>
      </p>
      <button type="button" className={styles.buy} onClick={() => setCount((value) => value + 1)}>
        {count ? `В корзине · ${count}` : "В корзину"}
      </button>
      <p className={styles.number}>
        <span>{card.number}</span>
        <span>Серия «Шейдеры»</span>
      </p>
    </article>
  );
}

/** Где указатель на элементе: x и y от 0 до 1. */
function pointerIn(event: ReactPointerEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
  };
}

/**
 * Без HTML-in-Canvas: карточка на своём месте, наклон — CSS-трансформацией.
 * Шейдерных эффектов нет: шейдер не видит DOM.
 */
function DomCard({ card }: { card: ProductCard }) {
  const ref = useRef<HTMLDivElement>(null);
  const tilt = (x: number, y: number, lift: number) => {
    const style = ref.current?.style;
    style?.setProperty("--rx", `${-(y - 0.5) * 28}deg`);
    style?.setProperty("--ry", `${(x - 0.5) * 28}deg`);
    style?.setProperty("--lift", `${lift}`);
  };
  return (
    <div
      ref={ref}
      className={styles.domCard}
      onPointerMove={(event) => {
        const { x, y } = pointerIn(event);
        tilt(x, y, 1.04);
      }}
      onPointerLeave={() => tilt(0.5, 0.5, 1)}
    >
      <CardFace card={card} />
    </div>
  );
}

/**
 * Карточка — слой сцены: её содержимое лежит прямо в canvas (drawable),
 * а место в вёрстке держит пустой блок. Сцена ставит снимок карточки туда,
 * наклоняет его за указателем и накладывает шейдерный эффект.
 */
function StageCard({ card, renderer }: { card: ProductCard; renderer: StageRenderer }) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<CardHandle | null>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    const element = elementRef.current;
    if (!anchor || !element) return;

    // Размер карточки — как у её места в сетке слайда.
    const resizeObserver = new ResizeObserver(() => {
      element.style.width = `${anchor.offsetWidth}px`;
      element.style.height = `${anchor.offsetHeight}px`;
    });
    resizeObserver.observe(anchor);

    const handle = renderer.addCard({ element, anchor, effect: card.effect });
    handleRef.current = handle;
    return () => {
      resizeObserver.disconnect();
      handle.remove();
      handleRef.current = null;
    };
  }, [renderer, card.effect]);

  const onPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const { x, y } = pointerIn(event);
    handleRef.current?.setPointer(x, y);
  };

  return (
    <>
      <div ref={anchorRef} className={styles.anchor} />
      {createPortal(
        <div
          ref={elementRef}
          drawable=""
          className={styles.stageCard}
          onPointerEnter={(event) => {
            handleRef.current?.setHovered(true);
            onPointer(event);
          }}
          onPointerMove={onPointer}
          onPointerLeave={() => handleRef.current?.setHovered(false)}
        >
          <CardFace card={card} />
        </div>,
        renderer.canvas,
      )}
    </>
  );
}
