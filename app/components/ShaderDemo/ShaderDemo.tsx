"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { DemoButton } from "../DemoButton/DemoButton";
import { PaperWindow, type WindowEffect } from "../PaperWindow/PaperWindow";

type ShaderDemoProps = {
  label: string;
  windowTitle: string;
  /** Что рисует окно, когда страница — сцена WebGL. */
  effect: WindowEffect;
  /** Окно без наклона — нужно линзе, чтобы совпадать со страницей под ней. */
  flat?: boolean;
  /** Содержимое окна в DOM-режиме: монтируется только пока окно открыто. */
  children: ReactNode;
};

export function ShaderDemo({ label, windowTitle, effect, flat, children }: ShaderDemoProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  return (
    <>
      <DemoButton ref={buttonRef} onClick={() => setOpen(true)} aria-haspopup="dialog">
        {label}
      </DemoButton>

      {open && (
        <PaperWindow title={windowTitle} effect={effect} flat={flat} onClose={close}>
          {children}
        </PaperWindow>
      )}
    </>
  );
}
