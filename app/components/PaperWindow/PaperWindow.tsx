"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import styles from "./PaperWindow.module.scss";

type PaperWindowProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

type Position = { x: number; y: number };

const VIEWPORT_GUTTER = 16;
// Сколько окна должно оставаться на экране, чтобы его можно было вернуть.
const VISIBLE_PART = 96;
const TITLE_BAR_HEIGHT = 48;
const DEFAULT_WIDTH = 560;
const DEFAULT_HEIGHT = 480;

function initialPosition(): Position {
  const width = Math.min(DEFAULT_WIDTH, window.innerWidth - VIEWPORT_GUTTER * 2);
  return {
    x: Math.round((window.innerWidth - width) / 2),
    y: Math.max(VIEWPORT_GUTTER, Math.round((window.innerHeight - DEFAULT_HEIGHT) / 2)),
  };
}

function clampPosition({ x, y }: Position, width: number): Position {
  return {
    x: Math.min(Math.max(x, VISIBLE_PART - width), window.innerWidth - VISIBLE_PART),
    y: Math.min(Math.max(y, 0), window.innerHeight - TITLE_BAR_HEIGHT),
  };
}

export function PaperWindow({ title, onClose, children }: PaperWindowProps) {
  const titleId = useId();
  const windowRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dragOffset = useRef<Position | null>(null);
  const [position, setPosition] = useState(initialPosition);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button")) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    dragOffset.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    };
    setDragging(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const offset = dragOffset.current;
    if (!offset) return;
    setPosition(
      clampPosition(
        { x: event.clientX - offset.x, y: event.clientY - offset.y },
        windowRef.current?.offsetWidth ?? DEFAULT_WIDTH,
      ),
    );
  };

  const stopDragging = () => {
    dragOffset.current = null;
    setDragging(false);
  };

  return createPortal(
    <div
      className={styles.backdrop}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={windowRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`${styles.window} ${dragging ? styles.dragging : ""}`}
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      >
        <div className={styles.paper}>
          <div
            className={styles.titleBar}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
          >
            <span className={styles.icon} aria-hidden="true" />
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            <button
              ref={closeRef}
              type="button"
              className={styles.close}
              onClick={onClose}
              aria-label="Закрыть окно"
            >
              ✕
            </button>
          </div>
          <div className={styles.content}>{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
