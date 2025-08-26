import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";

dotenv.config();

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN || undefined,
  userAgent: "github-mini-app/1.0",
});

export default octokit;
