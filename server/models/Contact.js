import mongoose from "mongoose";

const ContactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
  },
  {
    timestamps: true, // createdAt + updatedAt
  }
);

const Contact = mongoose.model("Contact", ContactSchema, "Contacts");
export default Contact;
