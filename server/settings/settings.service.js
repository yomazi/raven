import SettingsRepository from "./settings.repository.js";

function currentEnvironment() {
  const env = process.env.SETTINGS_ENV ?? "test";
  if (env !== "test" && env !== "prod") {
    throw new Error(`SETTINGS_ENV must be "test" or "prod", got "${env}"`);
  }
  return env;
}

class SettingsService {
  static currentEnvironment() {
    return currentEnvironment();
  }

  static async getAllSettings() {
    const settings = await SettingsRepository.findAll();

    return settings;
  }

  // Signature unchanged from before the test/prod split — callers don't
  // need to know or care which environment they're getting.
  static async getValue(key) {
    return SettingsService.getValueForEnvironment(key, currentEnvironment());
  }

  // For callers governed by a DIFFERENT environment switch than
  // SETTINGS_ENV (e.g. live reports resolve by LIVE_REPORTS_ENV, which is
  // deliberately independent) — same lookup, explicit environment instead
  // of the Settings module's own current one.
  static async getValueForEnvironment(key, environment) {
    if (environment !== "test" && environment !== "prod") {
      throw new Error(`environment must be "test" or "prod", got "${environment}"`);
    }
    const setting = await SettingsRepository.findByKey(key);

    return setting?.value?.[environment] ?? null;
  }

  static async updateSetting(key, environment, value) {
    if (environment !== "test" && environment !== "prod") {
      throw new Error(`environment must be "test" or "prod", got "${environment}"`);
    }
    const setting = await SettingsRepository.updateValueByKey(key, environment, value);

    return setting;
  }
}

export default SettingsService;
