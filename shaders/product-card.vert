#version 300 es

// Карточка товара — прямоугольник, который поворачивается в 3D за указателем.
// Тот же шейдер рисует и мягкую тень под карточкой — она лежит на странице.
uniform vec4 u_rect;         // карточка на экране: x, y, ширина, высота (CSS-пиксели)
uniform vec4 u_region;       // какой участок экрана рисуется в цель (как в stage-quad.vert)
uniform float u_flipTarget;  // 1: цель читается сверху вниз
uniform vec2 u_tilt;         // поворот вокруг осей x и y, радианы
uniform float u_lift;        // приподнятая карточка чуть больше
uniform float u_hover;       // 0 → 1, пока на карточку навели
uniform int u_mode;          // 0 — тень, 1 — карточка

out vec2 v_uv;       // 0..1 по карточке, y вниз — как строки снимка
out vec3 v_normal;   // куда смотрит поверхность после поворота
out vec2 v_local;    // тень: точка относительно её центра, в CSS-пикселях

const float PERSPECTIVE = 1000.0;  // как perspective: 1000px в CSS
const float SHADOW_PAD = 48.0;     // насколько тень шире карточки

void main() {
  vec2 corner = vec2(gl_VertexID & 1, (gl_VertexID >> 1) & 1);
  vec2 size = u_rect.zw;
  vec2 center = u_rect.xy + size * 0.5;
  vec2 screen;
  float w = 1.0;
  v_uv = corner;
  v_normal = vec3(0.0, 0.0, 1.0);
  v_local = vec2(0.0);

  if (u_mode == 0) {
    // Тень не наклоняется, а при наведении уходит ниже и расплывается.
    vec2 local = (corner - 0.5) * (size + 2.0 * SHADOW_PAD);
    v_local = local;
    screen = center + vec2(0.0, 6.0 + 14.0 * u_hover) + local;
  } else {
    // Поворот вокруг y, потом вокруг x; центр карточки остаётся на месте.
    vec3 p = vec3((corner - 0.5) * size * u_lift, 0.0);
    float cy = cos(u_tilt.y), sy = sin(u_tilt.y);
    p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
    float cx = cos(u_tilt.x), sx = sin(u_tilt.x);
    p = vec3(p.x, p.y * cx - p.z * sx, p.y * sx + p.z * cx);
    v_normal = vec3(sy, -cy * sx, cy * cx);
    // Перспектива с точкой схода в центре карточки, как у CSS perspective.
    w = (PERSPECTIVE - p.z) / PERSPECTIVE;
    screen = center + p.xy / w;
  }

  vec2 clip = (screen - u_region.xy) / u_region.zw * 2.0 - 1.0;
  clip.y = mix(-clip.y, clip.y, u_flipTarget);
  // Умножаем на w: GPU поделит обратно и заодно интерполирует v_uv с учётом перспективы.
  gl_Position = vec4(clip * w, 0.0, w);
}
