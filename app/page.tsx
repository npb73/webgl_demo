import type { ReactNode } from "react";
import { CodeNote } from "./components/CodeNote/CodeNote";
import { Contents, type ContentsItem } from "./components/Contents/Contents";
import { Entry, Page } from "./components/Entry/Entry";
import { Hero } from "./components/Hero/Hero";
import { MarginNote } from "./components/MarginNote/MarginNote";
import { Notebook } from "./components/Notebook/Notebook";
import { Pipeline } from "./components/Pipeline/Pipeline";
import { ProductCards } from "./components/ProductCards/ProductCards";
import { ScreenshotDemo } from "./components/ScreenshotDemo/ScreenshotDemo";
import { RichText } from "./components/RichText/RichText";
import { ScatterCanvas } from "./components/Plot/ScatterCanvas";
import { NeedsHtmlInCanvas } from "./components/ShaderDemo/NeedsHtmlInCanvas";
import { ShaderDemo } from "./components/ShaderDemo/ShaderDemo";
import { SlideNav } from "./components/SlideNav/SlideNav";
import { Stage } from "./components/Stage/Stage";
import { TransitionPicker } from "./components/TransitionPicker/TransitionPicker";
import { practices } from "./content/practices";
import {
  drawFrameNotes,
  milkdropWarpNotes,
  scatterVertexNotes,
} from "./content/code-notes";
import { drawingRows, versusRows, type VersusRow } from "./content/canvas-vs-webgl";
import { backdropDemos } from "./content/effects";
import { overlayFisheyeMain, overlaySteps, type OverlayStep as OverlayStepData } from "./content/overlay";
import { measuredOn, resourceBudgets, resourceRows } from "./content/resources";
import { captureCode, captureNotes } from "./content/screenshot";
import { libraries, reading } from "./content/links";
import { milkdropDemos } from "./content/milkdrop";
import { glossary, pipelineStages, weaknesses, type TermItem } from "./content/model";
import {
  milkdropWarpCore,
  scatterVertexShader,
} from "./content/shader";
import { drawFrame, steps, type Step } from "./content/steps";
import styles from "./page.module.scss";

// Три части рассказа: как устроен код WebGL → что даёт страница-текстура
// (и как на этом построен сам сайт) → что из этого брать в свой проект.
const CODE = "I. WebGL в коде";
const PAGE = "II. Страница как текстура";
const PROJECT = "III. В свой проект";

const entries = [
  { id: "what", title: "WebGL в коде", part: CODE },
  { id: "model", title: "Шейдер и JS", part: CODE },
  { id: "first-triangle", title: "Первый треугольник", part: CODE },
  { id: "first-shader", title: "Мой первый шейдер", part: CODE },
  { id: "points", title: "Миллион точек", part: CODE },
  { id: "lens", title: "Шейдер поверх страницы", part: PAGE },
  { id: "winamp", title: "Шейдеры из Winamp", part: PAGE },
  { id: "transitions", title: "Переходы с геометрией", part: PAGE },
  { id: "cards", title: "Коллекционные карточки", part: PAGE },
  { id: "screenshot", title: "Скриншот страницы", part: PAGE },
  { id: "resources", title: "Сколько это стоит", part: PAGE },
  { id: "pitfalls", title: "Слабые места", part: PROJECT },
  { id: "practices", title: "HTML-in-Canvas + шейдеры", part: PROJECT },
  { id: "ecosystem", title: "Брать ли библиотеку", part: PROJECT },
  { id: "reading", title: "Что почитать", part: PROJECT },
] as const satisfies readonly ContentsItem[];

type EntryId = (typeof entries)[number]["id"];

function entryProps(id: EntryId) {
  const index = entries.findIndex((entry) => entry.id === id);
  const { title } = entries[index];
  return { id, title, number: index + 1 };
}

