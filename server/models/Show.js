// ./models/Show.js
import mongoose from "mongoose";

const showSchema = new mongoose.Schema(
  {
    googleFolderId: { type: String, required: true, unique: true },
    artist: { type: String, required: true },
    date: { type: Date, required: true },
    isMulti: { type: Boolean, default: false },
    unparsed: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
  },
  {
    toJSON: {
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

const Show = mongoose.model("Show", showSchema, "Shows");

export default Show;
