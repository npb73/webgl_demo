import { CodeNote } from "./components/CodeNote/CodeNote";
import { Contents, type ContentsItem } from "./components/Contents/Contents";
import { Entry } from "./components/Entry/Entry";
import { Footer } from "./components/Footer/Footer";
import { Hero } from "./components/Hero/Hero";
import { MarginNote } from "./components/MarginNote/MarginNote";
import { Notebook } from "./components/Notebook/Notebook";
import { Pipeline } from "./components/Pipeline/Pipeline";
import { RichText } from "./components/RichText/RichText";
import { ScatterCanvas } from "./components/Plot/ScatterCanvas";
import { NeedsHtmlInCanvas } from "./components/ShaderDemo/NeedsHtmlInCanvas";
import { ShaderCanvas } from "./components/ShaderDemo/ShaderCanvas";
import { ShaderDemo } from "./components/ShaderDemo/ShaderDemo";
import { SlideNav } from "./components/SlideNav/SlideNav";
import { Stage } from "./components/Stage/Stage";
import { backdropDemos } from "./content/effects";
import { libraries, reading } from "./content/links";
import { milkdropDemos } from "./content/milkdrop";
import { glossary, pipelineStages, pitfalls } from "./content/model";
import { firstFragmentShader, scatterVertexShader } from "./content/shader";
import { steps } from "./content/steps";
import styles from "./page.module.scss";

const entries = [
  { id: "what", title: "Что такое WebGL" },
  { id: "model", title: "Как это устроено" },
  { id: "first-triangle", title: "Первый треугольник" },
  { id: "first-shader", title: "Мой первый шейдер" },
  { id: "points", title: "Миллион точек" },
  { id: "lens", title: "Шейдер поверх страницы" },
  { id: "winamp", title: "Шейдеры из Winamp" },
  { id: "pitfalls", title: "Грабли" },
  { id: "ecosystem", title: "Брать ли библиотеку" },
  { id: "reading", title: "Что почитать" },
] as const satisfies readonly ContentsItem[];

type EntryId = (typeof entries)[number]["id"];

function entryProps(id: EntryId) {
  const index = entries.findIndex((entry) => entry.id === id);
  return { ...entries[index], number: index + 1 };
}

const comparison = [
  { tech: "CSS 3D", draws: "трансформирует DOM-элементы", when: "карточки, флипы, параллакс" },
  { tech: "Canvas 2D", draws: "2D-фигуры по командам", when: "графики, простые игры" },
  { tech: "WebGL", draws: "треугольники + шейдеры на GPU", when: "3D, тысячи объектов, эффекты" },
  { tech: "WebGPU", draws: "новый GPU API: рендер и вычисления", when: "новые проекты, вычисления на GPU" },
];

