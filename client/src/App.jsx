import axios from "axios";
import { useEffect, useState } from "react";

import Header from "./components/Header/Header";

import "./App.css";

function App() {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    axios
      .get("/api/data", {
        withCredentials: true,
      })
      .then((res) => setMessage(res.data.message))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const verifyRes = await fetch("/auth/google/verify", {
          credentials: "include",
        });

        if (verifyRes.status === 401) {
          window.location.href = "/auth/google";
          return;
        }

        if (!verifyRes.ok) throw new Error("Failed to fetch /auth/google/verify");

        const driveRes = await fetch("/api/drive/root", {
          credentials: "include",
        });

        if (!driveRes.ok) throw new Error("Failed to fetch drive root");

        setFiles(await driveRes.json());
      } catch (err) {
        console.error(err);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const usersRes = await fetch("/api/users", {
          credentials: "include",
        });

        if (!usersRes.ok) throw new Error("Failed to fetch /api/users");

        setUsers(await usersRes.json());
      } catch (err) {
        console.error(err);
      }
    };

    load();
  }, []);

  return (
    <div id="app">
      <Header />
      <p>{message}</p>
      <h1>My Google Drive Files!!</h1>
      <ul>
        {files.map((file) => (
          <li key={file.id} className="item">
            {file.name} ({file.mimeType})
          </li>
        ))}
      </ul>
      <h1>Users</h1>
      <ul>
        {users.map((user) => (
          <li key={user.id} className="item">
            {user.name}: {user.email} added at {user.createdAt}.
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
