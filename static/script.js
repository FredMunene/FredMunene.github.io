document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupRevealAnimations();
  loadProjects();
  loadBlogs();
  loadRecognition();
});

function setupNavigation() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");

  if (!toggle || !nav) return;

  const closeNav = () => {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeNav);
  });

  document.addEventListener("click", (event) => {
    if (!nav.contains(event.target) && !toggle.contains(event.target)) {
      closeNav();
    }
  });
}

function setupRevealAnimations() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  items.forEach((item) => observer.observe(item));
}

async function loadProjects() {
  const tabs = document.querySelector("[data-project-tabs]");
  const container = document.querySelector("[data-projects-container]");
  const fallback = document.querySelector("[data-projects-fallback]");

  if (!tabs || !container) return;

  try {
    const response = await fetch("static/projects.json");
    if (!response.ok) throw new Error("Failed to load projects");

    const data = await response.json();
    const repos = Array.isArray(data.repos) ? data.repos : [];
    const grouped = groupProjects(repos);
    const categories = Object.keys(grouped);

    if (!categories.length) {
      if (fallback) fallback.style.display = "block";
      return;
    }

    container.innerHTML = "";
    tabs.innerHTML = "";

    categories.forEach((category, index) => {
      const button = document.createElement("button");
      button.className = "tab-button";
      button.type = "button";
      button.textContent = category;
      if (index === 0) button.classList.add("active");
      tabs.appendChild(button);

      const grid = document.createElement("div");
      grid.className = "projects-grid";
      grid.dataset.category = category;
      grid.style.display = index === 0 ? "grid" : "none";

      grouped[category].slice(0, 4).forEach((repo) => {
        grid.appendChild(createProjectCard(repo));
      });

      container.appendChild(grid);
    });

    tabs.addEventListener("click", (event) => {
      const button = event.target.closest(".tab-button");
      if (!button) return;

      tabs.querySelectorAll(".tab-button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");

      const selected = button.textContent;
      container.querySelectorAll(".projects-grid").forEach((grid) => {
        grid.style.display = grid.dataset.category === selected ? "grid" : "none";
      });
    });
  } catch (error) {
    if (fallback) fallback.style.display = "block";
  }
}

function groupProjects(repos) {
  const grouped = {};

  repos.forEach((repo) => {
    const topics = Array.isArray(repo.topics) ? repo.topics : [];
    const categoryTopic = topics.find((topic) => topic.toLowerCase() !== "project");
    const category = titleCase(categoryTopic || "General");

    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(repo);
  });

  return grouped;
}

function createProjectCard(repo) {
  const card = document.createElement("article");
  card.className = "project-card";

  const title = document.createElement("h3");
  title.textContent = repo.name;

  const description = document.createElement("p");
  description.textContent = repo.description || "Project description coming soon.";

  const meta = document.createElement("div");
  meta.className = "project-meta";
  meta.textContent = repo.updated_at
    ? `Updated ${new Date(repo.updated_at).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric"
      })}`
    : "";

  const links = document.createElement("div");
  links.className = "project-links";

  if (repo.html_url) {
    const repoLink = document.createElement("a");
    repoLink.href = repo.html_url;
    repoLink.target = "_blank";
    repoLink.rel = "noreferrer";
    repoLink.textContent = "Repository";
    links.appendChild(repoLink);
  }

  if (repo.homepage) {
    const liveLink = document.createElement("a");
    liveLink.href = repo.homepage;
    liveLink.target = "_blank";
    liveLink.rel = "noreferrer";
    liveLink.textContent = "Live site";
    links.appendChild(liveLink);
  }

  const tags = document.createElement("p");
  tags.className = "muted";
  tags.textContent = Array.isArray(repo.topics) && repo.topics.length
    ? repo.topics.join(" · ")
    : "project";

  card.append(title, description, meta, tags, links);
  return card;
}

async function loadBlogs() {
  const container = document.querySelector("[data-blog-grid]");
  const fallback = document.querySelector("[data-blog-fallback]");
  if (!container) return;

  try {
    const response = await fetch("https://dev.to/api/articles?username=fredgitonga");
    if (!response.ok) throw new Error("Failed to load blog posts");

    const articles = await response.json();
    const latest = Array.isArray(articles) ? articles.slice(0, 4) : [];

    if (!latest.length) {
      if (fallback) fallback.style.display = "block";
      return;
    }

    container.innerHTML = "";
    latest.forEach((article) => {
      const card = document.createElement("a");
      card.className = "blog-card";
      card.href = article.url;
      card.target = "_blank";
      card.rel = "noreferrer";

      const image = document.createElement("img");
      image.src = article.cover_image || "static/blog1.png";
      image.alt = article.title;
      image.loading = "lazy";

      const content = document.createElement("div");
      content.className = "blog-content";

      const title = document.createElement("h3");
      title.textContent = article.title;

      const description = document.createElement("p");
      description.textContent = article.description || "Read the full article.";

      content.append(title, description);
      card.append(image, content);
      container.appendChild(card);
    });
  } catch (error) {
    if (fallback) fallback.style.display = "block";
  }
}

async function loadRecognition() {
  const talksContainer = document.querySelector("[data-talks]");
  const awardsContainer = document.querySelector("[data-awards]");

  if (!talksContainer && !awardsContainer) return;

  try {
    const response = await fetch("static/awards.json");
    if (!response.ok) throw new Error("Failed to load recognition data");

    const data = await response.json();

    if (talksContainer && Array.isArray(data.Talks)) {
      talksContainer.innerHTML = "";
      data.Talks.forEach((item) => talksContainer.appendChild(createRecognitionCard(item)));
    }

    if (awardsContainer && Array.isArray(data.Awards)) {
      awardsContainer.innerHTML = "";
      data.Awards.forEach((item) => awardsContainer.appendChild(createRecognitionCard(item)));
    }
  } catch (error) {
    return;
  }
}

function createRecognitionCard(item) {
  const card = document.createElement("article");
  card.className = "recognition-item";

  const image = document.createElement("img");
  image.src = item.src;
  image.alt = item.alt || item.subtitle || "Recognition image";
  image.loading = "lazy";

  const copy = document.createElement("div");
  copy.className = "recognition-copy";

  const title = document.createElement("h4");
  title.textContent = item.subtitle || "Recognition";

  const date = document.createElement("p");
  date.textContent = item.date || "";

  copy.append(title, date);
  card.append(image, copy);
  return card;
}

function titleCase(value) {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
