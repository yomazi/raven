import { google } from "googleapis";
import AuthService from "../auth/auth.service.js";

class DocsRepository {
  static async #getDocsClient() {
    const auth = await AuthService.getGoogleClient();
    const docs = google.docs({ version: "v1", auth });

    return docs;
  }

  // replacements: [{ find, replace }] — each pair becomes a replaceAllText
  // request; matchCase is always true so "{{ARTIST}}"-style placeholders
  // only match their exact literal token.
  static async replaceText(documentId, replacements) {
    const docs = await DocsRepository.#getDocsClient();

    const requests = replacements.map(({ find, replace }) => ({
      replaceAllText: {
        containsText: { text: find, matchCase: true },
        replaceText: replace,
      },
    }));

    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests },
    });
  }
}

export default DocsRepository;
