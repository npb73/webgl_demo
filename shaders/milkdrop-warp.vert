#version 300 es

// Сетка Milkdrop 48×36: каждый узел знает своё место на экране
// и то, откуда по уравнениям пресета брать прошлый кадр.
in vec2 a_screen;  // 0..1, y вниз
in vec2 a_source;  // 0..1, y вверх — как в Milkdrop и в текстурах WebGL

// Во сколько раз усилить сдвиг: за кадр пресет двигает картинку
// на доли процента и рассчитан на сотни кадров без «подкрашивания».
uniform float u_motion;

out vec2 v_screen;
out vec2 v_source;

void main() {
  v_screen = a_screen;
  // Без движения узел берёт кадр из своего же места.
  vec2 still = vec2(a_screen.x, 1.0 - a_screen.y);
  v_source = still + (a_source - still) * u_motion;
  gl_Position = vec4(a_screen.x * 2.0 - 1.0, 1.0 - a_screen.y * 2.0, 0.0, 1.0);
}
