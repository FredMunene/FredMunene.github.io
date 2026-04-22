document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupRevealAnimations();
  setupContactForm();
  loadProjects();
  loadBlogs();
  loadRecognition();
});

const BLOG_VIEWS_ENDPOINT =
  typeof window !== "undefined" && window.SITE_CONFIG && window.SITE_CONFIG.blogViewsEndpoint
    ? window.SITE_CONFIG.blogViewsEndpoint
    : "";
const BLOG_VIEWS_ENDPOINTS = [
  BLOG_VIEWS_ENDPOINT,
  typeof window !== "undefined" && window.BLOG_VIEWS_ENDPOINT ? window.BLOG_VIEWS_ENDPOINT : "",
  "/.netlify/functions/blog-views",
  "/api/blog/views"
].filter(Boolean);

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

function setupContactForm() {
  const form = document.querySelector("#contact-form");
  const status = document.querySelector("[data-form-status]");

  if (!form || !status) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);

    status.textContent = "Sending...";
    if (submitButton) submitButton.disabled = true;

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Submission failed");
      }

      form.reset();
      status.textContent = "Message sent.";
    } catch (error) {
      status.textContent = "Message could not be sent. Use the email address instead.";
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
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

async function loadBlogs() {
  const container = document.querySelector("[data-blog-grid]");
  if (!container) return;

  try {
    const localPosts = await loadLocalBlogPosts();
    const viewCounts = await loadBlogViewCounts();
    const localCards = localPosts.slice(0, 2).map((post) => {
      const href = post.url || `/blog/${post.slug}/`;
      return createLocalBlogCard(post, href, viewCounts[post.slug]);
    });
    const existing = new Set(localPosts.slice(0, 2).map((post) => post.url || `/blog/${post.slug}/`));
    const devCards = await loadDevBlogCards(existing);

    container.innerHTML = "";
    container.insertAdjacentHTML("beforeend", devCards.join(""));
    container.insertAdjacentHTML("beforeend", localCards.join(""));
  } catch (error) {
    console.warn("Blog feed failed", error);
  }
}

async function loadLocalBlogPosts() {
  try {
    const response = await fetch("/blog/posts/index.json");
    if (!response.ok) throw new Error("Failed to load local posts");

    const posts = await response.json();
    return Array.isArray(posts) ? posts : [];
  } catch (error) {
    return [];
  }
}

async function loadDevBlogCards(existing) {
  try {
    const response = await fetch("https://dev.to/api/articles?username=fredgitonga&per_page=2", {
      headers: {
        Accept: "application/vnd.forem.api-v1+json"
      }
    });
    if (!response.ok) throw new Error("Failed to load dev.to posts");

    const articles = await response.json();
    const latest = Array.isArray(articles) ? articles.slice(0, 2) : [];

    return latest
      .filter((article) => article.url && !existing.has(article.url))
      .map((article) => {
        existing.add(article.url);
        return createDevBlogCard(article, article.url);
      });
  } catch (error) {
    console.warn("Dev.to blog feed unavailable", error);
    return [];
  }
}

async function loadBlogViewCounts() {
  for (const endpoint of BLOG_VIEWS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) continue;

      const views = await response.json();
      if (views && typeof views === "object" && !Array.isArray(views)) {
        return views;
      }
    } catch (error) {
      continue;
    }
  }

  try {
    const response = await fetch("/blog/views.json");
    if (!response.ok) throw new Error("Failed to load blog views");

    const views = await response.json();
    return views && typeof views === "object" && !Array.isArray(views) ? views : {};
  } catch (error) {
    return {};
  }
}

function createLocalBlogCard(post, href, viewCount = 0) {
  const tags = Array.isArray(post.tags) && post.tags.length ? post.tags.join(" · ") : "Blog post";

  return `
    <a class="blog-card" href="${escapeAttribute(href)}">
      <img src="${escapeAttribute(post.cover || "static/blog1.png")}" alt="${escapeAttribute(post.title)}" loading="lazy" />
      <div class="blog-content">
        <p class="blog-card-meta">${formatDate(post.date)} · ${post.readingTime || 1} min read <span class="blog-view-count">${formatViewCount(viewCount)}</span></p>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(post.description || "Read the full article.")}</p>
        <div class="blog-card-footer">
          <span>${escapeHtml(tags)}</span>
          <span>Read article</span>
        </div>
      </div>
    </a>
  `;
}

function createDevBlogCard(article, href) {
  const viewBadge = renderDevEngagementBadge(article);
  return `
    <a class="blog-card blog-card-external" href="${escapeAttribute(href)}" target="_blank" rel="noreferrer">
      <img src="${escapeAttribute(article.cover_image || "static/blog1.png")}" alt="${escapeAttribute(article.title)}" loading="lazy" />
      <div class="blog-content">
        <p class="blog-card-meta">${escapeHtml(formatBlogDate(article))} · Dev.to${viewBadge}</p>
        <h3>${escapeHtml(article.title)}</h3>
        <p>${escapeHtml(article.description || "Read the full article.")}</p>
        <div class="blog-card-footer">
          <span>Dev.to</span>
          <span>Read article</span>
        </div>
      </div>
    </a>
  `;
}

function renderDevEngagementBadge(article) {
  const viewCount = Number(article.page_views_count);
  if (Number.isFinite(viewCount) && viewCount > 0) {
    return ` <span class="blog-view-count">${formatViewCount(viewCount)}</span>`;
  }

  const reactionCount = Number(article.public_reactions_count || article.positive_reactions_count);
  if (!Number.isFinite(reactionCount) || reactionCount <= 0) return "";

  return ` <span class="blog-view-count">${formatReactionCount(reactionCount)}</span>`;
}

function formatReactionCount(value) {
  const count = Number(value || 0);
  const formatter = new Intl.NumberFormat("en-US", { notation: count >= 10000 ? "compact" : "standard" });
  return `${formatter.format(count)} reaction${count === 1 ? "" : "s"}`;
}

function titleCase(value) {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatBlogDate(article) {
  const source = article.published_at || article.readable_publish_date || "";
  const formatted = formatDate(source);
  return formatted || article.readable_publish_date || "";
}

function formatViewCount(value) {
  const count = Number(value || 0);
  const formatter = new Intl.NumberFormat("en-US", { notation: count >= 10000 ? "compact" : "standard" });
  return `${formatter.format(count)} view${count === 1 ? "" : "s"}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
