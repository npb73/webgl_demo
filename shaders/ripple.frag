#version 300 es
precision highp float;

uniform sampler2D u_page;   // всё, что лежит под окном
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_strength;   // 0 → 1, пока окно открывается

in vec2 v_uv;
out vec4 outColor;

const int SOURCES = 3;
const float WAVE_NUMBER = 40.0;  // сколько радиан фазы на высоту окна
const float SPEED = 4.0;         // радиан фазы в секунду
const float AMPLITUDE = 0.006;   // насколько сильно вода сдвигает картинку

vec3 page(vec2 uv) {
  return texture(u_page, vec2(uv.x, 1.0 - uv.y)).rgb;
}

void main() {
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 p = v_uv * aspect;

  // Поверхность воды — сумма круговых волн от плавающих источников.
  // Нам нужна не высота, а её наклон (градиент): по нему свет преломляется.
  vec2 slope = vec2(0.0);
  for (int i = 0; i < SOURCES; i++) {
    float fi = float(i);
    vec2 source = aspect * (0.5 + 0.3 * vec2(
      cos(u_time * 0.31 + fi * 2.1),
      sin(u_time * 0.23 + fi * 1.7)
    ));
    vec2 d = p - source;
    float dist = length(d);
    float phase = dist * WAVE_NUMBER - u_time * SPEED + fi * 1.3;
    slope += d / max(dist, 1e-4) * cos(phase) * exp(-dist * 2.2);
  }
  slope *= u_strength;

  // Преломление: пиксель берёт цвет чуть в стороне — по наклону воды.
  vec3 color = page(v_uv + slope * AMPLITUDE / aspect);

  // Вода холоднее бумаги, а на гребнях, повёрнутых к свету, — блики.
  vec3 normal = normalize(vec3(-slope * 0.35, 1.0));
  float highlight = pow(max(dot(normal, normalize(vec3(-0.4, 0.5, 1.0))), 0.0), 60.0);
  color = mix(color, color * vec3(0.82, 0.93, 1.04), 0.4 * u_strength);
  color += highlight * 0.35 * u_strength;

  outColor = vec4(color, 1.0);
}
