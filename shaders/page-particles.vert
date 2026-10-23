#version 300 es

// Старая страница рассыпается на точки: каждая точка — квадратик страницы
// u_cell × u_cell CSS-пикселей. Новая страница уже лежит под ними.
uniform vec2 u_viewport;     // размер экрана в CSS-пикселях
uniform int u_columns;       // точек в строке
uniform float u_cell;
uniform float u_pixelRatio;
uniform float u_progress;    // 0 → 1
uniform float u_direction;   // 1 — листаем вниз: точки уносит вверх

out vec2 v_center;  // откуда точка взята, в CSS-пикселях
out float v_extent; // какой участок страницы она показывает
out float v_alpha;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Та же камера, что у листа и куба (см. page-transition.vert).
vec4 project(vec3 p) {
  float camera = 2.0 * max(u_viewport.x, u_viewport.y);
  float w = (camera - p.z) / camera;
  vec2 ndc = p.xy / u_viewport * 2.0 - 1.0;
  return vec4(ndc, -p.z / (2.0 * camera) * w, w);
}

void main() {
  vec2 cell = vec2(gl_VertexID % u_columns, gl_VertexID / u_columns);
  vec2 center = (cell + 0.5) * u_cell;
  float h1 = hash(cell);
  float h2 = hash(cell + 17.0);
  float h3 = hash(cell + 41.0);

  // Фронт идёт волной в сторону листания, край у него рваный. Каждая точка
  // стартует в [0; 0.6] и летит 0.4 — к концу перехода улетают все.
  vec2 at = center / u_viewport;
  float front = u_direction > 0.0 ? at.y : 1.0 - at.y;
  float start = 0.4 * front + 0.05 + 0.05 * sin(at.x * 9.0) + 0.1 * h1;
  float life = clamp((u_progress - start) / 0.4, 0.0, 1.0);

  // Точка разгоняется, как от порыва ветра: вбок, в сторону листания и к нам.
  float k = life * life;
  vec3 p = vec3(center, 0.0) + vec3(
    ((h2 - 0.35) * 0.6 * u_viewport.x + 40.0 * sin(6.2832 * h3 + life * 5.0)) * k,
    -u_direction * (0.3 + 0.7 * h3) * u_viewport.y * k,
    0.6 * h1 * u_viewport.y * k
  );
  float scale = 1.0 - 0.7 * life;

  vec4 clip = project(p);
  float zoom = u_pixelRatio * scale / clip.w;  // пикселей буфера на CSS-пиксель
  // +1 пиксель: соседние точки чуть перекрываются, и в покое нет щелей.
  float size = u_cell * zoom + 1.0;
  // Гаснут рано: иначе кусочки пустой бумаги долго висят над новой страницей.
  v_alpha = 1.0 - smoothstep(0.1, 0.8, life);
  gl_Position = clip;
  gl_PointSize = v_alpha > 0.0 ? size : 0.0;
  v_center = center;
  v_extent = size / zoom;
}
