// ./models/Show.js
const mongoose = require("mongoose");

const showSchema = new mongoose.Schema({
  googleFolderId: { type: String, required: true, unique: true },
  artist: { type: String, required: true },
  date: { type: Date, required: true },
  isMulti: { type: Boolean, default: false },
});

const Show = mongoose.model("Show", showSchema, "Shows");

module.exports = Show;
