import mongoose from "mongoose";

const ShowSchema = new mongoose.Schema(
  {
    googleFolderId: { type: String, required: true, unique: true },
    artist: { type: String, required: true },
    date: { type: Date },
    isMulti: { type: Boolean, default: false },
    unparsed: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },

    drive: {
      folderIds: {
        marketingAssets: { type: String, default: null },
      },
      spreadsheetIds: {
        settlementWorkbook: { type: String, default: null },
        preExistingSheets: [{ id: String, name: String }],
      },
      documentIds: {
        contract: { type: String, default: null },
        marketingAssetsInfo: { type: String, default: null },
      },
    },

    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const Show = mongoose.model("Show", ShowSchema, "Shows");
export default Show;
