import mongoose from "mongoose";

const SettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    value: { type: String, default: "" },
  },
  { timestamps: true }
);

const Setting = mongoose.model("Setting", SettingSchema, "Settings");
export default Setting;
