import mongoose from "mongoose";

const repoSchema = new mongoose.Schema({
  name: String,
  full_name: String,
  html_url: String,
  description: String,
  language: String,
  stargazers_count: Number,
  forks_count: Number,
}, { timestamps: true });

export default mongoose.model("Repo", repoSchema);
