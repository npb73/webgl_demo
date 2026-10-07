// Атрибуты HTML-in-Canvas, которых ещё нет в типах React.
import "react";

// Параметр T обязателен: интерфейсы сливаются с одноимёнными из React.
/* eslint-disable @typescript-eslint/no-unused-vars */
declare module "react" {
  interface CanvasHTMLAttributes<T> {
    /** Имя атрибута в текущем Chrome; в новой редакции — content="drawable". */
    layoutsubtree?: "";
  }

  interface HTMLAttributes<T> {
    /** Элемент, который можно нарисовать в canvas-предке. */
    drawable?: "";
  }
}
