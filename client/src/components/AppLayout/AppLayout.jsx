import Builds from "@components/Content/Builds/Builds";
import SinglePane from "@components/Content/SinglePane";
import SplitPane from "@components/Content/SplitPane";
import Header from "@components/Header/Header";
import Nav from "@components/Nav/Nav";
import styles from "./AppLayout.module.css";

import EventClientArea from "@components/Content/Events/EventClientArea/EventClientArea.jsx";
import EventGrid from "@components/Content/Events/EventGrid/EventGrid.jsx";
import TasksFilter from "@components/Content/Tasks/TasksFilter/TasksFilter.jsx";
import TasksView from "@components/Content/Tasks/TasksView/TasksView.jsx";

const AppLayout = ({ mode }) => {
  const contentMap = {
    events: <SplitPane resizable={true} leftPane={<EventGrid />} rightPane={<EventClientArea />} />,
    tasks: <SplitPane resizable={false} leftPane={<TasksFilter />} rightPane={<TasksView />} />,
    builds: <SinglePane pane={<Builds />} />,
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
