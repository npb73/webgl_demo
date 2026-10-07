"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { isHtmlInCanvasSupported } from "../../lib/webgl/html-in-canvas";
import { createStageRenderer } from "./stage-renderer";
import styles from "./Stage.module.scss";

type StageRenderer = NonNullable<Awaited<ReturnType<typeof createStageRenderer>>>;

export type StageContextValue =
  | { mode: "dom" }
  | { mode: "canvas"; renderer: StageRenderer | null };

const StageContext = createContext<StageContextValue>({ mode: "dom" });

export const useStage = () => useContext(StageContext);

const subscribe = () => () => {};

/**
 * С флагом HTML-in-Canvas страница целиком уезжает внутрь <canvas> и
 * рисуется WebGL-сценой; без флага остаётся обычным DOM. На сервере и при
 * гидратации всегда DOM: поддержку API знает только браузер.
 */
export function Stage({ children }: { children: ReactNode }) {
  const supported = useSyncExternalStore(subscribe, isHtmlInCanvasSupported, () => false);

  if (!supported) {
    return <StageContext.Provider value={{ mode: "dom" }}>{children}</StageContext.Provider>;
  }
  return <CanvasStage>{children}</CanvasStage>;
}

function CanvasStage({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const [renderer, setRenderer] = useState<StageRenderer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const page = pageRef.current;
    const spacer = spacerRef.current;
    if (!canvas || !page || !spacer) return;

    const controller = new AbortController();
    let created: StageRenderer | null = null;

    createStageRenderer({ canvas, page, spacer, signal: controller.signal })
      .then((stage) => {
        if (!stage) return;
        if (controller.signal.aborted) stage.destroy();
        else setRenderer((created = stage));
      })
      .catch((error: unknown) => console.error("Сцена WebGL не запустилась:", error));

    return () => {
      controller.abort();
      created?.destroy();
    };
  }, []);

  return (
    <StageContext.Provider value={{ mode: "canvas", renderer }}>
      {/* layoutsubtree — имя в текущем Chrome, content="drawable" — в новой спецификации. */}
      <canvas ref={canvasRef} layoutsubtree="" content="drawable" className={styles.canvas}>
        <div ref={pageRef} drawable="" className={styles.page}>
          {children}
        </div>
      </canvas>
      {/* Canvas прибит к экрану, а прокрутку документу даёт этот блок высотой со страницу. */}
      <div ref={spacerRef} className={styles.spacer} aria-hidden="true" />
    </StageContext.Provider>
  );
}
