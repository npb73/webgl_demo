#version 300 es

// Ни одного буфера: три вершины одного большого треугольника,
// который накрывает весь экран, считаются прямо из gl_VertexID.
void main() {
  vec2 corner = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
