import mongoose from "mongoose";

const GroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    contacts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Contact",
      },
    ],
  },
  {
    timestamps: true, // createdAt + updatedAt
  }
);

const Group = mongoose.model("Group", GroupSchema, "Groups");
export default Group;
