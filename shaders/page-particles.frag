#version 300 es
precision highp float;

uniform sampler2D u_texture;  // старая страница
uniform vec2 u_viewport;

in vec2 v_center;
in float v_extent;
in float v_alpha;
out vec4 outColor;

void main() {
  // gl_PointCoord считает y от верха буфера, а цель лежит перевёрнутой:
  // верх экрана в ней — нижняя строка.
  vec2 coord = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
  vec2 source = v_center + (coord - 0.5) * v_extent;
  outColor = texture(u_texture, source / u_viewport) * v_alpha;
}
