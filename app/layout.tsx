import type { Metadata } from "next";
import { Caveat, JetBrains_Mono, Neucha } from "next/font/google";
import "./globals.scss";

const caveat = Caveat({
  variable: "--font-hand",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
});

const neucha = Neucha({
  variable: "--font-body",
  subsets: ["latin", "cyrillic"],
  weight: "400",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-code",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "WebGL — дневник фронтендера",
  description:
    "Что такое WebGL, откуда он взялся и как нарисовать первый треугольник. Заметки для опытных фронтенд-разработчиков.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${caveat.variable} ${neucha.variable} ${jetbrainsMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
