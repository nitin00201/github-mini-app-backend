import express from "express";
import { getUser, getUserRepos, searchRepos } from "../controllers/githubController.js";

const router = express.Router();

// /api/user/octocat
router.get("/user/:username", getUser);

// /api/user/octocat/repos
router.get("/user/:username/repos", getUserRepos);

// /api/search?q=react
router.get("/search", searchRepos);

export default router;
