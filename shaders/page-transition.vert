#version 300 es

// Переход между слайдами. Страница здесь — не прямоугольник, а сетка из
// треугольников: каждую вершину можно поставить куда угодно в 3D, а
// текстура страницы едет вместе с ней.
uniform vec2 u_viewport;    // размер экрана в CSS-пикселях
uniform ivec2 u_grid;       // клеток сетки по x и y
uniform int u_mode;         // 0 — лист под загибом, 1 — загибающийся лист, 2 — грань куба
uniform float u_progress;   // 0 → 1
uniform float u_direction;  // куб: 1 — листаем вниз, −1 — вверх
uniform float u_face;       // куб: 0 — старая страница, 1 — новая

out vec2 v_uv;
out float v_light;   // 1 — поверхность смотрит на нас, меньше — отвернулась
out float v_back;    // 1 — видна обратная сторона листа
out float v_shadow;  // тень от загиба на нижнем листе

const float PI = 3.1415927;
const float HALF_PI = 1.5707963;
// Куда уходит лист: правый нижний угол поднимается первым.
const vec2 CURL_NORMAL = vec2(0.94, 0.34);

// Два треугольника на клетку сетки.
const ivec2 CORNERS[6] = ivec2[6](
  ivec2(0, 0), ivec2(1, 0), ivec2(0, 1),
  ivec2(0, 1), ivec2(1, 0), ivec2(1, 1)
);

vec3 curl(vec2 p, float line, float radius, out float angle) {
  // Насколько точка ушла за линию сгиба. До линии лист лежит плоско,
  // за ней наматывается на цилиндр и ложится обратно перевёрнутым.
  float d = dot(p, CURL_NORMAL) - line;
  angle = clamp(d / radius, 0.0, PI);
  if (d <= 0.0) return vec3(p, 0.0);
  float along = d < PI * radius ? radius * sin(angle) : PI * radius - d;
  float lift = radius * (1.0 - cos(angle));
  return vec3(p - CURL_NORMAL * (d - along), lift);
}

// Перспектива: камера смотрит на центр экрана, z = 0 — плоскость экрана.
// Цель — текстура, которую сцена читает сверху вниз, поэтому y экрана
// уходит в clip space без переворота.
vec4 project(vec3 p) {
  float camera = 2.0 * max(u_viewport.x, u_viewport.y);
  float w = (camera - p.z) / camera;
  vec2 ndc = p.xy / u_viewport * 2.0 - 1.0;
  return vec4(ndc, -p.z / (2.0 * camera) * w, w);
}

void main() {
  int cell = gl_VertexID / 6;
  ivec2 node = ivec2(cell % u_grid.x, cell / u_grid.x) + CORNERS[gl_VertexID % 6];
  vec2 uv = vec2(node) / vec2(u_grid);
  vec2 p = uv * u_viewport;
  v_uv = uv;
  v_light = 1.0;
  v_back = 0.0;
  v_shadow = 0.0;

  if (u_mode == 2) {
    // Куб: грань высотой с экран поворачивается вокруг горизонтальной оси,
    // новая страница приходит снизу (сверху, если листаем назад).
    float angle = u_direction * HALF_PI * (u_progress - u_face);
    float mid = u_viewport.y * 0.5;
    float y = p.y - mid;
    vec3 q = vec3(
      p.x,
      mid + y * cos(angle) - mid * sin(angle),
      y * sin(angle) + mid * cos(angle) - mid
    );
    // На середине поворота куб отъезжает назад — видно, что это объём.
    q.z -= sin(PI * u_progress) * u_viewport.y * 0.4;
    // Свет сверху: грань, повёрнутая вверх, светлее той, что смотрит вниз.
    v_light = clamp(0.35 + 0.65 * (cos(angle) + 0.6 * sin(angle)), 0.0, 1.0);
    gl_Position = project(q);
    return;
  }

  // Лист: линия сгиба идёт от дальнего угла экрана до места, где лист
  // целиком перевернулся и ушёл за левый край.
  float radius = 0.08 * max(u_viewport.x, u_viewport.y);
  float line = mix(dot(u_viewport, CURL_NORMAL), -PI * radius, u_progress);

  if (u_mode == 0) {
    // Нижний лист лежит плоско, рядом с загибом на него падает тень.
    float d = dot(p, CURL_NORMAL) - line;
    v_shadow = 0.35 * smoothstep(0.0, radius, d) * (1.0 - smoothstep(radius, 3.0 * radius, d));
    gl_Position = project(vec3(p, 0.0));
    return;
  }

  float angle;
  vec3 q = curl(p, line, radius, angle);
  // Свет — от зрителя: чем сильнее поверхность отвёрнута, тем она темнее.
  v_light = 0.6 + 0.4 * abs(cos(angle));
  v_back = step(HALF_PI, angle);
  gl_Position = project(q);
}
