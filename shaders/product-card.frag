#version 300 es
precision highp float;
// u_mode есть и в вершинном шейдере, а там int по умолчанию highp. Без этой
// строки точности разойдутся, и программа не слинкуется.
precision highp int;

uniform sampler2D u_texture;  // снимок карточки (HTML-in-Canvas), premultiplied
uniform int u_mode;           // 0 — тень, 1 — карточка
uniform int u_effect;         // 0 — голограмма, 1 — золотая фольга, 2 — призма
uniform vec4 u_rect;          // x, y, ширина, высота карточки в CSS-пикселях
uniform vec2 u_pointer;       // где указатель на карточке, 0..1
uniform float u_hover;        // 0 → 1, пока на карточку навели

in vec2 v_uv;
in vec3 v_normal;
in vec2 v_local;
out vec4 outColor;

const float RADIUS = 18.0;  // как border-radius карточки в CSS

float roundedBox(vec2 p, vec2 halfSize, float r) {
  vec2 q = abs(p) - halfSize + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec3 rainbow(float t) {
  return 0.5 + 0.5 * cos(6.2832 * (t + vec3(0.0, 0.33, 0.67)));
}

float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

// Цвет снимка без premultiplied: эффекты считаются по настоящему цвету.
vec3 card(vec2 uv) {
  vec4 c = texture(u_texture, uv);
  return c.a > 0.0 ? c.rgb / c.a : vec3(0.0);
}

void main() {
  if (u_mode == 0) {
    // Мягкая тень: расстояние до скруглённого прямоугольника, размытое по краю.
    float blur = mix(10.0, 26.0, u_hover);
    float d = roundedBox(v_local, u_rect.zw * 0.5, RADIUS);
    float a = (1.0 - smoothstep(-blur, blur, d)) * mix(0.18, 0.3, u_hover);
    outColor = vec4(vec3(0.05, 0.08, 0.2) * a, a);
    return;
  }

  float alpha = texture(u_texture, v_uv).a;
  if (alpha < 0.002) discard;
  vec3 color = card(v_uv);
  // Эффект виден и в покое, но в полную силу — под указателем.
  float strength = mix(0.45, 1.0, u_hover);
  vec2 tilt = v_normal.xy;  // куда отвернулась поверхность: от −0.25 до 0.25
  vec2 aspect = vec2(u_rect.z / u_rect.w, 1.0);

  if (u_effect == 0) {
    // Голограмма: карточка тонируется радугой, по ней от указателя расходятся
    // кольца, а узор из звёздочек вспыхивает, когда наклон попадает в их угол.
    float t = dot(v_uv, vec2(1.0, 1.4)) * 1.8 + (tilt.x - tilt.y) * 5.0 + u_pointer.x * 0.8;
    float rings = 0.5 + 0.5 * sin(length((v_uv - u_pointer) * aspect) * 40.0 - (tilt.x + tilt.y) * 10.0);
    vec3 foil = rainbow(t + rings * 0.15);
    float lines = 0.8 + 0.2 * sin((v_uv.x - v_uv.y) * 140.0);
    float amount = strength * lines * (0.35 + 0.65 * luma(color));
    color = mix(color, color * (0.55 + 0.9 * foil), amount * 0.8);
    vec2 g = v_uv * aspect * 7.0;
    vec2 f = fract(g) - 0.5;
    float star = pow(max(0.0, 1.0 - 12.0 * abs(f.x * f.y) - 1.6 * length(f)), 3.0);
    float h = hash(floor(g));
    float twinkle = 0.5 + 0.5 * sin(h * 6.2832 + (tilt.x + tilt.y) * 20.0);
    color += rainbow(t + h) * star * twinkle * strength * 0.9;
  } else if (u_effect == 1) {
    // Золотая фольга: светлые элементы на тёмной карточке (текст, рамка)
    // становятся металлом, а из-за картинки расходятся золотые лучи.
    float foil = smoothstep(0.45, 0.85, luma(color));
    float sheen = 0.5 + 0.5 * sin(v_uv.y * 9.0 - v_uv.x * 4.0 + (tilt.x + tilt.y) * 14.0);
    vec3 gold = mix(vec3(0.55, 0.36, 0.08), vec3(1.0, 0.9, 0.55), sheen);
    vec2 c = (v_uv - vec2(0.5, 0.34)) * aspect;
    float rays = smoothstep(0.55, 1.0, 0.5 + 0.5 * cos(atan(c.y, c.x) * 16.0 + (tilt.x - tilt.y) * 8.0));
    float glow = rays * (1.0 - smoothstep(0.05, 0.6, length(c))) * 0.45 * strength;
    color = mix(color, gold, max(foil * mix(0.7, 1.0, u_hover), glow));
  } else {
    // Призма: карточка бьётся на треугольные грани. Каждая сдвигает картинку
    // по-своему, а красный и синий расходятся — как свет в стекле.
    vec2 q = v_uv * aspect * 6.0;
    vec2 facet = floor(q) * 2.0 + step(fract(q.x), fract(q.y));
    float h = hash(facet);
    vec2 shift = (vec2(hash(facet + 1.3), hash(facet + 5.1)) - 0.5) * 0.02 * strength
      + tilt * (h - 0.5) * 0.06;
    vec2 spread = tilt * 0.02 + vec2(0.004) * strength;
    color = vec3(
      card(v_uv + shift + spread).r,
      card(v_uv + shift).g,
      card(v_uv + shift - spread).b
    );
    color *= 0.92 + 0.16 * h * strength;
    color = mix(color, rainbow(h + tilt.x * 2.0), 0.12 * strength);
  }

  // Общий блик: свет отражается там, куда указывает курсор.
  float glare = 1.0 - smoothstep(0.0, 0.7, length((v_uv - u_pointer) * aspect));
  color += glare * glare * 0.22 * u_hover;
  // Край, отвернувшийся от зрителя, чуть темнее — так читается наклон.
  color *= 1.0 - 0.15 * clamp(dot(tilt, v_uv - 0.5) * 6.0, 0.0, 1.0);

  outColor = vec4(clamp(color, 0.0, 1.0) * alpha, alpha);
}
