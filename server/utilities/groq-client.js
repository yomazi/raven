// server/utilities/groq-client.js

import log from "../logging/log.js";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

async function groqChat(messages, options = {}) {
  const { temperature = 0.1 } = options;
  const model = DEFAULT_MODEL;

  log.info("groq-client", "sending chat request", { model });

  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({ model, messages, temperature }),
  });

  if (!response.ok) {
    const text = await response.text();
    log.error("groq-client", "request failed", { status: response.status, body: text });
    throw new Error(`Groq error ${response.status}: ${text}`);
  }

  const data = await response.json();
  log.info("groq-client", "response received", { model });
  return data.choices[0].message.content;
}

async function groqHealthCheck() {
  if (!GROQ_API_KEY) {
    return { ok: false, error: "GROQ_API_KEY not set", backend: "groq" };
  }
  log.info("groq-client", "health check", {});
  return { ok: true, model: DEFAULT_MODEL, backend: "groq" };
}

export { groqChat, groqHealthCheck };
