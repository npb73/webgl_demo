"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { attachPlotInput, createView } from "../Plot/scatter-plot";
import plotStyles from "../Plot/Plot.module.scss";
import { useStage, type StageContextValue } from "../Stage/Stage";
import styles from "./PaperWindow.module.scss";

export type WindowEffect =
  | "first-shader"
  | "scatter"
  | "fisheye"
  | "broken-glass"
  | "ripple"
  | "fire"
  | "milkdrop-sherwin"
  | "milkdrop-cauldron"
  | "milkdrop-spiral"
  | "milkdrop-harlequin"
  | "milkdrop-feathers"
  | "milkdrop-sunflower";

type PaperWindowProps = {
  title: string;
  /** Эффект в окне, когда страница рисуется сценой WebGL. */
  effect: WindowEffect;
  /** Без наклона и «приподнимания» при перетаскивании. */
  flat?: boolean;
  onClose: () => void;
  /** Содержимое окна в обычном DOM-режиме (без HTML-in-Canvas). */
  children: ReactNode;
};

type Position = { x: number; y: number };
type Size = { width: number; height: number };

const VIEWPORT_GUTTER = 16;
// Сколько окна должно оставаться на экране, чтобы его можно было вернуть.
const VISIBLE_PART = 96;
const TITLE_BAR_HEIGHT = 48;
const DEFAULT_WIDTH = 560;
const DEFAULT_HEIGHT = 480;
// Меньше — не помещаются заголовок и хоть какая-то картинка.
const MIN_WIDTH = 280;
const MIN_HEIGHT = 240;
// Шаг изменения размера стрелками; с Shift — крупнее.
const KEY_STEP = 16;

// Окно, которое трогали последним, оказывается поверх остальных.
let topZIndex = 1000;
const nextZIndex = () => ++topZIndex;

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

function clampSize({ width, height }: Size): Size {
  return {
    width: Math.round(Math.min(Math.max(width, MIN_WIDTH), window.innerWidth - VIEWPORT_GUTTER)),
    height: Math.round(Math.min(Math.max(height, MIN_HEIGHT), window.innerHeight - VIEWPORT_GUTTER)),
  };
}

const classNames = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(" ");

/**
 * Размер окна, который тянут за уголок или меняют стрелками.
 * null — размер по умолчанию из CSS (ширина 560, картинка 4:3).
 */
function useResizable(windowRef: RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState<Size | null>(null);
  const [resizing, setResizing] = useState(false);
  const start = useRef<{ x: number; y: number; size: Size } | null>(null);

  const currentSize = (): Size =>
    size ?? {
      width: windowRef.current?.offsetWidth ?? DEFAULT_WIDTH,
      height: windowRef.current?.offsetHeight ?? DEFAULT_HEIGHT,
    };

  const resizeTo = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const from = start.current;
    if (!from) return;
    setSize(
      clampSize({
        width: from.size.width + event.clientX - from.x,
        height: from.size.height + event.clientY - from.y,
      }),
    );
  };

  const gripProps = {
    onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
      if (event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      start.current = { x: event.clientX, y: event.clientY, size: currentSize() };
      setResizing(true);
    },
    onPointerMove: resizeTo,
    onPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
      // Последнее движение могло прийти уже после отпускания — берём точку из up.
      resizeTo(event);
      start.current = null;
      setResizing(false);
    },
    onKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
      const step = event.shiftKey ? KEY_STEP * 4 : KEY_STEP;
      const delta = {
        ArrowRight: [step, 0],
        ArrowLeft: [-step, 0],
        ArrowDown: [0, step],
        ArrowUp: [0, -step],
      }[event.key];
      if (!delta) return;
      event.preventDefault();
      const { width, height } = currentSize();
      setSize(clampSize({ width: width + delta[0], height: height + delta[1] }));
    },
  };

  const sizeStyle = size ? { width: size.width, height: size.height } : undefined;
  return { sized: size !== null, resizing, sizeStyle, gripProps };
}

type GripProps = ReturnType<typeof useResizable>["gripProps"];

/** Уголок для изменения размера, как в Windows, только нарисованный карандашом. */
function ResizeGrip(props: GripProps) {
  return (
    <button
      type="button"
      className={styles.grip}
      aria-label="Изменить размер окна: потяните или нажмите стрелки"
      onPointerCancel={props.onPointerUp}
      {...props}
    />
  );
}

export function PaperWindow(props: PaperWindowProps) {
  const stage = useStage();
  if (stage.mode === "dom") return <DomWindow {...props} />;
  // Сцена ещё грузит шейдеры — окно появится через мгновение.
  if (!stage.renderer) return null;
  return <StageWindow {...props} renderer={stage.renderer} />;
}

type ChromeProps = {
  titleId: string;
  title: string;
  closeRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  children: ReactNode;
};

