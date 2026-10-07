#version 300 es
precision highp float;

uniform sampler2D u_page;   // участок страницы ровно под canvas
uniform vec2 u_resolution;  // размер canvas в пикселях
uniform float u_strength;   // k: 0 — плоское стекло, 0.6 — заметный fish-eye

in vec2 v_uv;
out vec4 outColor;

const float RADIUS = 0.92;      // радиус линзы в половинах высоты canvas
const float DISPERSION = 0.06;  // насколько по-разному преломляются R, G и B

// Строки текстуры идут сверху вниз, а v_uv — снизу вверх.
vec3 page(vec2 uv) {
  return texture(u_page, vec2(uv.x, 1.0 - uv.y)).rgb;
}

// Fish-eye: точка на расстоянии r от центра берёт цвет из r·(1 − k + k·r²).
// В центре увеличение 1 / (1 − k), к краю картинка сжимается,
// а при r = 1 смещение пропадает — линза переходит в плоское стекло.
vec2 fisheye(vec2 p, float k) {
  float r = length(p) / RADIUS;
  if (r >= 1.0) return p;
  return p * (1.0 - k + k * r * r);
}

void main() {
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  // Координаты относительно центра: по вертикали от −1 до 1, без искажения пропорций.
  vec2 p = (v_uv * 2.0 - 1.0) * aspect;
  vec2 toUv = 0.5 / aspect;

  // Каждый канал — со своим k: по краю линзы появляется радужная кайма.
  float k = u_strength;
  vec3 color = vec3(
    page(fisheye(p, k * (1.0 + DISPERSION)) * toUv + 0.5).r,
    page(fisheye(p, k) * toUv + 0.5).g,
    page(fisheye(p, k * (1.0 - DISPERSION)) * toUv + 0.5).b
  );

  // Немного «стекла»: тонкий тёмный обод и блик слева сверху.
  float r = length(p) / RADIUS;
  float rim = smoothstep(0.9, 1.0, r) * (1.0 - smoothstep(1.0, 1.03, r));
  float glare = 1.0 - smoothstep(0.0, 0.45, length(p - vec2(-0.38, 0.42)));
  color = mix(color, vec3(0.12, 0.23, 0.55), rim * 0.35 * u_strength / 0.6);
  color += glare * 0.10 * u_strength / 0.6;

  outColor = vec4(color, 1.0);
}
