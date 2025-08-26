import express from "express";
import User from "../models/User.js";
import Repo from "../models/Repo.js";

const router = express.Router();

// GET /dashboard?type=users&page=1
router.get("/dashboard", async (req, res) => {
  try {
    const { type = "users", page = 1 } = req.query; // default to users, page 1
    const limit = 9;
    const skip = (page - 1) * limit;

    let data, totalCount;

    if (type === "repos") {
      totalCount = await Repo.countDocuments();
      data = await Repo.find({})
        .skip(skip)
        .limit(limit)
        .sort({ created_at: -1 }); // optional: newest first
    } else {
      totalCount = await User.countDocuments();
      data = await User.find({})
        .skip(skip)
        .limit(limit)
        .sort({ created_at: -1 });
    }

    res.json({
      type,
      page: Number(page),
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      results: data,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching dashboard data" });
  }
});

export default router;
