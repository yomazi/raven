import styles from "./TasksFilter.module.css";

const TasksFilter = () => {
  return (
    <section className={styles.tasksFilter}>
      <article className={styles.filterSection}>
        <h1>FILTERS</h1>
        <ul>
          <li>All Tasks</li>
          <li>Open</li>
          <li>Done</li>
          <li>¯\_(ツ)_/¯</li>
        </ul>
      </article>
      <article className={styles.filterSection}>
        <h1>Unlinked</h1>
        <ul>
          <li>All Tasks</li>
        </ul>
      </article>
      <article className={styles.filterSection}>
        <h1>By Show</h1>
        <ul>
          <li>show 1</li>
          <li>...</li>
          <li>show 2</li>
        </ul>
      </article>
    </section>
  );
};

export default TasksFilter;
