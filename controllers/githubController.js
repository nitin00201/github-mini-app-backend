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

    console.log("Received search query:", q);

    const { data } = await octokit.rest.search.repos({
      q: q.trim(),
      sort: "stars",
      order: "desc",
      per_page: 5,
    });

    console.log("GitHub API returned total_count:", data.total_count);
    console.log("Number of items returned:", data.items.length);

    const savedRepos = [];

    for (const repo of data.items) {
      const repoData = {
        name: repo.name,
        full_name: repo.full_name,
        html_url: repo.html_url,
        description: repo.description,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
      };

      try {
        // Correct usage: first argument is filter, second is update object
        const result = await Repo.updateOne(
          { full_name: repo.full_name }, // filter by unique repo full name
          { $set: repoData },            // update data
          { upsert: true }               // insert if not exists
        );
        savedRepos.push(repo.full_name);
        console.log(`Repo saved/updated: ${repo.full_name}`, result);
      } catch (dbErr) {
        console.error(`Database insertion failed for repo: ${repo.full_name}`, dbErr.message);
      }
    }

    console.log("All saved/updated repos:", savedRepos);

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
