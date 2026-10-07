export type Step = {
  title: string;
  code: string;
  hint: string;
};

// Минимальная программа — по одной ключевой строке на шаг.
export const steps: Step[] = [
  { title: "Контекст", code: 'canvas.getContext("webgl2")', hint: "все вызовы WebGL — методы этого объекта" },
  { title: "Шейдеры", code: "gl.shaderSource(shader, source)", hint: "исходник GLSL передаётся строкой" },
  { title: "Программа", code: "gl.linkProgram(program)", hint: "ошибки компиляции надо запрашивать явно" },
  { title: "Вершины", code: "gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)", hint: "копируются в память GPU" },
  { title: "Отрисовка", code: "gl.drawArrays(gl.TRIANGLES, 0, 3)", hint: "три вершины — один треугольник" },
];
