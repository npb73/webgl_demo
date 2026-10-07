#version 300 es

// Полноэкранный треугольник, как в первом шейдере,
// плюс UV: (0, 0) — левый нижний угол canvas, (1, 1) — правый верхний.
out vec2 v_uv;

void main() {
  vec2 corner = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  v_uv = corner;
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
