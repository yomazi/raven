import ApiTokensService from "./api-tokens.service.js";

class ApiTokensController {
  static async list(req, res) {
    try {
      const tokens = await ApiTokensService.listNamedApiTokens();
      const result = tokens.map((t) => ({
        id: t._id,
        name: t.name,
        createdAt: t.apiTokenCreatedAt,
        revoked: t.revoked,
      }));
      res.json({ success: true, tokens: result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async create(req, res) {
    try {
      const { name } = req.body;
      const result = await ApiTokensService.createNamedApiToken(name);
      res.status(201).json({ success: true, ...result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async revoke(req, res) {
    try {
      const { id } = req.params;
      const token = await ApiTokensService.revokeApiToken(id);
      if (!token) return res.status(404).json({ success: false, error: "Token not found" });
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export default ApiTokensController;
