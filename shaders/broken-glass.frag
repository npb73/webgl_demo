#version 300 es
precision highp float;

uniform sampler2D u_page;   // всё, что лежит под окном
uniform vec2 u_resolution;
uniform float u_strength;   // 0 → 1: трещины разбегаются от точки удара

in vec2 v_uv;
out vec4 outColor;

const float TAU = 6.2831853;
const float SECTORS = 12.0;      // радиальных трещин от точки удара
const float RING_GROWTH = 1.6;   // каждое следующее кольцо осколков шире прошлого
const vec2 IMPACT = vec2(0.43, 0.57);

vec3 page(vec2 uv) {
  return texture(u_page, vec2(uv.x, 1.0 - uv.y)).rgb;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 impact = IMPACT * aspect;
  vec2 d = v_uv * aspect - impact;
  float r = max(length(d), 1e-4);
  float angle = atan(d.y, d.x);

  // Осколки — «паутина»: прямые трещины от точки удара и поперечные
  // трещины между ними. Поперечная трещина — отрезок, перпендикулярный оси
  // своего сектора, поэтому осколки получаются угловатыми, как у стекла.
  float wobble = (noise(vec2(r * 3.0, 3.0)) - 0.5) * 0.12;
  float s = (angle + wobble) / TAU * SECTORS;
  float sector = floor(s);
  float axis = (sector + 0.5) / SECTORS * TAU - wobble;
  float along = max(r * cos(angle - axis), 1e-4);
  float ringCoord = log(along / 0.03) / log(RING_GROWTH)
    + (hash(vec2(sector, 7.0)) - 0.5) * 0.9;
  float ring = floor(ringCoord);
  vec2 shard = vec2(mod(sector, SECTORS), ring);

  // Трещины разбегаются от центра, пока окно открывается.
  float reveal = smoothstep(u_strength * 1.6, u_strength * 1.6 - 0.15, r);

  // Каждый осколок чуть повёрнут вокруг точки удара и сдвинут —
  // поэтому строки текста под ним ломаются на границах.
  float turn = (hash(shard + 5.7) - 0.5) * 0.05 * reveal;
  vec2 shift = (vec2(hash(shard), hash(shard + 3.1)) - 0.5) * 0.025 * reveal;
  vec2 source = impact + mat2(cos(turn), sin(turn), -sin(turn), cos(turn)) * d + shift;
  vec3 color = page(source / aspect);
  // Каждый осколок ловит свет по-своему — лёгкий блик разной силы.
  color = mix(color, vec3(1.0), hash(shard + 9.3) * 0.12 * reveal);

  // Расстояние до ближайшей трещины в пикселях: по сектору (дуга) и по кольцу.
  float toRadial = min(fract(s), 1.0 - fract(s)) * TAU / SECTORS * r;
  float toRing = min(fract(ringCoord), 1.0 - fract(ringCoord)) * along * log(RING_GROWTH);
  float pixels = min(toRadial, toRing) * u_resolution.y;
  float crack = (1.0 - smoothstep(0.5, 1.8, pixels)) * reveal;

  // Трещина — светлая линия с тенью рядом; в точке удара стекло раскрошено.
  float shadow = (1.0 - smoothstep(1.8, 3.5, pixels)) * reveal;
  color *= 1.0 - shadow * 0.15;
  color = mix(color, vec3(1.0), crack * 0.85);
  color = mix(color, vec3(0.95), smoothstep(0.035, 0.0, r) * reveal);

  outColor = vec4(color, 1.0);
}
