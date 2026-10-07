import type { WindowEffect } from "../components/PaperWindow/PaperWindow";

export type BackdropDemo = {
  effect: WindowEffect;
  label: string;
  windowTitle: string;
  /** Название и объяснение для списка в записи; у линзы — свой абзац. */
  name?: string;
  text?: string;
};

// Окна, которые искажают всё, что под ними: страницу и другие окна.
export const backdropDemos: BackdropDemo[] = [
  { effect: "fisheye", label: "Взять линзу", windowTitle: "fisheye.exe" },
  {
    effect: "broken-glass",
    label: "Разбить стекло",
    windowTitle: "broken-glass.exe",
    name: "Стекло",
    text: "каждый осколок по-своему сдвигает и поворачивает изображение",
  },
  {
    effect: "ripple",
    label: "Пустить рябь",
    windowTitle: "ripple.exe",
    name: "Рябь",
    text: "смещение по наклону волновой поверхности",
  },
  {
    effect: "fire",
    label: "Поджечь",
    windowTitle: "fire.exe",
    name: "Огонь",
    text: "фрактальный шум, движущийся вверх, и цветовая шкала",
  },
];
