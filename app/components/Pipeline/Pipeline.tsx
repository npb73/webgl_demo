import styles from "./Pipeline.module.scss";

export type PipelineStage = {
  name: string;
  hint: string;
  programmable?: boolean;
};

type PipelineProps = {
  stages: PipelineStage[];
};

export function Pipeline({ stages }: PipelineProps) {
  return (
    <figure className={styles.pipeline}>
      <ol className={styles.stages}>
        {stages.map((stage) => (
          <li
            key={stage.name}
            className={`${styles.stage} ${stage.programmable ? styles.programmable : ""}`}
          >
            <span className={styles.name}>{stage.name}</span>
            <span className={styles.hint}>{stage.hint}</span>
          </li>
        ))}
      </ol>
      <figcaption className={styles.caption}>
        обведено красным — то, что пишете вы; остальное делает GPU
      </figcaption>
    </figure>
  );
}
