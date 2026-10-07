#version 300 es

in vec2 a_position;  // точка данных, координаты −1..1
in float a_group;    // сегмент: 0..3

uniform vec2 u_center;     // центр вида в координатах данных
uniform vec2 u_scale;      // зум с поправкой на пропорции окна
uniform float u_pointSize; // в пикселях буфера
uniform vec3 u_palette[4];

out vec3 v_color;

// Зум и сдвиг — два uniform: миллион позиций пересчитывает GPU,
// данные в видеопамяти не меняются.
void main() {
  gl_Position = vec4((a_position - u_center) * u_scale, 0.0, 1.0);
  gl_PointSize = u_pointSize;
  v_color = u_palette[int(a_group)];
}
