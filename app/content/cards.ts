// Карточки товаров на слайде «Коллекционные карточки»: у каждой свой шейдерный
// эффект (см. shaders/product-card.frag) и своя расцветка под него.
export type CardEffect = "holo" | "gold" | "prism";

export type ProductCard = {
  id: string;
  effect: CardEffect;
  /** Название эффекта — «редкость» в углу карточки. */
  effectName: string;
  /** Расцветка: золотой фольге нужна тёмная карточка, остальным — светлая. */
  theme: "pearl" | "night" | "ice";
  kind: string;
  name: string;
  description: string;
  emoji: string;
  price: string;
  rating: string;
  /** Коллекционный номер, как на настоящих карточках. */
  number: string;
};

export const productCards: ProductCard[] = [
  {
    id: "hoodie",
    effect: "holo",
    effectName: "Голограмма",
    theme: "pearl",
    kind: "Одежда",
    name: "Худи «gl_FragColor»",
    description: "Тёплое, как vec4(1.0). Переливается при каждом наклоне.",
    emoji: "🧥",
    price: "4 990 ₽",
    rating: "4,8",
    number: "№ 007 / 150",
  },
  {
    id: "keyboard",
    effect: "gold",
    effectName: "Золотая фольга",
    theme: "night",
    kind: "Техника",
    name: "Клавиатура «Draw Call»",
    description: "Один вызов — миллион нажатий. Буквы из золотой фольги.",
    emoji: "⌨️",
    price: "12 900 ₽",
    rating: "4,9",
    number: "№ 001 / 50",
  },
  {
    id: "stickers",
    effect: "prism",
    effectName: "Призма",
    theme: "ice",
    kind: "Канцелярия",
    name: "Наклейки GLSL",
    description: "Набор из 24 наклеек. Каждая грань ловит свет по-своему.",
    emoji: "✨",
    price: "390 ₽",
    rating: "4,7",
    number: "№ 042 / 300",
  },
];
