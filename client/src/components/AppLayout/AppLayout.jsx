import BuildsContent from "../Content/BuildsContent";
import EventsContent from "../Content/EventsContent";
import TasksContent from "../Content/TasksContent";
import Header from "../Header/Header";
import Nav from "../Nav/Nav";
import styles from "./AppLayout.module.css";

const AppLayout = ({ mode }) => {
  const contentMap = {
    events: <EventsContent />,
    tasks: <TasksContent />,
    builds: <BuildsContent />,
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
