import type { NextConfig } from "next";

// На GitHub Pages сайт живёт в подпапке: npb73.github.io/webgl_demo/.
// Путь передаёт workflow деплоя; локально он пустой, и dev-сервер
// открывается как обычно — на localhost:3000.
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // Статический сайт: next build собирает HTML, CSS, JS и шейдеры в out/.
  output: "export",
  basePath,
  env: {
    // basePath не применяется к нашим fetch() — их префиксует assetPath().
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
