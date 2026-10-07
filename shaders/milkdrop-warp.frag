#version 300 es
precision highp float;

uniform sampler2D u_previous;  // прошлый кадр окна
uniform sampler2D u_page;      // страница под окном (HTML-in-Canvas)
uniform float u_inject;        // доля свежей страницы в каждом кадре

in vec2 v_screen;
in vec2 v_source;
out vec4 outColor;

// Цикл обратной связи, как в Milkdrop: прошлый кадр чуть сдвигается
// по полю движения пресета, и к нему подмешивается свежая страница.
// Своих цветов нет — всё, что на экране, взято со страницы.
void main() {
  vec3 previous = texture(u_previous, v_source).rgb;
  vec3 page = texture(u_page, v_screen).rgb;
  outColor = vec4(mix(previous, page, u_inject), 1.0);
}
