import Setting from "../models/Setting.js";

class SettingsRepository {
  static async findAll() {
    const settings = await Setting.find().sort({ createdAt: 1 }).lean();

    return settings;
  }

  static async findByKey(key) {
    const setting = await Setting.findOne({ key }).lean();

    return setting;
  }

  static async updateValueByKey(key, value) {
    const setting = await Setting.findOneAndUpdate(
      { key },
      { $set: { value } },
      { new: true, runValidators: true }
    ).lean();

    return setting;
  }
}

export default SettingsRepository;
