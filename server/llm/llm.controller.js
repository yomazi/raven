// server/llm/llm.controller.js

import LlmService from "./llm.service.js";

class LlmController {
  static async health(req, res) {
    try {
      const result = await LlmService.health();
      res.json({ success: true, ...result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async extract(req, res) {
    try {
      const { text } = req.body;
      const result = await LlmService.extract(text);
      res.json({ success: true, ...result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export default LlmController;
