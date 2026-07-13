import SettingsRepository from "./settings.repository.js";

class SettingsService {
  static async getAllSettings() {
    const settings = await SettingsRepository.findAll();

    return settings;
  }

  static async getValue(key) {
    const setting = await SettingsRepository.findByKey(key);

    return setting?.value ?? null;
  }

  static async updateSetting(key, value) {
    const setting = await SettingsRepository.updateValueByKey(key, value);

    return setting;
  }
}

export default SettingsService;
