#version 300 es
precision highp float;

uniform sampler2D u_previous;  // прошлый кадр окна
uniform sampler2D u_page;      // страница под окном (HTML-in-Canvas)
uniform float u_inject;        // доля свежей страницы в каждом кадре
uniform float u_color;         // доля краски, которая оседает на шлейфе за кадр
uniform float u_hue;           // базовый оттенок пресета, 0..1
uniform int u_mode;            // цветовой эффект пресета, см. paint()
uniform float u_time;          // секунды

in vec2 v_screen;
in vec2 v_source;
out vec4 outColor;

// Косинусная палитра: t 0..1 обходит круг оттенков.
vec3 palette(float t) {
  return 0.5 + 0.5 * cos(6.2832 * (t + vec3(0.0, 0.33, 0.67)));
}

// Цвет, к которому тянется шлейф. luma — яркость прошлого кадра,
// p — координаты от центра окна (−1..1), t — время в секундах.
vec3 paint(float luma, vec2 p, float t) {
  float h = u_hue;
  if (u_mode == 1) {
    // Тепловая карта: тёмное — багровое, светлое — жёлтое, как угли.
    vec3 heat = clamp(vec3(luma * 2.2, luma * 1.6 - 0.35, luma * 3.0 - 2.1), 0.0, 1.0);
    return mix(heat, palette(h + 0.05 * sin(t)), 0.25);
  }
  if (u_mode == 2) {
    // Радуга по углу вокруг центра, вращается вместе со спиралью.
    float angle = atan(p.y, p.x) / 6.2832;
    return palette(h + angle + 0.15 * t) * luma * 1.2;
  }
  if (u_mode == 3) {
    // Арлекин: ромбы двух контрастных цветов, меняются местами.
    vec2 d = abs(fract(vec2(p.x + p.y, p.x - p.y) * 2.0 + 0.1 * t) - 0.5);
    float cell = step(0.25, d.x) == step(0.25, d.y) ? 0.0 : 0.5;
    return palette(h + cell + 0.03 * t) * luma * 1.15;
  }
  if (u_mode == 4) {
    // Дуотон: тени уходят в синий, светлое — в розовый.
    vec3 shadow = palette(h + 0.05 * sin(0.4 * t));
    vec3 light = palette(h + 0.35 + 0.05 * sin(0.3 * t));
    return mix(shadow * 0.6, light * 1.1, smoothstep(0.2, 0.9, luma));
  }
  if (u_mode == 5) {
    // Подсолнух: кольца расходятся от центра.
    float rings = length(p) * 3.0 - 0.6 * t;
    return palette(h + 0.12 * sin(6.2832 * rings)) * luma * 1.2;
  }
  // По умолчанию: оттенок плавно плывёт по диагонали окна.
  return palette(h + 0.08 * t + 0.125 * (p.x - p.y)) * luma * 1.15;
}

// Цикл обратной связи, как в Milkdrop: прошлый кадр чуть сдвигается
// по полю движения пресета, к нему подмешивается свежая страница.
// Краска оседает только на шлейфе: свежая страница каждый кадр
// перекрывает её, поэтому текст под окном остаётся читаемым.
void main() {
  vec3 previous = texture(u_previous, v_source).rgb;
  vec3 page = texture(u_page, v_screen).rgb;
  float luma = dot(previous, vec3(0.299, 0.587, 0.114));
  previous = mix(previous, paint(luma, v_screen * 2.0 - 1.0, u_time), u_color);
  outColor = vec4(mix(previous, page, u_inject), 1.0);
}
