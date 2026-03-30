const clients = new Set();

class TasksEvents {
  static sseHandler(req, res) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    res.write("event: connected\ndata: {}\n\n");

    const keepAlive = setInterval(() => {
      res.write(": ping\n\n");
    }, 25_000);

    clients.add(res);

    req.on("close", () => {
      clearInterval(keepAlive);
      clients.delete(res);
    });
  }

  static notifyTaskChange(type, payload) {
    if (clients.size === 0) return;
    const message = `event: task_${type}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of clients) {
      try {
        client.write(message);
      } catch {
        clients.delete(client);
      }
    }
  }
}

export default TasksEvents;