/** Таблица «Canvas 2D | WebGL»: строка — операция, справа — как то же делают в WebGL. */
function VersusTable({ caption, rows }: { caption: ReactNode; rows: readonly VersusRow[] }) {
  return (
    <table className={styles.versus}>
      <caption className={styles.versusCaption}>{caption}</caption>
      <thead>
        <tr>
          <td />
          <th scope="col">Canvas 2D</th>
          <th scope="col">WebGL</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.step}>
            <th scope="row">{row.step}</th>
            <td>
              <RichText text={row.canvas} />
            </td>
            <td>
              <RichText text={row.webgl} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Шаги треугольника с номера first: каждый — рядом с тем же на Canvas 2D. */
function TriangleSteps({ items, first = 1 }: { items: readonly Step[]; first?: number }) {
  return (
    <ol className={styles.recipe} start={first}>
      {items.map((step, index) => (
        <li key={step.title} className={styles.recipeStep}>
          <span className={styles.recipeNumber}>{first + index}</span>
          <div className={styles.recipeBody}>
            <p className={styles.recipeTitle}>{step.title}</p>
            <div className={styles.sides}>
              {(["canvas", "webgl"] as const).map((side) => (
                <div key={side} className={side === "webgl" ? `${styles.side} ${styles.webglSide}` : styles.side}>
                  <p className={styles.sideLabel}>{side === "webgl" ? "WebGL" : "Canvas 2D"}</p>
                  <code className={styles.recipeCode}>{step[side].code}</code>
                  <p className={styles.recipeText}>
                    <RichText text={step[side].text} />
                  </p>
                </div>
              ))}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Шаг «как окно получает страницу» — по одному на экран, со своим листком кода. */
function OverlayStep({ step, number }: { step: OverlayStepData; number: number }) {
  return (
    <ol className={styles.recipe} start={number}>
      <li className={styles.recipeStep}>
        <span className={styles.recipeNumber}>{number}</span>
        <div className={styles.recipeBody}>
          <p className={styles.recipeTitle}>{step.title}</p>
          {step.text && (
            <p className={styles.recipeText}>
              <RichText text={step.text} />
            </p>
          )}
          <CodeNote filename={step.filename} code={step.code} notes={step.notes} />
        </div>
      </li>
    </ol>
  );
}

/** Пункты-предупреждения или правила: по два-четыре на экран. */
function TermList({ items, practice = false }: { items: readonly TermItem[]; practice?: boolean }) {
  return (
    <ul className={styles.pitfalls}>
      {items.map((item) => (
        <li key={item.term} className={practice ? `${styles.pitfall} ${styles.practice}` : styles.pitfall}>
          <p className={styles.pitfallTitle}>{item.term}</p>
          <p>
            <RichText text={item.text} />
          </p>
        </li>
      ))}
    </ul>
  );
}

function Weaknesses({ items }: { items: typeof weaknesses }) {
  return (
    <ul className={styles.pitfalls}>
      {items.map((item) => (
        <li key={item.term} className={styles.pitfall}>
          <p className={styles.pitfallTitle}>{item.term}</p>
          <p>
            <RichText text={item.text} />
          </p>
          <p className={styles.pitfallFix}>
            <span className={styles.pitfallFixLabel}>Что делать: </span>
            <RichText text={item.fix} />
          </p>
          {item.code && <code className={styles.pitfallCode}>{item.code}</code>}
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <>
      <Stage>
        <Notebook>
          <Hero />
          <Contents items={entries} />

          <main>
            <Entry {...entryProps("what")}>
              <Page>
                <p className={styles.statement}>
                  Весь WebGL — это объект <code>gl</code>. Сначала настраиваем, потом говорим «рисуй».
                </p>
                <CodeNote filename="draw.js" code={drawFrame} notes={drawFrameNotes} />
              </Page>
            </Entry>

            <Entry {...entryProps("model")}>
              <Page>
                <p className={styles.statement}>Шейдер — функция, JS — её аргументы.</p>
                <Pipeline stages={pipelineStages} />
                <dl className={styles.glossary}>
                  {glossary.map((item) => (
                    <div key={item.glsl} className={styles.glossaryItem}>
                      <dt>
                        <code>{item.glsl}</code>
                      </dt>
                      <dd>
                        <code className={styles.glossaryJs}>{item.js}</code>
                      </dd>
                    </div>
                  ))}
                </dl>
              </Page>
            </Entry>

            <Entry {...entryProps("first-triangle")}>
              <Page>
                <p className={styles.statement}>Тот же треугольник: в Canvas 2D — пара строк, в WebGL — пять шагов.</p>
                <TriangleSteps items={steps.slice(0, 1)} />
              </Page>
              <Page>
                <TriangleSteps items={steps.slice(1, 3)} first={2} />
              </Page>
              <Page>
                <TriangleSteps items={steps.slice(3)} first={4} />
              </Page>
            </Entry>

            <Entry {...entryProps("first-shader")}>
              <Page>
                <p className={styles.statement}>
                  В Canvas 2D цикл по пикселям пишем мы. В WebGL его делает видеокарта.
                </p>
                <VersusTable
                  caption={
                    <>
                      Один градиент, одна формула: <code>0.5 + 0.5 · cos(время + координата)</code>
                    </>
                  }
                  rows={versusRows}
                />
              </Page>
              <Page>
                <VersusTable caption="Что Canvas 2D умеет из коробки — и как то же делают в WebGL" rows={drawingRows} />
              </Page>
            </Entry>

            <Entry {...entryProps("points")}>
              <Page>
                <p className={styles.statement}>Миллион точек на графике — без тормозов.</p>
                <p className={styles.demoHint}>
                  → колесо — зум к курсору, перетаскивание — сдвиг, двойной клик — сброс
                </p>
                <ShaderDemo label="Открыть график" windowTitle="million-points.exe" effect="scatter" flat>
                  <ScatterCanvas />
                </ShaderDemo>
              </Page>
              <Page>
                <CodeNote filename="scatter.vert" code={scatterVertexShader} notes={scatterVertexNotes} />
              </Page>
            </Entry>

            <Entry {...entryProps("lens")}>
              <Page>
                <MarginNote title="Нужен флаг" placement="right">
                  <p>
                    Chrome → <code>chrome://flags/#canvas-draw-element</code>. Без него
                    страница остаётся обычным DOM.
                  </p>
                </MarginNote>
                <p className={styles.statement}>WebGL не видит DOM. Но DOM можно отдать в текстуру.</p>
                <p className={styles.lead}>
                  <code>&lt;canvas layoutsubtree&gt;</code> → <code>texElementSubImage2D</code> →{" "}
                  <code>uniform sampler2D u_page</code>
                </p>
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
              </Page>
              {overlaySteps.map((step, index) => (
                <Page key={step.title}>
                  {index === 0 && <p className={styles.lead}>Как окно получает страницу под собой — по шагам:</p>}
                  <OverlayStep step={step} number={index + 1} />
                </Page>
              ))}
              <Page>
                <OverlayStep step={{ ...overlayFisheyeMain, text: "" }} number={overlaySteps.length} />
              </Page>
            </Entry>

            <Entry {...entryProps("winamp")}>
              <Page>
                <p className={styles.statement}>Взял шейдеры из Winamp и встроил их сюда.</p>
                <CodeNote filename="milkdrop-warp.frag" code={milkdropWarpCore} notes={milkdropWarpNotes} />
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
              </Page>
            </Entry>

            <Entry {...entryProps("transitions")}>
              <Page>
                <MarginNote title="Нужен флаг" placement="right">
                  <p>
                    Без HTML-in-Canvas кнопки просто листают дальше: снимков
                    страницы нет, натягивать на сетку нечего.
                  </p>
                </MarginNote>
                <p className={styles.statement}>Страница — текстура. Переход — любая геометрия.</p>
                <p className={styles.lead}>
                  Снимок слайда до листания и после → сетка из треугольников: лист, грань куба
                  или облако точек
                </p>
                <p className={styles.demoHint}>
                  → кнопка листает на следующий слайд, а переход остаётся на стрелках и PageUp / PageDown
                </p>
                <TransitionPicker />
              </Page>
            </Entry>

            <Entry {...entryProps("cards")}>
              <Page>
                <MarginNote title="Нужен флаг" placement="right">
                  <p>
                    Без HTML-in-Canvas карточки наклоняются через CSS, но без блеска: шейдер не
                    видит DOM.
                  </p>
                </MarginNote>
                <p className={styles.statement}>Карточка товара — HTML. Блеск — шейдер.</p>
                <p className={styles.demoHint}>
                  → наведите на карточку и поводите указателем; «В корзину» нажимается
                </p>
                <ProductCards />
              </Page>
            </Entry>

            <Entry {...entryProps("screenshot")}>
              <Page>
                <MarginNote title="Нужен флаг" placement="right">
                  <p>
                    Обычный DOM так не снять: браузер не отдаёт скрипту его пиксели. Без флага
                    кнопка неактивна.
                  </p>
                </MarginNote>
                <p className={styles.statement}>Скриншот — это просто кадр WebGL.</p>
                <p className={styles.lead}>
                  Страница уже нарисована шейдерами, поэтому <code>readPixels</code> забирает то,
                  что видно на экране: окна, линзы, голограммы на карточках.
                </p>
                <p className={styles.demoHint}>
                  → откройте пару окон, нажмите кнопку; миниатюра появится справа внизу — нажмите
                  её, и PNG скачается
                </p>
                <ScreenshotDemo />
              </Page>
              <Page>
                <CodeNote filename="stage-renderer.js" code={captureCode} notes={captureNotes} />
              </Page>
            </Entry>

            <Entry {...entryProps("resources")}>
              <Page>
                <p className={styles.statement}>В покое — бесплатно. Дорог только снимок страницы.</p>
                <p className={styles.lead}>
                  Одни и те же действия в обычном DOM и в сцене HTML-in-Canvas. Главный поток — время
                  всех задач вкладки, «наш код» — обработчик <code>paint</code> сцены.
                </p>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <caption className={styles.tableCaption}>{measuredOn}</caption>
                    <thead>
                      <tr>
                        <th scope="col">Что делаем</th>
                        <th scope="col">Главный поток, DOM</th>
                        <th scope="col">Главный поток, сцена</th>
                        <th scope="col">Наш код на кадр</th>
                        <th scope="col">Снимков в секунду</th>
                        <th scope="col">Видеопамять сцены</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resourceRows.map((row) => (
                        <tr key={row.scenario} className={row.hot ? styles.hot : undefined}>
                          <th scope="row">{row.scenario}</th>
                          <td>{row.dom}</td>
                          <td>{row.stage}</td>
                          <td>{row.ourCode}</td>
                          <td>{row.snapshots}</td>
                          <td>{row.gpu}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Page>
              <Page>
                <div className={styles.budgets}>
                  {resourceBudgets.map((budget) => (
                    <section key={budget.title} className={styles.budget} aria-label={budget.title}>
                      <p className={styles.budgetTitle}>{budget.title}</p>
                      <p className={styles.budgetSummary}>{budget.summary}</p>
                      <dl className={styles.budgetItems}>
                        {budget.items.map((item) => (
                          <div key={item.name} className={styles.budgetItem}>
                            <dt>
                              {item.name}
                              {item.note && <span className={styles.budgetNote}>{item.note}</span>}
                            </dt>
                            <dd>{item.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  ))}
                </div>
              </Page>
            </Entry>

            <Entry {...entryProps("pitfalls")}>
              <Page>
                <p className={styles.statement}>WebGL молчит, когда что-то не так. Знайте, где он подводит.</p>
                <Weaknesses items={weaknesses.slice(0, 2)} />
              </Page>
              <Page>
                <Weaknesses items={weaknesses.slice(2, 4)} />
              </Page>
              <Page>
                <Weaknesses items={weaknesses.slice(4, 6)} />
              </Page>
              <Page>
                <Weaknesses items={weaknesses.slice(6)} />
              </Page>
            </Entry>

            <Entry {...entryProps("practices")}>
              <Page>
                <p className={styles.statement}>DOM — источник правды, шейдер — только картинка.</p>
                <TermList items={practices.slice(0, 2)} practice />
              </Page>
              <Page>
                <TermList items={practices.slice(2, 6)} practice />
              </Page>
              <Page>
                <TermList items={practices.slice(6)} practice />
              </Page>
            </Entry>

            <Entry {...entryProps("ecosystem")}>
              <Page>
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
              </Page>
            </Entry>

            <Entry {...entryProps("reading")}>
              <Page>
                <ul className={styles.reading}>
                  {reading.map((item) => (
                    <li key={item.url} className={styles.readingItem}>
                      <a href={item.url}>{item.title}</a>
                      <span className={styles.readingNote}> — {item.note}</span>
                    </li>
                  ))}
                </ul>
              </Page>
            </Entry>
          </main>
        </Notebook>
      </Stage>
      {/* Вне сцены: стрелки прибиты к экрану, а внутри canvas fixed не работает. */}
      <SlideNav />
    </>
  );
}