/** Бумажный лист: заголовок «как в Windows», крестик и область содержимого. */
function WindowChrome({ titleId, title, closeRef, onClose, onPointerDown, onPointerMove, onPointerUp, children }: ChromeProps) {
  return (
    <div className={styles.paper}>
      <div
        className={styles.titleBar}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onLostPointerCapture={onPointerUp}
      >
        <span className={styles.icon} aria-hidden="true" />
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Закрыть окно">
          ✕
        </button>
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}

const isDragStart = (event: ReactPointerEvent<HTMLDivElement>) =>
  event.button === 0 && !(event.target as HTMLElement).closest("button");

/** Обычное DOM-окно поверх страницы: двигается CSS-трансформацией. */
function DomWindow({ title, flat = false, onClose, children }: PaperWindowProps) {
  const titleId = useId();
  const windowRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dragOffset = useRef<Position | null>(null);
  const [position, setPosition] = useState(initialPosition);
  const [dragging, setDragging] = useState(false);
  const [zIndex, setZIndex] = useState(nextZIndex);
  const { sized, resizing, sizeStyle, gripProps } = useResizable(windowRef);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragStart(event)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragOffset.current = { x: event.clientX - position.x, y: event.clientY - position.y };
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

  const stopDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Последнее движение могло прийти уже после отпускания — берём точку из up.
    onPointerMove(event);
    dragOffset.current = null;
    setDragging(false);
  };

  // Окно немодальное: без подложки, страница под ним остаётся рабочей.
  // Escape закрывает его, только когда фокус внутри окна.
  return createPortal(
    <div
      ref={windowRef}
      role="dialog"
      aria-modal="false"
      // Фокусируемое окно: клик по заголовку оставляет фокус внутри,
      // и Escape продолжает работать.
      tabIndex={-1}
      aria-labelledby={titleId}
      className={classNames(
        styles.window,
        flat && styles.flat,
        dragging && styles.dragging,
        sized && styles.sized,
        resizing && styles.resizing,
      )}
      style={{ transform: `translate(${position.x}px, ${position.y}px)`, zIndex, ...sizeStyle }}
      onPointerDownCapture={() => {
        if (zIndex !== topZIndex) setZIndex(nextZIndex());
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <WindowChrome
        titleId={titleId}
        title={title}
        closeRef={closeRef}
        onClose={onClose}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDragging}
      >
        {children}
      </WindowChrome>
      <ResizeGrip {...gripProps} />
    </div>,
    document.body,
  );
}

type StageRenderer = NonNullable<Extract<StageContextValue, { mode: "canvas" }>["renderer"]>;
type WindowHandle = ReturnType<StageRenderer["addWindow"]>;

/**
 * Окно-слой сцены. Рамку один раз рисует браузер (drawable внутри canvas),
 * а положение, наклон и содержимое задаёт WebGL. При перетаскивании React
 * не перерисовывается: меняется только матрица слоя.
 */
function StageWindow({
  title,
  effect,
  flat = false,
  onClose,
  renderer,
}: PaperWindowProps & { renderer: StageRenderer }) {
  const titleId = useId();
  const shellRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const handleRef = useRef<WindowHandle | null>(null);
  const dragOffset = useRef<Position | null>(null);
  const [dragging, setDragging] = useState(false);
  // Новый размер меняет вёрстку окна — браузер перерисует рамку,
  // и сцена сама заберёт её новую текстуру и размеры содержимого.
  const { sized, resizing, sizeStyle, gripProps } = useResizable(windowRef);

  useEffect(() => {
    const shell = shellRef.current;
    const element = windowRef.current;
    const content = contentRef.current;
    if (!shell || !element || !content) return;

    // Окно с графиком управляется мышью: колесо — зум, перетаскивание — сдвиг.
    const view = effect === "scatter" ? createView() : null;
    const handle = renderer.addWindow({ shell, element, content, effect, flat, view });
    const detachInput = view
      ? attachPlotInput(content, view, () => handle.refresh(), { wheelTarget: renderer.canvas })
      : null;
    const start = initialPosition();
    handle.moveTo(start.x, start.y);
    handleRef.current = handle;
    closeRef.current?.focus({ preventScroll: true });

    return () => {
      detachInput?.();
      handle.remove();
      handleRef.current = null;
    };
  }, [renderer, effect, flat]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const handle = handleRef.current;
    if (!handle || !isDragStart(event)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const { x, y } = handle.position;
    dragOffset.current = { x: event.clientX - x, y: event.clientY - y };
    handle.setDragging(true);
    setDragging(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const offset = dragOffset.current;
    if (!offset) return;
    const { x, y } = clampPosition(
      { x: event.clientX - offset.x, y: event.clientY - offset.y },
      windowRef.current?.offsetWidth ?? DEFAULT_WIDTH,
    );
    handleRef.current?.moveTo(x, y);
  };

  const stopDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Браузер склеивает движения мыши до кадра; если кадр медленный,
    // последнее движение придёт после отпускания — берём точку из up.
    onPointerMove(event);
    dragOffset.current = null;
    handleRef.current?.setDragging(false);
    setDragging(false);
  };

  return createPortal(
    // Обёртка с полями: в них помещается тень, и она попадает в текстуру окна.
    <div ref={shellRef} drawable="" className={styles.shell}>
      <div
        ref={windowRef}
        role="dialog"
        aria-modal="false"
        tabIndex={-1}
        aria-labelledby={titleId}
        className={classNames(
          styles.window,
          styles.staged,
          dragging && styles.dragging,
          sized && styles.sized,
          resizing && styles.resizing,
        )}
        style={sizeStyle}
        onPointerDownCapture={() => handleRef.current?.raise()}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <WindowChrome
          titleId={titleId}
          title={title}
          closeRef={closeRef}
          onClose={onClose}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={stopDragging}
        >
          {/* Пустое место: сюда сцена рисует шейдер окна. */}
          <div
            ref={contentRef}
            className={classNames(styles.stageContent, effect === "scatter" && plotStyles.interactive)}
          />
        </WindowChrome>
        <ResizeGrip {...gripProps} />
      </div>
    </div>,
    renderer.canvas,
  );
}
