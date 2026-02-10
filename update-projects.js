const https = require("https");
const fs = require("fs");
const path = require("path");

const username = "FredMunene";
const apiUrl = `https://api.github.com/users/${username}/repos?sort=updated&per_page=100`;
const manualProjectsPath = path.join(__dirname, "static", "manual-projects.json");

function fetchRepos() {
  return new Promise((resolve, reject) => {
    https
      .get(
        apiUrl,
        {
          headers: {
            "User-Agent": "Node.js",
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
          }
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            try {
              const repos = JSON.parse(data);
              resolve(repos);
            } catch (error) {
              reject(error);
            }
          });
        }
      )
      .on("error", (error) => {
        reject(error);
      });
  });
}

function loadManualProjects() {
  if (!fs.existsSync(manualProjectsPath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(manualProjectsPath, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.repos)) return parsed.repos;
    return [];
  } catch (error) {
    console.error("Error reading manual projects:", error.message);
    return [];
  }
}

function normalizeRepo(repo) {
  const topics = Array.isArray(repo.topics) ? repo.topics : [];
  const hasProject = topics.some((topic) => topic.toLowerCase() === "project");
  return {
    name: repo.name || "Untitled",
    html_url: repo.html_url || repo.homepage || "",
    homepage: repo.homepage || null,
    topics: hasProject ? topics : [...topics, "project"],
    description: repo.description || null,
    updated_at: repo.updated_at || new Date().toISOString()
  };
}

async function updateProjects() {
  try {
    console.log("Fetching repositories from GitHub...");
    const repos = await fetchRepos();

    const filteredRepos = repos.filter((repo) => {
      if (!Array.isArray(repo.topics)) return false;
      return repo.topics.some((topic) => topic.toLowerCase() === "project");
    });

    const manualRepos = loadManualProjects();
    const combinedRepos = [
      ...filteredRepos.map(normalizeRepo),
      ...manualRepos.map(normalizeRepo)
    ];

    const dedupedRepos = [];
    const seen = new Set();
    combinedRepos.forEach((repo) => {
      const key = (repo.html_url || repo.name).toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      dedupedRepos.push(repo);
    });

    const projectsData = {
      lastUpdated: new Date().toISOString(),
      repos: dedupedRepos
    };

    const filePath = path.join(__dirname, "static", "projects.json");
    fs.writeFileSync(filePath, JSON.stringify(projectsData, null, 2));
    console.log(`Projects data updated successfully at ${filePath}`);
    console.log(`Total repos: ${repos.length}`);
    console.log(`Filtered repos (topic: project): ${filteredRepos.length}`);
    console.log(`Manual repos: ${manualRepos.length}`);
    console.log(`Final repos: ${dedupedRepos.length}`);
  } catch (error) {
    console.error("Error updating projects:", error.message);
    process.exit(1);
  }
}

updateProjects();
