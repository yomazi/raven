// server/ollama/ollama.controller.js

import OllamaService from "./ollama.service.js";

class OllamaController {
  static async health(req, res) {
    try {
      const result = await OllamaService.health();
      res.json({ success: true, ...result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async extract(req, res) {
    try {
      const { text, model } = req.body;

      const result = await OllamaService.extract(text, { model });

      res.json({ success: true, ...result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export default OllamaController;
