import { google } from "googleapis";

import AuthService from "../auth/auth.service.js";

class GmailRepository {
  static async #getGmailClient() {
    const auth = await AuthService.getGoogleClient();
    return google.gmail({ version: "v1", auth });
  }

  static #header(headers = [], name) {
    return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? null;
  }

  static #decodeBase64Url(data) {
    if (!data) return null;
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64");
  }

  static #encodeBase64Url(buffer) {
    return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

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

  static #extractBody(payload) {
    if (!payload) return null;
    function walk(part) {
      if (part.mimeType === "text/html" && part.body?.data)
        return { type: "html", data: part.body.data };
      if (part.mimeType === "text/plain" && part.body?.data)
        return { type: "plain", data: part.body.data };
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
    if (found.type === "plain") {
      return decoded.replace(/\n/g, "<br/>").trim();
    }
    return decoded;
  }

  /**
   * Build a raw RFC 2822 MIME message and encode it as base64url.
   *
   * Supports:
   *   - Plain text body
   *   - Optional threading headers (In-Reply-To, References) for replies/forwards
   *   - Optional attachments (array of { filename, mimeType, buffer })
   *
   * For messages with attachments we build a multipart/mixed message.
   * For plain text messages we build a simple text/plain message.
   */
  static #buildRawMessage({
    from,
    to,
    subject,
    body,
    inReplyTo = null,
    references = null,
    attachments = [], // [{ filename, mimeType, buffer }]
  }) {
    const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const toHeader = Array.isArray(to) ? to.join(", ") : to;

    const headers = [
      from ? `From: ${from}` : null,
      `To: ${toHeader}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      inReplyTo ? `In-Reply-To: ${inReplyTo}` : null,
      references ? `References: ${references}` : null,
    ]
      .filter(Boolean)
      .join("\r\n");

    let raw;
    if (attachments.length === 0) {
      // Simple text/html message
      raw = [headers, `Content-Type: text/html; charset="UTF-8"`, "", body].join("\r\n");
    } else {
      // multipart/mixed with text body + attachments
      const parts = [`--${boundary}`, `Content-Type: text/html; charset="UTF-8"`, "", body];

      for (const att of attachments) {
        const encoded = att.buffer.toString("base64");
        parts.push(
          `--${boundary}`,
          `Content-Type: ${att.mimeType}; name="${att.filename}"`,
          `Content-Disposition: attachment; filename="${att.filename}"`,
          `Content-Transfer-Encoding: base64`,
          "",
          encoded
        );
      }

      parts.push(`--${boundary}--`);

      raw = [headers, `Content-Type: multipart/mixed; boundary="${boundary}"`, "", ...parts].join(
        "\r\n"
      );
    }

    return GmailRepository.#encodeBase64Url(Buffer.from(raw));
  }

  /**
   * Resolve label names to Gmail label IDs.
   * Gmail's API requires label IDs (e.g. "Label_123"), not display names.
   * We fetch the full label list and match by name.
   */
  static async #resolveLabelIds(gmail, labelNames) {
    if (!labelNames?.length) return [];

    const response = await gmail.users.labels.list({ userId: "me" });
    const all = response.data.labels ?? [];

    return labelNames.map((name) => all.find((l) => l.name === name)?.id).filter(Boolean);
  }

  /**
   * Apply labels to an entire thread.
   * Gmail's threads.modify adds label IDs to every message in the thread.
   */
  static async #applyThreadLabels(gmail, threadId, labelNames) {
    if (!labelNames?.length || !threadId) return;
    const labelIds = await GmailRepository.#resolveLabelIds(gmail, labelNames);
    if (!labelIds.length) return;

    await gmail.users.threads.modify({
      userId: "me",
      id: threadId,
      requestBody: { addLabelIds: labelIds },
    });
  }

  /**
   * Apply labels to a single message.
   */
  static async #applyMessageLabels(gmail, messageId, labelNames) {
    if (!labelNames?.length || !messageId) return;
    const labelIds = await GmailRepository.#resolveLabelIds(gmail, labelNames);
    if (!labelIds.length) return;

    await gmail.users.messages.modify({
      userId: "me",
      id: messageId,
      requestBody: { addLabelIds: labelIds },
    });
  }

  // ─── Public methods ──────────────────────────────────────────────────────────

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
      messageId: GmailRepository.#header(headers, "Message-ID"),
      references: GmailRepository.#header(headers, "References"),
      snippet: msg.snippet ?? null,
      body: GmailRepository.#extractBody(msg.payload),
      attachments: GmailRepository.#extractAttachments(msg.payload),
    };
  }

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

  /**
   * POST /api/v1/gmail/messages/send
   * Compose and send a new message (no thread context).
   */
  static async sendMessage({ to, subject, body, from, sentLabels }) {
    const gmail = await GmailRepository.#getGmailClient();

    const raw = GmailRepository.#buildRawMessage({ from, to, subject, body });

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    const sentId = response.data.id;

    await GmailRepository.#applyMessageLabels(gmail, sentId, sentLabels);

    return { id: sentId, threadId: response.data.threadId };
  }

  /**
   * POST /api/v1/gmail/messages/:messageId/reply
   *
   * Replies to all recipients of the original message (reply-all).
   * Sets In-Reply-To and References headers so Gmail threads the reply correctly.
   * Optionally applies labels to the thread and the sent message.
   */
  static async replyToMessage({ messageId, body, from, threadLabels, sentLabels }) {
    const gmail = await GmailRepository.#getGmailClient();

    // Fetch the original message to get threading headers and recipients
    const orig = await GmailRepository.getMessage({ messageId });

    const origMessageId = orig.messageId;
    const origReferences = orig.references;

    // Reply-all: original sender + all To recipients, deduped
    const allRecipients = [orig.from, orig.to]
      .filter(Boolean)
      .flatMap((h) => h.split(",").map((a) => a.trim()))
      .filter((addr, i, arr) => addr && arr.indexOf(addr) === i);

    // Build References chain: existing references + original Message-ID
    const refsChain = [origReferences, origMessageId].filter(Boolean).join(" ");

    const raw = GmailRepository.#buildRawMessage({
      from,
      to: allRecipients,
      subject: orig.subject?.startsWith("Re:") ? orig.subject : `Re: ${orig.subject}`,
      body,
      inReplyTo: origMessageId,
      references: refsChain,
    });

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw, threadId: orig.threadId },
    });

    const sentId = response.data.id;

    // Apply labels in parallel
    await Promise.all([
      GmailRepository.#applyThreadLabels(gmail, orig.threadId, threadLabels),
      GmailRepository.#applyMessageLabels(gmail, sentId, sentLabels),
    ]);

    return { id: sentId, threadId: response.data.threadId };
  }

  /**
   * POST /api/v1/gmail/messages/:messageId/forward
   *
   * Forwards the original message to new recipients.
   * Re-attaches all original attachments and quotes the original body.
   * Optionally applies labels to the thread and the sent message.
   */
  static async forwardMessage({ messageId, to, body, from, threadLabels, sentLabels }) {
    const gmail = await GmailRepository.#getGmailClient();

    const orig = await GmailRepository.getMessage({ messageId });

    // Quote the original body below the user's new text
    const quotedBody = [
      body,
      "",
      `---------- Forwarded message ---------`,
      `From: ${orig.from}`,
      `Date: ${orig.date}`,
      `Subject: ${orig.subject}`,
      `To: ${orig.to}`,
      "",
      orig.body ?? "",
    ].join("\n");

    // Fetch all original attachment binaries in parallel
    const attachments = await Promise.all(
      (orig.attachments ?? []).map(async (att) => {
        const { data } = await GmailRepository.getAttachment({
          messageId,
          attachmentId: att.attachmentId,
        });
        return { filename: att.filename, mimeType: att.mimeType, buffer: data };
      })
    );

    const raw = GmailRepository.#buildRawMessage({
      from,
      to,
      subject: orig.subject?.startsWith("Fwd:") ? orig.subject : `Fwd: ${orig.subject}`,
      body: quotedBody,
      attachments,
    });

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    const sentId = response.data.id;

    await Promise.all([
      GmailRepository.#applyThreadLabels(gmail, orig.threadId, threadLabels),
      GmailRepository.#applyMessageLabels(gmail, sentId, sentLabels),
    ]);

    return { id: sentId, threadId: response.data.threadId };
  }

  /**
   * POST /api/v1/gmail/messages/:messageId/label
   *
   * Applies labels to the entire thread containing the given message.
   * Used when you want to label without sending (e.g. labeling inbound mail only).
   */
  static async labelThread({ messageId, labels }) {
    const gmail = await GmailRepository.#getGmailClient();

    // Get the threadId from the message
    const response = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "minimal",
    });

    const threadId = response.data.threadId;
    await GmailRepository.#applyThreadLabels(gmail, threadId, labels);

    return { threadId };
  }
}

export default GmailRepository;
