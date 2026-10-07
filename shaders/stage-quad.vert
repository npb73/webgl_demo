#version 300 es

// Прямоугольник слоя (страница, рамка окна или его содержимое).
// u_rect — где он лежит внутри слоя, u_matrix переводит слой на экран,
// u_region — какой участок экрана сейчас рисуется в цель.
uniform vec4 u_rect;
uniform mat3 u_matrix;
uniform vec4 u_region;
uniform float u_flipTarget;  // 1: цель читается сверху вниз (подложка для линзы)
uniform float u_flipSource;  // 1: текстура лежит снизу вверх (результат эффекта)

out vec2 v_uv;

void main() {
  vec2 corner = vec2(gl_VertexID & 1, (gl_VertexID >> 1) & 1);
  vec2 screen = (u_matrix * vec3(u_rect.xy + corner * u_rect.zw, 1.0)).xy;
  vec2 clip = (screen - u_region.xy) / u_region.zw * 2.0 - 1.0;
  // На экране y растёт вниз, в clip space — вверх.
  clip.y = mix(-clip.y, clip.y, u_flipTarget);

  v_uv = vec2(corner.x, mix(corner.y, 1.0 - corner.y, u_flipSource));
  gl_Position = vec4(clip, 0.0, 1.0);
}
