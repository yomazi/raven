import Builds from "../Content/Builds/Builds";
import Events from "../Content/Events/Events";
import Tasks from "../Content/Tasks/Tasks";
import Header from "../Header/Header";
import Nav from "../Nav/Nav";
import styles from "./AppLayout.module.css";

const AppLayout = ({ mode }) => {
  const contentMap = {
    events: <Events />,
    tasks: <Tasks />,
    builds: <Builds />,
  };

  return (
    <div className={styles.appLayout}>
      <Header mode={mode} />
      {mode == "events" && <Nav />}
      {contentMap[mode] ?? null}
    </div>
  );
};

export default AppLayout;
