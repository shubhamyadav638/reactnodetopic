import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    image: String,
  },
  { timestamps: true }
);

const userModel = mongoose.model("user", userSchema);

export default userModel;
