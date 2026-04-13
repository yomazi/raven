// server/utilities/ollama-client.js

import log from "../logging/log.js";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://dharma.local:11434";
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";
const USE_GROQ = !!GROQ_API_KEY;

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_DEFAULT_MODEL = "llama-3.1-8b-instant";

async function ollamaChat(messages, options = {}) {
  return USE_GROQ ? groqChat(messages, options) : localChat(messages, options);
}

async function localChat(messages, options = {}) {
  const { model = DEFAULT_MODEL, temperature = 0.1, numCtx = 4096 } = options;

  log.info("ollama-client", "sending local chat request", { model, numCtx });

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: { temperature, num_ctx: numCtx },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    log.error("ollama-client", "local request failed", { status: response.status, body: text });
    throw new Error(`Ollama error ${response.status}: ${text}`);
  }

  const data = await response.json();
  log.info("ollama-client", "local response received", { model });
  return data.message.content;
}

async function groqChat(messages, options = {}) {
  const { temperature = 0.1 } = options;
  const model = GROQ_DEFAULT_MODEL;

  log.info("ollama-client", "sending Groq chat request", { model });

  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    log.error("ollama-client", "Groq request failed", { status: response.status, body: text });
    throw new Error(`Groq error ${response.status}: ${text}`);
  }

  const data = await response.json();
  log.info("ollama-client", "Groq response received", { model });
  return data.choices[0].message.content;
}

async function ollamaHealthCheck(model = DEFAULT_MODEL) {
  if (USE_GROQ) {
    log.info("ollama-client", "health check (Groq mode)", {});
    return { ok: true, model: GROQ_DEFAULT_MODEL, backend: "groq" };
  }

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const available = data.models.map((m) => m.name);
    const ok = available.some((name) => name.startsWith(model.split(":")[0]));
    log.info("ollama-client", "health check", { ok, model, available });
    return { ok, model, available, backend: "ollama" };
  } catch (err) {
    log.error("ollama-client", "health check failed", { err });
    return { ok: false, model, error: err.message, backend: "ollama" };
  }
}

export { ollamaChat, ollamaHealthCheck };
