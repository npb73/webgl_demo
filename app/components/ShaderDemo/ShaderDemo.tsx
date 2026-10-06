"use client";

import { useCallback, useRef, useState } from "react";
import { PaperWindow } from "../PaperWindow/PaperWindow";
import { ShaderCanvas } from "./ShaderCanvas";
import styles from "./ShaderDemo.module.scss";

export function ShaderDemo() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={styles.button}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <span className={styles.play} aria-hidden="true" />
        Запустить шейдер
      </button>

      {open && (
        <PaperWindow title="first-shader.exe" onClose={close}>
          <ShaderCanvas />
        </PaperWindow>
      )}
    </>
  );
}
