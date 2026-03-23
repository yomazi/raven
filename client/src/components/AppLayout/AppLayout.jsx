import Content from "../Content/Content";
import Header from "../Header/Header";
import Nav from "../Nav/Nav";
import styles from "./AppLayout.module.css";

const AppLayout = () => {
  return (
    <div className={styles.appLayout}>
      <Header />
      <Nav />
      <Content />
    </div>
  );
};

export default AppLayout;
