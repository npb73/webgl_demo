#version 300 es
precision mediump float;

uniform float u_alpha;

in vec3 v_color;
out vec4 outColor;

// Круглая полупрозрачная точка: в плотных местах «чернила» копятся.
void main() {
  vec2 offset = gl_PointCoord - 0.5;
  if (dot(offset, offset) > 0.25) discard;
  outColor = vec4(v_color * u_alpha, u_alpha);
}
