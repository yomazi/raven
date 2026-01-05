const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI;

async function connectDb() {
  if (mongoose.connection.readyState >= 1) {
    // Already connected
    return;
  }

  try {
    await mongoose.connect(MONGO_URI, {});
    console.log("✅ Mongoose connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
}

module.exports = { connectDb };