export default function Home() {
  return (
    <>
      <Stage>
        <Notebook>
          <Hero />
          <Contents items={entries} />

          <main>
            <Entry {...entryProps("what")}>
              <p className={styles.statement}>WebGL — JavaScript API для рисования на видеокарте.</p>
              <p className={styles.lead}>
                Вы передаёте GPU вершины и две программы — <em>шейдеры</em>. GPU
                собирает из вершин треугольники и считает цвет каждого пикселя параллельно.
              </p>
              <div className={styles.versus}>
                <div className={styles.card}>
                  <p className={styles.cardTitle}>CPU</p>
                  <p>Несколько мощных ядер: сложная логика, задачи по очереди.</p>
                </div>
                <div className={styles.card}>
                  <p className={styles.cardTitle}>GPU</p>
                  <p>Тысячи простых ядер: одна программа для каждого пикселя одновременно.</p>
                </div>
              </div>
              <p className={styles.lead}>
                Это <strong>не 3D-движок</strong>: сцен, камер и света нет. Только точки,
                линии, треугольники и шейдеры.
              </p>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Что</th>
                      <th scope="col">Как рисует</th>
                      <th scope="col">Когда брать</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((row) => (
                      <tr key={row.tech} className={row.tech === "WebGL" ? styles.current : undefined}>
                        <th scope="row">{row.tech}</th>
                        <td>{row.draws}</td>
                        <td>{row.when}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Entry>

            <Entry {...entryProps("model")}>
              <p className={styles.statement}>Конвейер: вершины → пиксели.</p>
              <p className={styles.lead}>
                Вершинный шейдер считает положение каждой вершины. GPU находит пиксели
                внутри треугольника и для каждого запускает фрагментный шейдер — он
                возвращает цвет.
              </p>
              <Pipeline stages={pipelineStages} />
              <dl className={styles.glossary}>
                {glossary.map((item) => (
                  <div key={item.term} className={styles.glossaryItem}>
                    <dt>
                      <code>{item.term}</code>
                    </dt>
                    <dd>{item.text}</dd>
                  </div>
                ))}
              </dl>
            </Entry>

            <Entry {...entryProps("first-triangle")}>
              <MarginNote title="Честно" placement="right">
                <p>Около 40 строк на один треугольник — поэтому обычно берут библиотеки.</p>
              </MarginNote>
              <p className={styles.statement}>Минимальная программа — пять шагов.</p>
              <ol className={styles.recipe}>
                {steps.map((step, index) => (
                  <li key={step.title} className={styles.recipeStep}>
                    <span className={styles.recipeNumber}>{index + 1}</span>
                    <div>
                      <p className={styles.recipeTitle}>
                        {step.title} <span className={styles.recipeHint}>— {step.hint}</span>
                      </p>
                      <code className={styles.recipeCode}>{step.code}</code>
                    </div>
                  </li>
                ))}
              </ol>
            </Entry>

            <Entry {...entryProps("first-shader")}>
              <MarginNote title="Почему .wasm" placement="right">
                <p>Исходники шейдеров лежат в .wasm-файле, но выполняет их GPU — как обычный GLSL.</p>
              </MarginNote>
              <p className={styles.statement}>Фрагментный шейдер: (координата, время) → цвет.</p>
              <p className={styles.lead}>
                Он выполняется для каждого пикселя независимо. Здесь цвет — косинус от
                координаты и времени, поэтому градиент движется.
              </p>
              <CodeNote filename="first-shader.frag" code={firstFragmentShader} />
              <ShaderDemo label="Запустить шейдер" windowTitle="first-shader.exe" effect="first-shader">
                <ShaderCanvas />
              </ShaderDemo>
            </Entry>

            <Entry {...entryProps("points")}>
              <MarginNote title="Данные" placement="right">
                <p>Синтетические: миллион «сессий» из нескольких сегментов, генерируются прямо в браузере.</p>
              </MarginNote>
              <p className={styles.statement}>Миллион точек на графике — без тормозов.</p>
              <p className={styles.lead}>
                В SVG и Canvas 2D каждая точка — отдельная команда от JavaScript, и так на
                каждом кадре. В WebGL точки один раз загружаются в видеопамять и рисуются
                одним вызовом, а зум и сдвиг — два uniform: позиции пересчитывает
                вершинный шейдер.
              </p>
              <CodeNote filename="scatter.vert" code={scatterVertexShader} />
              <p className={styles.demoHint}>
                → колесо — зум к курсору, перетаскивание — сдвиг, двойной клик — сброс
              </p>
              <ShaderDemo label="Открыть график" windowTitle="million-points.exe" effect="scatter" flat>
                <ScatterCanvas />
              </ShaderDemo>
            </Entry>

            <Entry {...entryProps("lens")}>
              <MarginNote title="Нужен флаг" placement="right">
                <p>
                  Chrome → <code>chrome://flags/#canvas-draw-element</code>. Без него
                  страница остаётся обычным DOM.
                </p>
              </MarginNote>
              <p className={styles.statement}>WebGL не видит DOM.</p>
              <p className={styles.lead}>
                Шейдеру доступны только буферы и текстуры. Экспериментальный{" "}
                <em>HTML-in-Canvas</em> отрисовывает HTML внутри canvas в текстуру — с
                настоящими шрифтами, ховерами и выделением.
              </p>
              <p className={styles.lead}>
                Поэтому вся страница здесь — внутри одного canvas, а окна — часть той же
                сцены: шейдер окна получает всё, что под ним.
              </p>
              <figure className={styles.formula}>
                <code>r → r · (1 − k + k·r²)</code>
                <figcaption>линза: в центре лупа, у края — плоское стекло</figcaption>
              </figure>
              <ul className={styles.effects}>
                {backdropDemos
                  .filter((demo) => demo.text)
                  .map((demo) => (
                    <li key={demo.effect} className={styles.effect}>
                      <span className={styles.effectName}>{demo.name}</span> — {demo.text}
                    </li>
                  ))}
              </ul>
              <p className={styles.demoHint}>→ откройте окна и поводите ими по странице и друг над другом</p>
              <div className={styles.demoRow}>
                {backdropDemos.map((demo) => (
                  <ShaderDemo
                    key={demo.effect}
                    label={demo.label}
                    windowTitle={demo.windowTitle}
                    effect={demo.effect}
                    flat
                  >
                    <NeedsHtmlInCanvas />
                  </ShaderDemo>
                ))}
              </div>
            </Entry>

            <Entry {...entryProps("winamp")}>
              <p className={styles.statement}>Взял шейдеры из Winamp и встроил их сюда.</p>
              <div className={styles.demoRow}>
                {milkdropDemos.map((demo) => (
                  <ShaderDemo
                    key={demo.effect}
                    label={demo.windowTitle}
                    windowTitle={demo.windowTitle}
                    effect={demo.effect}
                    flat
                  >
                    <NeedsHtmlInCanvas />
                  </ShaderDemo>
                ))}
              </div>
            </Entry>

            <Entry {...entryProps("pitfalls")}>
              <p className={styles.statement}>Ошибки WebGL не бросают исключений.</p>
              <ul className={styles.pitfalls}>
                {pitfalls.map((item) => (
                  <li key={item.term} className={styles.pitfall}>
                    <p className={styles.pitfallTitle}>{item.term}</p>
                    <p>
                      <RichText text={item.text} />
                    </p>
                  </li>
                ))}
              </ul>
            </Entry>

            <Entry {...entryProps("ecosystem")}>
              <p className={styles.statement}>Сырой WebGL — как DOM API. Three.js — как React.</p>
              <ul className={styles.libraries}>
                {libraries.map((library) => (
                  <li key={library.name} className={styles.library}>
                    <a href={library.url} className={styles.libraryName}>
                      {library.name}
                    </a>
                    <span>{library.text}</span>
                  </li>
                ))}
              </ul>
              <p className={styles.aside}>
                → один полноэкранный шейдер — сырой WebGL; появились камера и модели —
                библиотека
              </p>
            </Entry>

            <Entry {...entryProps("reading")}>
              <ul className={styles.reading}>
                {reading.map((item) => (
                  <li key={item.url} className={styles.readingItem}>
                    <a href={item.url}>{item.title}</a>
                    <span className={styles.readingNote}> — {item.note}</span>
                  </li>
                ))}
              </ul>
            </Entry>
          </main>

          <Footer />
        </Notebook>
      </Stage>
      {/* Вне сцены: стрелки прибиты к экрану, а внутри canvas fixed не работает. */}
      <SlideNav />
    </>
  );
}
