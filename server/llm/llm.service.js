// server/llm/llm.service.js

import log from "../logging/log.js";
import { groqChat, groqHealthCheck } from "../utilities/groq-client.js";

// ---------------------------------------------------------------------------
// Preprocessing — strip addenda/boilerplate before sending to the LLM
// ---------------------------------------------------------------------------

const BOILERPLATE_MARKERS = [
  /^ADDENDUM\b/im,
  /^ADDITIONAL TERMS AND CONDITIONS/im,
  /^TERMS AND CONDITIONS/im,
  /^ARTIST[''']?S RIDER/im,
  /^PRODUCTION RIDER/im,
  /^TECHNICAL RIDER/im,
  /^HOSPITALITY RIDER/im,
];

const FACE_PAGE_CHAR_LIMIT = 4000;

function preprocessContract(text) {
  let cutAt = text.length;

  for (const marker of BOILERPLATE_MARKERS) {
    const match = marker.exec(text);
    if (match && match.index < cutAt) {
      cutAt = match.index;
    }
  }

  const trimmed = text.slice(0, cutAt).trim();

  // Belt-and-suspenders: if no marker found, cap at face-page limit
  return trimmed.length > FACE_PAGE_CHAR_LIMIT && cutAt === text.length
    ? trimmed.slice(0, FACE_PAGE_CHAR_LIMIT)
    : trimmed;
}

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
    log.warn("llm.service", "invalid backendType, nulling", { value: parsed.terms.main.backendType });
    parsed.terms.main.backendType = null;
  }

  if (
    parsed.production?.hospitality?.hospitalityType &&
    !HOSPITALITY_TYPES.includes(parsed.production.hospitality.hospitalityType)
  ) {
    log.warn("llm.service", "invalid hospitalityType, nulling", {
      value: parsed.production.hospitality.hospitalityType,
    });
    parsed.production.hospitality.hospitalityType = null;
  }

  if (
    parsed.production?.backline?.backlineType &&
    !BACKLINE_TYPES.includes(parsed.production.backline.backlineType)
  ) {
    log.warn("llm.service", "invalid backlineType, nulling", {
      value: parsed.production.backline.backlineType,
    });
    parsed.production.backline.backlineType = null;
  }

  if (parsed.production?.merchCut && !MERCH_CUTS.includes(parsed.production.merchCut)) {
    log.warn("llm.service", "invalid merchCut, nulling", { value: parsed.production.merchCut });
    parsed.production.merchCut = null;
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class LlmService {
  static async health() {
    return groqHealthCheck();
  }

  static async extract(documentText) {
    const preprocessed = preprocessContract(documentText);
    log.info("llm.service", "starting extraction", {
      originalChars: documentText.length,
      preprocessedChars: preprocessed.length,
    });

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Here is the offer letter:\n\n${preprocessed}` },
    ];

    const raw = await groqChat(messages);
    const extracted = parseExtractionResponse(raw);

    log.info("llm.service", "extraction complete", { extracted });

    return { extracted };
  }
}

export default LlmService;
