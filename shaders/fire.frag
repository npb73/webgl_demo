#version 300 es
precision highp float;

uniform sampler2D u_page;   // всё, что лежит под окном
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_strength;   // 0 → 1: пламя разгорается

in vec2 v_uv;
out vec4 outColor;

vec3 page(vec2 uv) {
  return texture(u_page, vec2(uv.x, 1.0 - uv.y)).rgb;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Плавный шум: случайные значения в узлах сетки, сглаженные между ними.
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

// Фрактальный шум: несколько октав шума — крупные языки и мелкие всполохи.
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p *= 2.03;
    amplitude *= 0.5;
  }
  return value;
}

// Цвет по «температуре»: тёмно-красный → оранжевый → жёлтый → белый.
vec3 flameColor(float heat) {
  return clamp(vec3(1.6 * heat, 1.4 * heat * heat, 1.2 * pow(heat, 4.0)), 0.0, 1.0);
}

void main() {
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 p = v_uv * aspect;
  float t = u_time;

  // Шум течёт вверх, а сам себя слегка искривляет — так языки извиваются.
  vec2 q = vec2(p.x * 3.2, p.y * 2.2 - t * 1.7);
  float n = fbm(q + vec2(fbm(q * 0.7 + vec2(0.0, -t * 0.6)) * 1.4, 0.0));

  // Чем выше, тем меньше «топлива»: пламя гаснет к верху окна.
  float height = 0.62 * u_strength;
  float heat = n * 1.25 - v_uv.y / max(height, 0.02) + 0.25;
  heat = clamp(heat, 0.0, 1.0);

  // Марево: над огнём страница дрожит, сильнее всего у самого пламени.
  float haze = smoothstep(height + 0.35, 0.0, v_uv.y) * u_strength;
  vec2 shimmer = vec2(noise(p * 9.0 + vec2(0.0, -t * 3.0)), noise(p * 9.0 + vec2(5.2, -t * 2.6))) - 0.5;
  vec3 color = page(v_uv + shimmer * 0.012 * haze / aspect);

  // Отсвет пламени на бумаге и копоть у самого низа.
  color *= mix(vec3(1.0), vec3(1.15, 0.92, 0.75), haze * 0.6);
  color *= 1.0 - smoothstep(0.25, 0.0, v_uv.y) * 0.35 * u_strength;

  float alpha = smoothstep(0.08, 0.45, heat);
  color = mix(color, flameColor(heat), alpha);

  outColor = vec4(color, 1.0);
}
