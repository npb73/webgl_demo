// «Музыка» без звука. Butterchurn каждый кадр ждёт 1024 отсчёта звука,
// как их отдаёт AnalyserNode: байты 0–255, тишина — 128. Из них он считает
// уровни bass, mid и treb, на которые реагируют пресеты. Мы генерируем
// отсчёты сами: бочка в случайном ритме, бродящий тон и шипение верхов.

const SAMPLES = 1024;
// Без AudioContext butterchurn считает, что звук идёт с частотой 44.1 кГц.
const SAMPLE_RATE = 44100;
const TAU = Math.PI * 2;

const toByte = (value) => Math.max(0, Math.min(255, Math.round(128 + value * 70)));
const random = (min, max) => min + Math.random() * (max - min);

export function createRandomAudio() {
  const timeByteArray = new Uint8Array(SAMPLES);
  const timeByteArrayL = new Uint8Array(SAMPLES);
  const timeByteArrayR = new Uint8Array(SAMPLES);

  let last = performance.now();
  // Бочка: удар громкостью kick, частотой kickHz; следующий — в nextKick.
  let kick = 0;
  let kickHz = 60;
  let nextKick = last;
  // Средние частоты и верхи плавно бродят к случайным целям.
  let mid = 0.3;
  let midTarget = 0.3;
  let midHz = 600;
  let treble = 0.2;
  let trebleTarget = 0.2;
  let bassPhase = 0;
  let midPhase = 0;

  return (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;

    // 90–150 ударов в минуту; иногда удар сдвоенный — ритм не механический.
    if (now >= nextKick) {
      kick = random(0.6, 1);
      kickHz = random(45, 85);
      const beat = 60000 / random(90, 150);
      nextKick = now + (Math.random() < 0.2 ? beat / 2 : beat);
    }
    kick *= Math.exp(-dt * 6);

    if (Math.random() < dt * 0.8) {
      midTarget = random(0.1, 0.6);
      midHz = random(300, 2300);
    }
    if (Math.random() < dt * 1.5) trebleTarget = random(0, 0.5);
    mid += (midTarget - mid) * Math.min(1, dt * 3);
    treble += (trebleTarget - treble) * Math.min(1, dt * 5);

    for (let i = 0; i < SAMPLES; i++) {
      const t = i / SAMPLE_RATE;
      const bass = kick * Math.sin(bassPhase + TAU * kickHz * t);
      const tone = 0.6 * mid * Math.sin(midPhase + TAU * midHz * t);
      const left = bass + tone + treble * random(-0.5, 0.5);
      const right = bass + 0.8 * tone + treble * random(-0.5, 0.5);
      timeByteArrayL[i] = toByte(left);
      timeByteArrayR[i] = toByte(right);
      timeByteArray[i] = toByte((left + right) / 2);
    }
    // Фаза продолжается с того места, где кончился прошлый кадр.
    bassPhase = (bassPhase + TAU * kickHz * dt) % TAU;
    midPhase = (midPhase + TAU * midHz * dt) % TAU;

    return { timeByteArray, timeByteArrayL, timeByteArrayR };
  };
}
