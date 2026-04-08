import SplitPane from "@components/Content/SplitPane";
import Header from "@components/Header/Header";
import Nav from "@components/Nav/Nav";

import BuildClientArea from "@components/Content/Builds/BuildClientArea/BuildClientArea.jsx";
import BuildRoster from "@components/Content/Builds/BuildRoster/BuildRoster.jsx";
import EventClientArea from "@components/Content/Events/EventClientArea/EventClientArea.jsx";
import EventGrid from "@components/Content/Events/EventGrid/EventGrid.jsx";
import TasksFilter from "@components/Content/Tasks/TasksFilter/TasksFilter.jsx";
import TasksView from "@components/Content/Tasks/TasksView/TasksView.jsx";

import styles from "./AppLayout.module.css";

const AppLayout = ({ mode }) => {
  const content =
    {
      events: (
        <SplitPane resizable={true} leftPane={<EventGrid />} rightPane={<EventClientArea />} />
      ),
      tasks: <SplitPane resizable={false} leftPane={<TasksFilter />} rightPane={<TasksView />} />,
      builds: (
        <SplitPane resizable={true} leftPane={<BuildRoster />} rightPane={<BuildClientArea />} />
      ),
    }[mode] ?? null;

  return (
    <div className={styles.appLayout}>
      <Header mode={mode} />
      {mode == "events" && <Nav />}
      {content}
    </div>
  );
};

export default AppLayout;
