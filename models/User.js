import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  login: String,
  name: String,
  avatar_url: String,
  html_url: String,
  bio: String,
}, { timestamps: true });

export default mongoose.model("User", userSchema);
