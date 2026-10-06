import { CodeNote } from "./components/CodeNote/CodeNote";
import { Contents, type ContentsItem } from "./components/Contents/Contents";
import { Entry } from "./components/Entry/Entry";
import { Footer } from "./components/Footer/Footer";
import { Hero } from "./components/Hero/Hero";
import { MarginNote } from "./components/MarginNote/MarginNote";
import { Notebook } from "./components/Notebook/Notebook";
import { Pipeline } from "./components/Pipeline/Pipeline";
import { RichText } from "./components/RichText/RichText";
import { ShaderDemo } from "./components/ShaderDemo/ShaderDemo";
import { Timeline } from "./components/Timeline/Timeline";
import { libraries, reading } from "./content/links";
import { glossary, pipelineStages, pitfalls } from "./content/model";
import {
  firstFragmentShader,
  firstVertexShader,
  wasmLoaderSnippet,
} from "./content/shader";
import { contextLostSnippet, resizeSnippet, steps } from "./content/steps";
import { timeline } from "./content/timeline";
import styles from "./page.module.scss";

const entries = [
  { id: "what", title: "Что такое WebGL", date: "6 окт." },
  { id: "history", title: "Немного истории", date: "7 окт." },
  { id: "model", title: "Как это устроено", date: "8 окт." },
  { id: "first-triangle", title: "Первый треугольник", date: "9 окт." },
  { id: "first-shader", title: "Мой первый шейдер", date: "10 окт." },
  { id: "pitfalls", title: "Грабли", date: "11 окт." },
  { id: "ecosystem", title: "Брать ли библиотеку", date: "12 окт." },
  { id: "reading", title: "Что почитать", date: "13 окт." },
] as const satisfies readonly ContentsItem[];

type EntryId = (typeof entries)[number]["id"];

function entryProps(id: EntryId) {
  const index = entries.findIndex((entry) => entry.id === id);
  return { ...entries[index], number: index + 1 };
}

const comparison = [
  {
    tech: "CSS 3D",
    draws: "DOM-элементы в пространстве",
    when: "карточки, flip, параллакс",
  },
  {
    tech: "Canvas 2D",
    draws: "фигуры и картинки, команда за командой",
    when: "графики, простые 2D-игры",
  },
  {
    tech: "WebGL",
    draws: "треугольники + шейдеры на GPU",
    when: "3D, тысячи объектов, эффекты, обработка изображений",
  },
  {
    tech: "WebGPU",
    draws: "современный GPU API + compute",
    when: "новые проекты, вычисления на GPU",
  },
];

