// Пресеты Milkdrop из коллекции butterchurn-presets (её же использует Webamp).
// Грузятся по требованию: каждый — небольшой JSON.
export type MilkdropPresetId =
  | "sherwin"
  | "cauldron"
  | "spiral"
  | "harlequin"
  | "feathers"
  | "sunflower";

export const presetLoaders: Record<MilkdropPresetId, () => Promise<{ default: object }>> = {
  sherwin: () => import("./presets/sherwin-maxawow.json"),
  cauldron: () => import("./presets/cauldron-painterly.json"),
  spiral: () => import("./presets/spiral-movement.json"),
  harlequin: () => import("./presets/harlequin.json"),
  feathers: () => import("./presets/feathers.json"),
  sunflower: () => import("./presets/sunflower-passion.json"),
};

/** Поля пресета, которые трогают поправки ниже. */
type MilkdropPreset = {
  baseVals: Record<string, number>;
  pixel_eqs_eel: string;
};

/** Убирает из уравнений узлов все присваивания переменной. */
const dropAssignments = (equations: string, variable: string) =>
  equations.replace(new RegExp(`\\b${variable}\\s*=[^;]*;\\s*`, "g"), "");

// Наши поправки поверх оригинальных пресетов. Сами JSON не трогаем —
// они остаются точными копиями из butterchurn-presets.
export const presetTweaks: Partial<Record<MilkdropPresetId, (preset: MilkdropPreset) => MilkdropPreset>> = {
  // Без закручивания: убираем поворот плиток шахматки и базовое вращение,
  // остаются зум плиток и дрейф центра.
  harlequin: (preset) => ({
    ...preset,
    baseVals: { ...preset.baseVals, rot: 0 },
    pixel_eqs_eel: dropAssignments(preset.pixel_eqs_eel, "rot"),
  }),
};
