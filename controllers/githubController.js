import octokit from "../config/github.js";
import User from "../models/User.js";
import Repo from "../models/Repo.js";

// Get user profile & save
export const getUser = async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const { data } = await octokit.rest.users.getByUsername({ username });

    // Save to DB with error handling
    const user = await User.findOneAndUpdate(
      { login: data.login },
      data,
      { upsert: true, new: true }
    );

    res.status(200).json(user);
  } catch (err) {
    console.error("Error in getUser:", err);
    
    if (err.status === 404) {
      return res.status(404).json({ error: "User not found" });
    }
    if (err.status === 403) {
      return res.status(403).json({ error: "Rate limit exceeded or access denied" });
    }
    
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get repos & save
export const getUserRepos = async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const { data } = await octokit.rest.repos.listForUser({
      username,
      per_page: 10,
      sort: "updated",
    });

    // Save repos with better error handling
    if (data && data.length > 0) {
      try {
        await Repo.insertMany(data, { ordered: false });
      } catch (dbErr) {
        // Log DB errors but don't fail the request
        console.warn("Database insertion failed:", dbErr.message);
      }
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("Error in getUserRepos:", err);
    
    if (err.status === 404) {
      return res.status(404).json({ error: "User not found" });
    }
    if (err.status === 403) {
      return res.status(403).json({ error: "Rate limit exceeded or access denied" });
    }
    
    res.status(500).json({ error: "Internal server error" });
  }
};

// Search repos & save
export const searchRepos = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim() === "") {
      return res.status(400).json({ error: "Search query is required" });
    }

    const { data } = await octokit.rest.search.repos({
      q: q.trim(),
      sort: "stars",
      order: "desc",
      per_page: 5,
    });

    // Save repos with better error handling
    if (data.items && data.items.length > 0) {
      try {
        // Filter out repos that might cause duplicate key errors
        const reposToSave = data.items.map(repo => ({
          ...repo,
          // Ensure we have a unique identifier
          _id: repo.id,
        }));
        
        await Repo.insertMany(reposToSave, { ordered: false });
      } catch (dbErr) {
        // Log DB errors but don't fail the request
        console.warn("Database insertion failed:", dbErr.message);
      }
    }

    // Return the search results with metadata
    res.status(200).json({
      total_count: data.total_count,
      incomplete_results: data.incomplete_results,
      items: data.items
    });
  } catch (err) {
    console.error("Error in searchRepos:", err);
    
    if (err.status === 403) {
      return res.status(403).json({ error: "Rate limit exceeded or access denied" });
    }
    if (err.status === 422) {
      return res.status(422).json({ error: "Invalid search query" });
    }
    
    res.status(500).json({ error: "Internal server error" });
  }
};