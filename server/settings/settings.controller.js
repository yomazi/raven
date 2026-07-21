import createError from "http-errors";

import SettingsService from "./settings.service.js";

class SettingsController {
  static async getAllSettings(req, res, next) {
    try {
      const settings = await SettingsService.getAllSettings();

      res.json({ success: true, environment: SettingsService.currentEnvironment(), settings });
    } catch (err) {
      next(err);
    }
  }

  static async updateSetting(req, res, next) {
    try {
      const { key } = req.params;
      const { environment, value } = req.body;
      const setting = await SettingsService.updateSetting(key, environment, value);

      if (!setting) throw createError.NotFound("Setting not found");
      res.json({ success: true, setting });
    } catch (err) {
      next(err);
    }
  }
}

export default SettingsController;
