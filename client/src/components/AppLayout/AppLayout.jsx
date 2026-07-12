import SplitPane from "@components/Content/SplitPane";
import Header from "@components/Header/Header";
import Nav from "@components/Nav/Nav";

import ContactsPanel from "@components/Content/Contacts/ContactsPanel.jsx";
import NotFoundPanel from "@components/Content/NotFound/NotFoundPanel.jsx";
import ReportsPanel from "@components/Content/Reports/ReportsPanel.jsx";
import RosterClientArea from "@components/Content/Roster/RosterClientArea/RosterClientArea.jsx";
import RosterGrid from "@components/Content/Roster/RosterGrid/RosterGrid.jsx";
import TasksFilter from "@components/Content/Tasks/TasksFilter/TasksFilter.jsx";
import TasksView from "@components/Content/Tasks/TasksView/TasksView.jsx";

import styles from "./AppLayout.module.css";

const AppLayout = ({ mode }) => {
  const content =
    {
      tasks: <SplitPane resizable={false} leftPane={<TasksFilter />} rightPane={<TasksView />} />,
      schedules: <ReportsPanel />,
      contacts: <ContactsPanel />,
      roster: (
        <SplitPane resizable={true} leftPane={<RosterGrid />} rightPane={<RosterClientArea />} />
      ),
      notfound: <NotFoundPanel />,
    }[mode] ?? <NotFoundPanel />;

  return (
    <div className={styles.appLayout}>
      <Header mode={mode} />
      {mode == "roster" && <Nav />}
      {content}
    </div>
  );
};

export default AppLayout;
