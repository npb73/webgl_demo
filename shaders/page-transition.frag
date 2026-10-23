#version 300 es
precision highp float;

uniform sampler2D u_texture;  // страница: старая или новая

in vec2 v_uv;
in float v_light;
in float v_back;
in float v_shadow;
out vec4 outColor;

void main() {
  vec4 color = texture(u_texture, v_uv);
  // Бумага тонкая: с обратной стороны текст еле просвечивает, зеркально.
  if (v_back > 0.5) color.rgb = mix(color.rgb, vec3(color.a), 0.85);
  color.rgb *= v_light * (1.0 - v_shadow);
  outColor = color;
}