export default function Home() {
  return (
    <Notebook>
      <Hero />
      <Contents items={entries} />

      <main>
        <Entry {...entryProps("what")}>
          <MarginNote title="Аналогия" placement="right">
            <p>
              DOM — retained mode: вы описываете дерево, браузер решает, что
              перерисовать.
            </p>
            <p>
              WebGL — immediate mode: каждый кадр вы сами говорите, что и как
              нарисовать.
            </p>
          </MarginNote>
          <p>
            WebGL — это JavaScript API, который даёт прямой доступ к видеокарте
            через элемент <code>&lt;canvas&gt;</code>. По сути это OpenGL ES,
            переведённый на JS: WebGL&nbsp;1 повторяет OpenGL ES 2.0,
            WebGL&nbsp;2 — OpenGL ES 3.0.
          </p>
          <p>
            Главное, что стоит понять сразу: WebGL —{" "}
            <strong>не 3D-движок</strong>. В нём нет сцены, камер, света и
            моделей. Он умеет ровно одно — очень быстро закрашивать
            треугольники, линии и точки. Всё остальное — математика, которую
            вы пишете сами или берёте из библиотеки.
          </p>
          <p>
            Что и как закрашивать, описывают две маленькие программы —{" "}
            <em>шейдеры</em> на языке GLSL. Драйвер компилирует их, а GPU
            выполняет параллельно, тысячами потоков одновременно.
          </p>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className={styles.tableCaption}>
                Где WebGL среди соседей
              </caption>
              <thead>
                <tr>
                  <th scope="col">Что</th>
                  <th scope="col">Рисует</th>
                  <th scope="col">Когда брать</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr
                    key={row.tech}
                    className={row.tech === "WebGL" ? styles.current : undefined}
                  >
                    <th scope="row">{row.tech}</th>
                    <td>{row.draws}</td>
                    <td>{row.when}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Entry>

        <Entry {...entryProps("history")}>
          <p>
            Двадцать лет назад 3D в браузере означало плагин: VRML, Java3D,
            позже Flash с Stage3D. WebGL изменил это — графика на GPU стала
            частью платформы, как <code>fetch</code> или{" "}
            <code>&lt;video&gt;</code>.
          </p>
          <Timeline items={timeline} />
        </Entry>

        <Entry {...entryProps("model")}>
          <p>
            Представьте функцию, которая вызывается для каждой вершины, и
            вторую — для каждого пикселя. <strong>Это почти всё.</strong> Вы
            загружаете данные в видеопамять, отдаёте GPU две функции и
            командуете «рисуй».
          </p>

          <Pipeline stages={pipelineStages} />

          <p>
            Шейдеры — чистые функции без доступа к соседям: вершина не знает
            о других вершинах, пиксель — о других пикселях. Именно поэтому их
            можно гонять параллельно. Данные в них попадают пятью способами:
          </p>

          <dl className={styles.glossary}>
            {glossary.map((item) => (
              <div key={item.term} className={styles.glossaryItem}>
                <dt>
                  <code>{item.term}</code>
                </dt>
                <dd>
                  <RichText text={item.text} />
                </dd>
              </div>
            ))}
          </dl>
        </Entry>

        <Entry {...entryProps("first-triangle")}>
          <p>
            «Hello world» в мире графики — разноцветный треугольник. Ниже весь
            путь на чистом WebGL 2, без библиотек. Кода много, но каждая строка
            делает одну понятную вещь.
          </p>

          <ol className={styles.steps}>
            {steps.map((step, index) => (
              <li key={step.title} className={styles.step}>
                <h3 className={styles.stepTitle}>
                  <span className={styles.stepNumber}>Шаг {index + 1}</span>
                  {step.title}
                </h3>
                <p>
                  <RichText text={step.text} />
                </p>
                <CodeNote filename={step.filename} code={step.code} />
              </li>
            ))}
          </ol>

          <MarginNote title="Не забыть: размер">
            <p>
              CSS-размер canvas и размер его буфера — разные вещи. Без учёта{" "}
              <code>devicePixelRatio</code> картинка будет мыльной на
              ретине.
            </p>
          </MarginNote>
          <CodeNote filename="resize.js" code={resizeSnippet} />

          <MarginNote title="Не забыть: потеря контекста">
            <p>
              GPU могут отобрать: обновился драйвер, вкладка ушла в фон на
              мобильном, кончилась память. Все ресурсы при этом пропадают.
            </p>
          </MarginNote>
          <CodeNote filename="context-lost.js" code={contextLostSnippet} />
        </Entry>

        <Entry {...entryProps("first-shader")}>
          <MarginNote title="Почему .wasm" placement="right">
            <p>
              GPU исполняет только GLSL, поэтому WebAssembly здесь — просто
              контейнер: исходники шейдера лежат в памяти модуля.
            </p>
          </MarginNote>
          <p>
            У всех он одинаковый — переливающийся градиент со стартовой
            страницы Shadertoy. Треугольник из прошлой записи был про
            вершины, а здесь <strong>вся работа во fragment shader</strong>:
            каждый пиксель по своей координате и текущему времени независимо
            решает, какого он цвета.
          </p>
          <p>
            Vertex shader обходится без буферов вообще — три вершины
            треугольника, накрывающего экран, вычисляются из{" "}
            <code>gl_VertexID</code>. Так рисуют любой полноэкранный эффект.
          </p>

          <CodeNote filename="first-shader.frag" code={firstFragmentShader} />
          <CodeNote filename="first-shader.vert" code={firstVertexShader} />

          <p>
            Оба исходника упакованы в <code>first-shader.wasm</code>. JS
            загружает модуль, читает строки из его памяти и передаёт их
            драйверу — дальше всё как в записи №4, только без единого
            буфера.
          </p>
          <CodeNote filename="load-shader.js" code={wasmLoaderSnippet} />

          <p className={styles.demoHint}>
            → нажмите, чтобы увидеть результат. Окно можно таскать за
            заголовок.
          </p>
          <ShaderDemo />
        </Entry>

        <Entry {...entryProps("pitfalls")}>
          <p>
            То, на что я наступил сам. Ничего из этого не бросает исключений —
            просто рисует не то или тормозит.
          </p>
          <ul className={styles.pitfalls}>
            {pitfalls.map((item) => (
              <li key={item.term} className={styles.pitfall}>
                <h3 className={styles.pitfallTitle}>{item.term}</h3>
                <p>
                  <RichText text={item.text} />
                </p>
              </li>
            ))}
          </ul>
          <p className={styles.aside}>
            → для отладки: Spector.js захватывает кадр целиком, а{" "}
            <code>chrome://gpu</code> показывает, что вообще умеет железо.
          </p>
        </Entry>

        <Entry {...entryProps("ecosystem")}>
          <MarginNote title="Моё правило" placement="right">
            <p>
              Один полноэкранный шейдер, постэффект, обработка картинки —
              сырой WebGL.
            </p>
            <p>Появились камера, сцена, модели и свет — библиотека.</p>
          </MarginNote>
          <p>
            Сырой WebGL стоит знать, даже если вы никогда не будете писать на
            нём в продакшене: любая библиотека — это те же буферы, шейдеры и
            draw calls, просто аккуратно спрятанные.
          </p>
          <ul className={styles.libraries}>
            {libraries.map((library) => (
              <li key={library.name} className={styles.library}>
                <a href={library.url} className={styles.libraryName}>
                  {library.name}
                </a>
                <span className={styles.libraryText}>{library.text}</span>
              </li>
            ))}
          </ul>
        </Entry>

        <Entry {...entryProps("reading")}>
          <p>Список «прочитать на выходных» — с галочками, как положено.</p>
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
  );
}
