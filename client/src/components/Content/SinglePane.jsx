import styles from "./Content.module.css";

const SinglePane = ({ pane }) => {
  return <main className={styles.content}>{pane}</main>;
};

export default SinglePane;
