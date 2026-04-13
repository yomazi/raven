// server/ollama/ollama.service.js

import log from "../logging/log.js";
import { ollamaChat, ollamaHealthCheck } from "../utilities/ollama-client.js";

// ---------------------------------------------------------------------------
// Schema constants — mirror Show model enums so the prompt is explicit
// ---------------------------------------------------------------------------

const BACKEND_TYPES = ["plus", "vs", "none"];
const HOSPITALITY_TYPES = ["light", "normal", "heavy", "see rider", "none"];
const BACKLINE_TYPES = ["no", "if needed", "yes", "in house", "buyout"];
const MERCH_CUTS = ["85% artist / 15% venue", "no merch commission"];

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `
You are a structured data extraction assistant. You read music performance offer letters
and extract specific fields into JSON. You return ONLY valid JSON — no explanation, no
markdown, no code fences. If a field is not present or cannot be determined, use null.

Extract the following structure exactly:

{
  "terms": {
    "main": {
      "guarantee": <number or null>,
      "backendType": <"plus" | "vs" | "none" | null>,
      "percentage": <number 0-100 or null>,
      "splitPoint": <number or null>
    }
  },
  "ticketPrices": {
    "ga": {
      "advance": <number or null>,
      "dos": <number or null>
    },
    "premium": {
      "advance": <number or null>,
      "dos": <number or null>
    },
    "vip": {
      "advance": <number or null>,
      "dos": <number or null>
    }
  },
  "production": {
    "hospitality": {
      "hospitalityType": <"light" | "normal" | "heavy" | "see rider" | "none" | null>,
      "totalBuyout": <number or null>
    },
    "meals": {
      "numPeople": <number or null>,
      "numDays": <number or null>,
      "dollarsPerPerson": <number or null>,
      "totalBuyout": <number or null>
    },
    "accommodations": {
      "numRooms": <number or null>,
      "numNights": <number or null>,
      "totalBuyout": <number or null>
    },
    "travel": {
      "totalBuyout": <number or null>
    },
    "backline": {
      "backlineType": <"no" | "if needed" | "yes" | "in house" | "buyout" | null>,
      "totalBuyout": <number or null>
    },
    "merchCut": <"85% artist / 15% venue" | "no merch commission" | null>,
    "numGuestListComps": <number or null>
  }
}

Rules:
- All money values are numbers (no $ signs, no commas).
- backendType "plus" means the artist gets the guarantee plus a percentage above the split point.
- backendType "vs" means the artist gets the greater of the guarantee or the percentage.
- If the offer says "versus" or "whichever is greater", use "vs".
- If the offer mentions a rider for hospitality details, use "see rider" for hospitalityType.
- Do not invent values. If uncertain, use null.
`.trim();

// ---------------------------------------------------------------------------
// Parse and validate the model's JSON response
// ---------------------------------------------------------------------------

function parseExtractionResponse(raw) {
  const cleaned = raw.replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Extraction response was not valid JSON: ${err.message}\n\nRaw: ${raw}`);
  }

  if (parsed.terms?.main?.backendType && !BACKEND_TYPES.includes(parsed.terms.main.backendType)) {
    log.warn("ollama.service", "invalid backendType, nulling", {
      value: parsed.terms.main.backendType,
    });
    parsed.terms.main.backendType = null;
  }

  if (
    parsed.production?.hospitality?.hospitalityType &&
    !HOSPITALITY_TYPES.includes(parsed.production.hospitality.hospitalityType)
  ) {
    log.warn("ollama.service", "invalid hospitalityType, nulling", {
      value: parsed.production.hospitality.hospitalityType,
    });
    parsed.production.hospitality.hospitalityType = null;
  }

  if (
    parsed.production?.backline?.backlineType &&
    !BACKLINE_TYPES.includes(parsed.production.backline.backlineType)
  ) {
    log.warn("ollama.service", "invalid backlineType, nulling", {
      value: parsed.production.backline.backlineType,
    });
    parsed.production.backline.backlineType = null;
  }

  if (parsed.production?.merchCut && !MERCH_CUTS.includes(parsed.production.merchCut)) {
    log.warn("ollama.service", "invalid merchCut, nulling", { value: parsed.production.merchCut });
    parsed.production.merchCut = null;
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class OllamaService {
  static async health() {
    return ollamaHealthCheck();
  }

  static async extract(documentText, options = {}) {
    const { model } = options;

    log.info("ollama.service", "starting extraction", {});

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Here is the offer letter:\n\n${documentText}` },
    ];

    const raw = await ollamaChat(messages, { model, temperature: 0.1, numCtx: 4096 });
    const extracted = parseExtractionResponse(raw);

    log.info("ollama.service", "extraction complete", { extracted });

    return { extracted };
  }
}

export default OllamaService;
