import { google } from "googleapis";

import AuthService from "../auth/auth.service.js";

class GmailRepository {
  static async #getGmailClient() {
    const auth = await AuthService.getGoogleClient();
    return google.gmail({ version: "v1", auth });
  }

  /**
   * Extract a named header value from a Gmail message payload headers array.
   */
  static #header(headers = [], name) {
    return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? null;
  }

  /**
   * Decode a base64url-encoded Gmail string into a Buffer.
   * Gmail uses base64url (RFC 4648 §5): `-` instead of `+`, `_` instead of `/`.
   */
  static #decodeBase64Url(data) {
    if (!data) return null;
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64");
  }

  /**
   * Recursively walk a Gmail MIME payload tree and collect all attachment parts.
   *
   * An attachment is any leaf part with both a filename and a body.attachmentId.
   * Multipart/* parts are containers — we recurse into them but never collect them.
   */
  static #extractAttachments(part) {
    if (!part) return [];

    if (part.mimeType?.startsWith("multipart/")) {
      return (part.parts ?? []).flatMap((child) => GmailRepository.#extractAttachments(child));
    }

    if (part.body?.attachmentId && part.filename) {
      return [
        {
          attachmentId: part.body.attachmentId,
          filename: part.filename,
          mimeType: part.mimeType ?? "application/octet-stream",
          size: part.body.size ?? 0,
        },
      ];
    }

    return [];
  }

  /**
   * Extract the plaintext body from a Gmail payload tree.
   * Prefers text/plain; falls back to stripping tags from text/html.
   */
  static #extractBody(payload) {
    if (!payload) return null;

    function walk(part) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return { type: "plain", data: part.body.data };
      }
      if (part.mimeType === "text/html" && part.body?.data) {
        return { type: "html", data: part.body.data };
      }
      for (const child of part.parts ?? []) {
        const found = walk(child);
        if (found) return found;
      }
      return null;
    }

    const found = walk(payload);
    if (!found) return null;

    const decoded = GmailRepository.#decodeBase64Url(found.data)?.toString("utf-8") ?? null;
    if (!decoded) return null;

    if (found.type === "html") {
      return decoded
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }
    return decoded;
  }

  // ─── Public methods ────────────────────────────────────────────────────────

  /**
   * GET /api/v1/gmail/threads/:threadId
   *
   * Returns thread id and message stubs (headers + snippet only).
   * format: "metadata" — no body or attachment data.
   *
   * Response shape:
   * { id, messages: [{ id, subject, from, to, date, snippet }] }
   */
  static async getThread({ threadId }) {
    const gmail = await GmailRepository.#getGmailClient();

    const response = await gmail.users.threads.get({
      userId: "me",
      id: threadId,
      format: "metadata",
      metadataHeaders: ["Subject", "From", "To", "Date"],
    });

    const raw = response.data;

    const messages = (raw.messages ?? []).map((msg) => {
      const headers = msg.payload?.headers ?? [];
      return {
        id: msg.id,
        subject: GmailRepository.#header(headers, "Subject"),
        from: GmailRepository.#header(headers, "From"),
        to: GmailRepository.#header(headers, "To"),
        date: GmailRepository.#header(headers, "Date"),
        snippet: msg.snippet ?? null,
      };
    });

    return { id: raw.id, messages };
  }

  /**
   * GET /api/v1/gmail/messages/:messageId
   *
   * Returns a single message with headers, decoded body, and attachment metadata.
   * format: "full" — complete MIME tree, decoded server-side.
   * Attachment binaries are NOT included — only metadata. Binaries are fetched
   * separately via getAttachment when the user requests an upload.
   *
   * Response shape:
   * { id, threadId, subject, from, to, date, snippet, body,
   *   attachments: [{ attachmentId, filename, mimeType, size }] }
   */
  static async getMessage({ messageId }) {
    const gmail = await GmailRepository.#getGmailClient();

    const response = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

    const msg = response.data;
    const headers = msg.payload?.headers ?? [];

    return {
      id: msg.id,
      threadId: msg.threadId,
      subject: GmailRepository.#header(headers, "Subject"),
      from: GmailRepository.#header(headers, "From"),
      to: GmailRepository.#header(headers, "To"),
      date: GmailRepository.#header(headers, "Date"),
      snippet: msg.snippet ?? null,
      body: GmailRepository.#extractBody(msg.payload),
      attachments: GmailRepository.#extractAttachments(msg.payload),
    };
  }

  /**
   * GET /api/v1/gmail/attachments/:messageId/:attachmentId
   *
   * Fetches a single attachment binary from Gmail and returns it as a Buffer
   * along with the metadata the controller needs to set response headers.
   *
   * The Gmail attachments.get endpoint returns the data as a base64url string.
   * We decode it to a Buffer here so the controller can send raw bytes.
   *
   * Note: the Gmail API does not store mimeType or filename on the attachment
   * resource itself — those live on the message payload part. To avoid a second
   * messages.get call here, we accept them as optional parameters. If the caller
   * doesn't supply them (e.g. the client hits this endpoint directly), we fall
   * back to safe defaults. For the Dragonfly upload flow the client already has
   * this metadata from the getMessage response, so it sends the attachment
   * directly to the upload route without needing these fields from us.
   *
   * Returns: { data: Buffer, mimeType: string, filename: string, size: number }
   */
  static async getAttachment({ messageId, attachmentId, mimeType, filename }) {
    const gmail = await GmailRepository.#getGmailClient();

    const response = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId,
      id: attachmentId,
    });

    const raw = response.data;
    const data = GmailRepository.#decodeBase64Url(raw.data);

    return {
      data,
      mimeType: mimeType ?? "application/octet-stream",
      filename: filename ?? attachmentId,
      size: data?.length ?? raw.size ?? 0,
    };
  }
}

export default GmailRepository;
