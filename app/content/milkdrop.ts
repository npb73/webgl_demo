import type { WindowEffect } from "../components/PaperWindow/PaperWindow";

export type MilkdropDemoInfo = {
  effect: WindowEffect;
  windowTitle: string;
  preset: string;
};

// Пресеты из коллекции butterchurn-presets: от каждого берём только движение.
export const milkdropDemos: MilkdropDemoInfo[] = [
  {
    effect: "milkdrop-sherwin",
    windowTitle: "sherwin.milk",
    // Имя пресета — ровно как в репозитории butterchurn-presets.
    preset: "Flexi, martin + geiss - dedicated to the sherwin maxawow",
  },
  {
    effect: "milkdrop-cauldron",
    windowTitle: "cauldron.milk",
    // Имя пресета — ровно как в репозитории butterchurn-presets.
    preset: "Geiss - Cauldron - painterly 2 (saturation remix)",
  },
  {
    effect: "milkdrop-spiral",
    windowTitle: "spiral.milk",
    // Имя пресета — ровно как в репозитории butterchurn-presets.
    preset: "Krash + Illusion - Spiral Movement",
  },
  {
    effect: "milkdrop-harlequin",
    windowTitle: "harlequin.milk",
    // Имя пресета — ровно как в репозитории butterchurn-presets.
    preset: "Rovastar - Harlequin′s Fractal Encounter - cancer of saints",
  },
  {
    effect: "milkdrop-feathers",
    windowTitle: "feathers.milk",
    // Имя пресета — ровно как в репозитории butterchurn-presets.
    preset: "bdrv + al shifter - feathers (angel wings)_phat_remix4 bdrv et  AL  rmxmix bdrv et.AL5",
  },
  {
    effect: "milkdrop-sunflower",
    windowTitle: "sunflower.milk",
    // Имя пресета — ровно как в репозитории butterchurn-presets.
    preset: "suksma - Rovastar - Sunflower Passion (Enlightment Mix)_Phat_edit + flexi und martin shaders - circumflex in character classes in regular expression",
  },
];
