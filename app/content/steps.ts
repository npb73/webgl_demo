export type Step = {
  title: string;
  text: string;
  filename: string;
  code: string;
};

export const steps: Step[] = [
  {
    title: "Получить контекст",
    text: "Никакой магии: обычный `<canvas>` и `getContext`. Объект `gl` — вся ваша связь с GPU. Опции (`antialias`, `alpha`, `powerPreference`, `preserveDrawingBuffer`) задаются один раз — при создании контекста.",
    filename: "main.js",
    code: `
const canvas = document.querySelector("canvas");
const gl = canvas.getContext("webgl2", { antialias: true });

if (!gl) {
  throw new Error("WebGL 2 недоступен");
}`,
  },
  {
    title: "Написать шейдеры",
    text: "Две маленькие программы на GLSL — это просто строки, их компилирует драйвер. Vertex shader запускается для каждой вершины и возвращает её позицию в clip space (от −1 до 1). Fragment shader запускается для каждого пикселя и возвращает цвет.",
    filename: "shaders.glsl",
    code: `
// vertex shader
#version 300 es
in vec2 a_position;
in vec3 a_color;
out vec3 v_color;

void main() {
  v_color = a_color;
  gl_Position = vec4(a_position, 0.0, 1.0);
}

// fragment shader
#version 300 es
precision highp float;
in vec3 v_color;
out vec4 outColor;

void main() {
  outColor = vec4(v_color, 1.0);
}`,
  },
  {
    title: "Скомпилировать и слинковать",
    text: "Ошибки компиляции сами не бросаются — их нужно спросить. Пропущенная проверка — самая частая причина «почему просто чёрный экран».",
    filename: "program.js",
    code: `
function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

const program = gl.createProgram();
gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vsSource));
gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fsSource));
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  throw new Error(gl.getProgramInfoLog(program));
}`,
  },
  {
    title: "Загрузить данные",
    text: "GPU не знает про объекты и массивы JS — только про байты. Буфер — это байты в видеопамяти, `vertexAttribPointer` объясняет шейдеру, как их читать. VAO запоминает эту разметку, чтобы не повторять её каждый кадр.",
    filename: "geometry.js",
    code: `
// x, y, r, g, b — данные одной вершины подряд (interleaved)
const vertices = new Float32Array([
   0.0,  0.6,   1.0, 0.3, 0.3,
  -0.6, -0.5,   0.3, 1.0, 0.3,
   0.6, -0.5,   0.3, 0.3, 1.0,
]);

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

const stride = 5 * Float32Array.BYTES_PER_ELEMENT;

const aPosition = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(aPosition);
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, stride, 0);

const aColor = gl.getAttribLocation(program, "a_color");
gl.enableVertexAttribArray(aColor);
gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, stride, 8);`,
  },
  {
    title: "Нарисовать",
    text: "Один draw call — и на экране треугольник с плавным градиентом: цвета между вершинами GPU интерполирует сам. Для анимации — тот же код внутри `requestAnimationFrame` с обновлением uniform-ов.",
    filename: "render.js",
    code: `
gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
gl.clearColor(0.99, 0.98, 0.96, 1);
gl.clear(gl.COLOR_BUFFER_BIT);

gl.useProgram(program);
gl.bindVertexArray(vao);
gl.drawArrays(gl.TRIANGLES, 0, 3);`,
  },
];

export const resizeSnippet = `
const observer = new ResizeObserver(([entry]) => {
  const dpr = Math.min(window.devicePixelRatio, 2);
  canvas.width = Math.round(entry.contentRect.width * dpr);
  canvas.height = Math.round(entry.contentRect.height * dpr);
  gl.viewport(0, 0, canvas.width, canvas.height);
});

observer.observe(canvas);`;

export const contextLostSnippet = `
canvas.addEventListener("webglcontextlost", (event) => {
  event.preventDefault(); // без этого контекст не восстановится
  cancelAnimationFrame(frameId);
});

canvas.addEventListener("webglcontextrestored", () => {
  initResources(); // шейдеры, буферы, текстуры — заново
  frameId = requestAnimationFrame(render);
});`;
