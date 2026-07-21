import mongoose from "mongoose";

const SettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    // Two independent values so test and prod can point at different
    // resources (e.g. different template doc IDs) without stepping on each
    // other — see SettingsService.getValue for how the current one resolves.
    value: {
      test: { type: String, default: "" },
      prod: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

const Setting = mongoose.model("Setting", SettingSchema, "Settings");
export default Setting;
