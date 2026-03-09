import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI;

export async function connectDb() {
  if (mongoose.connection.readyState >= 1) {
    // we're already connected; just return!
    return;
  }

  try {
    await mongoose.connect(MONGO_URI, {});
    console.log("[Raven] MongoDB connected via Mongoose");
  } catch (err) {
    console.error("[Raven] MongoDB connection error: ", err);
    process.exit(1);
  }
}
