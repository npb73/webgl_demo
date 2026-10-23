import type { WindowEffect } from "../components/PaperWindow/PaperWindow";

export type BackdropDemo = {
  effect: WindowEffect;
  label: string;
  windowTitle: string;
};

// Окна, которые искажают всё, что под ними: страницу и другие окна.
export const backdropDemos: BackdropDemo[] = [
  { effect: "fisheye", label: "Взять линзу", windowTitle: "fisheye.exe" },
  {
    effect: "broken-glass",
    label: "Разбить стекло",
    windowTitle: "broken-glass.exe",
  },
  {
    effect: "ripple",
    label: "Пустить рябь",
    windowTitle: "ripple.exe",
  },
  {
    effect: "fire",
    label: "Поджечь",
    windowTitle: "fire.exe",
  },
];
