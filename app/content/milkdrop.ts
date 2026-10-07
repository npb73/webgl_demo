import type { WindowEffect } from "../components/PaperWindow/PaperWindow";

export type MilkdropDemoInfo = {
  effect: WindowEffect;
  windowTitle: string;
};

export const milkdropDemos: MilkdropDemoInfo[] = [
  {
    effect: "milkdrop-sherwin",
    windowTitle: "sherwin.milk",
  },
  {
    effect: "milkdrop-cauldron",
    windowTitle: "cauldron.milk",
  },
  {
    effect: "milkdrop-spiral",
    windowTitle: "spiral.milk",
  },
  {
    effect: "milkdrop-harlequin",
    windowTitle: "harlequin.milk",
  },
  {
    effect: "milkdrop-feathers",
    windowTitle: "feathers.milk",
  },
  {
    effect: "milkdrop-sunflower",
    windowTitle: "sunflower.milk",
  },
];
