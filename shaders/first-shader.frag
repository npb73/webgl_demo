#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 outColor;

// Выполняется для каждого пикселя: координата + время → цвет.
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec3 color = 0.5 + 0.5 * cos(u_time + uv.xyx + vec3(0.0, 2.0, 4.0));
  outColor = vec4(color, 1.0);
}
