document.addEventListener("DOMContentLoaded", () => {
  setupRevealAnimations();
  hydrateBlogViewCounts();
  initBlogPage();
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

async function initBlogPage() {
  const view = document.querySelector("[data-blog-view]");
  if (view) {
    const posts = await loadLocalPosts();
    const articleSlug = new URLSearchParams(window.location.search).get("post");

    if (articleSlug) {
      const post = posts.find((item) => item.slug === articleSlug);
      if (post) {
        window.location.replace(post.url || `./${articleSlug}/`);
        return;
      }
    }

    await renderIndex(view, posts);
  }

  const postPage = document.querySelector("[data-blog-post]");
  if (postPage) {
    await trackBlogPostView(postPage);
  }
}

async function loadLocalPosts() {
  try {
    const response = await fetch("./posts/index.json");
    if (!response.ok) throw new Error("Failed to load local posts");
    const posts = await response.json();
    return Array.isArray(posts) ? posts : [];
  } catch (error) {
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

async function renderIndex(view, posts) {
  const viewCounts = await loadBlogViewCounts();
  const localCards = posts.map((post) => createLocalCard(post, viewCounts[post.slug])).join("");

  view.innerHTML = `
    <section class="blog-index-grid">
      ${localCards}
    </section>
  `;

  appendDevtoPosts(view, posts);
}

async function appendDevtoPosts(view, localPosts) {
  const existing = new Set(localPosts.map((post) => post.url).filter(Boolean));

  try {
    const response = await fetch("https://dev.to/api/articles?username=fredgitonga");
    if (!response.ok) throw new Error("Failed to load dev.to posts");

    const articles = await response.json();
    const latest = Array.isArray(articles) ? articles.slice(0, 4) : [];

    const cards = latest
      .filter((article) => article.url && !existing.has(article.url))
      .map((article) => createDevCard(article))
      .join("");

    if (cards) {
      view.insertAdjacentHTML("beforeend", `<section class="blog-index-grid">${cards}</section>`);
    }
  } catch (error) {
    return;
  }
}

function createLocalCard(post, viewCount = 0) {
  const tags = Array.isArray(post.tags) && post.tags.length ? post.tags.join(" · ") : "Blog post";

  return `
    <a class="blog-index-card" href="${escapeAttribute(post.url || `./${post.slug}/`)}">
      <div class="blog-index-card-media">
        ${
          post.cover
            ? `<img src="${escapeAttribute(post.cover)}" alt="${escapeAttribute(post.title)}" loading="lazy" />`
            : `<div class="blog-index-card-placeholder" aria-hidden="true"></div>`
        }
      </div>
      <div class="blog-index-card-content">
        <p class="blog-card-meta">${formatDate(post.date)} · ${post.readingTime || 1} min read <span class="blog-view-count">${formatViewCount(viewCount)}</span></p>
        <h2>${escapeHtml(post.title)}</h2>
        <p>${escapeHtml(post.description || "")}</p>
        <div class="blog-card-footer">
          <span>${escapeHtml(tags)}</span>
          <span>Read article</span>
        </div>
      </div>
    </a>
  `;
}

function createDevCard(article) {
  const viewBadge = renderDevViewBadge(article.page_views_count);
  return `
    <a class="blog-index-card blog-card-external" href="${escapeAttribute(article.url)}" target="_blank" rel="noreferrer">
      <div class="blog-index-card-media">
        ${
          article.cover_image
            ? `<img src="${escapeAttribute(article.cover_image)}" alt="${escapeAttribute(article.title)}" loading="lazy" />`
          : `<div class="blog-index-card-placeholder" aria-hidden="true"></div>`
        }
      </div>
      <div class="blog-index-card-content">
        <p class="blog-card-meta">${escapeHtml(formatDevDate(article))} · Dev.to${viewBadge}</p>
        <h2>${escapeHtml(article.title)}</h2>
        <p>${escapeHtml(article.description || "")}</p>
        <div class="blog-card-footer">
          <span>Dev.to</span>
          <span>Read article</span>
        </div>
      </div>
    </a>
  `;
}

function renderDevViewBadge(value) {
  if (value === null || typeof value === "undefined") return "";
  const count = Number(value);
  if (!Number.isFinite(count)) return "";
  return ` <span class="blog-view-count">${formatViewCount(count)}</span>`;
}

async function hydrateBlogViewCounts() {
  const nodes = document.querySelectorAll("[data-blog-view-count][data-blog-slug]");
  if (!nodes.length) return;

  const viewCounts = await loadBlogViewCounts();
  nodes.forEach((node) => {
    const slug = node.dataset.blogSlug;
    if (!slug) return;
    node.textContent = formatViewCount(viewCounts[slug] || 0);
  });
}

async function trackBlogPostView(postPage) {
  const slug = postPage.dataset.blogSlug;
  const countNode = postPage.querySelector("[data-blog-view-count]");
  if (!slug || !countNode) return;

  const viewCounts = await loadBlogViewCounts();
  const currentCount = Number(viewCounts[slug] || 0);
  countNode.textContent = formatViewCount(currentCount);

  try {
    const nextCount = await incrementBlogView(slug);
    if (typeof nextCount !== "number") {
      return;
    }

    countNode.textContent = formatViewCount(nextCount);
  } catch (error) {
    return;
  }
}

async function incrementBlogView(slug) {
  for (const endpoint of BLOG_VIEWS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: slug
      });

      if (!response.ok) continue;

      const result = await response.json();
      if (result && typeof result.views !== "undefined") {
        return Number(result.views);
      }
    } catch (error) {
      continue;
    }
  }

  return null;
}

function formatViewCount(value) {
  const count = Number(value || 0);
  const formatter = new Intl.NumberFormat("en-US", { notation: count >= 10000 ? "compact" : "standard" });
  return `${formatter.format(count)} view${count === 1 ? "" : "s"}`;
}

function renderPost(view, post) {
  const tags = Array.isArray(post.tags) && post.tags.length ? post.tags.join(" · ") : "";

  view.innerHTML = `
    <article class="blog-article">
      <p class="eyebrow">Blog</p>
      <h1>${escapeHtml(post.title)}</h1>
      <p class="blog-meta">${formatDate(post.date)} · ${post.readingTime || 1} min read${tags ? ` · ${escapeHtml(tags)}` : ""}</p>
      ${post.cover ? `<div class="blog-post-cover"><img src="${escapeAttribute(post.cover)}" alt="${escapeAttribute(post.title)}" /></div>` : ""}
      <div class="post-content">
        ${post.html || ""}
      </div>
      <div class="blog-post-footer">
        <a class="button button-ghost" href="./">Back to blog</a>
      </div>
    </article>
  `;
}

function parseMarkdownPost(markdown, slug, base = {}) {
  const { metadata, body } = parseFrontMatter(markdown);
  const title = metadata.title || base.title || slug.replace(/-/g, " ");
  return {
    slug,
    title,
    description: metadata.description || base.description || "",
    date: metadata.date || base.date || "",
    cover: metadata.cover || metadata.image || base.cover || "",
    readingTime: metadata.readingtime || metadata.readingTime || base.readingTime || estimateReadingTime(body),
    tags: parseTags(metadata.tags || base.tags),
    html: renderMarkdown(body),
    url: base.url || `./${slug}/`
  };
}

function parseFrontMatter(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) return { metadata: {}, body: raw.trim() };

  const metadata = {};
  match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const separator = line.indexOf(":");
      if (separator === -1) return;
      const key = line.slice(0, separator).trim().toLowerCase();
      const value = line.slice(separator + 1).trim();
      metadata[key] = stripQuotes(value);
    });

  return { metadata, body: raw.slice(match[0].length).trim() };
}

function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const codeFence = line.match(/^```(\w+)?\s*$/);
    if (codeFence) {
      const language = codeFence[1] || "";
      const codeLines = [];
      index += 1;

      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) index += 1;
      blocks.push(`<pre><code${language ? ` class="language-${escapeAttribute(language)}"` : ""}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      continue;
    }

    const imageLine = line.trim().match(/^!\[([^\]]*)\]\((.+)\)$/);
    if (imageLine) {
      blocks.push(`<figure class="post-image">${renderMarkdownImage(imageLine[1], imageLine[2])}</figure>`);
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      blocks.push(`<h${heading[1].length}>${renderInline(heading[2])}</h${heading[1].length}>`);
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push(`<blockquote><p>${renderInline(quoteLines.join(" "))}</p></blockquote>`);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push(`<ul>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push(`<ol>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ol>`);
      continue;
    }

    const paragraphLines = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^```/.test(lines[index]) &&
      !/^(#{1,6})\s+/.test(lines[index]) &&
      !/^!\[([^\]]*)\]\((.+)\)$/.test(lines[index].trim()) &&
      !/^>\s?/.test(lines[index]) &&
      !/^[-*]\s+/.test(lines[index]) &&
      !/^\d+\.\s+/.test(lines[index])
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }

    blocks.push(`<p>${renderInline(paragraphLines.join(" "))}</p>`);
  }

  return blocks.join("\n");
}

function renderInline(text) {
  let result = escapeHtml(text);
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, target) => renderMarkdownImage(alt, target));
  result = result.replace(/`([^`]+)`/g, (_, code) => `<code>${escapeHtml(code)}</code>`);
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => `<a href="${escapeAttribute(url)}">${label}</a>`);
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  result = result.replace(/_([^_]+)_/g, "<em>$1</em>");
  return result;
}

function renderMarkdownImage(alt, rawTarget) {
  const target = stripQuotes(String(rawTarget).trim());
  const match = target.match(/^(\S+)(?:\s+"([^"]+)")?$/);
  const src = match ? match[1] : target;
  const title = match && match[2] ? ` title="${escapeAttribute(match[2])}"` : "";
  const altAttr = ` alt="${escapeAttribute(alt)}"`;

  const extMatch = src.match(/^(.*)\.(png|jpe?g)$/i);
  if (extMatch) {
    const base = extMatch[1];
    const ext = extMatch[2].toLowerCase();
    const original = `${base}.${ext}`;
    const avif = `${base}.avif`;
    const webp = `${base}.webp`;

    return `
      <picture>
        <source srcset="${escapeAttribute(avif)}" type="image/avif" />
        <source srcset="${escapeAttribute(webp)}" type="image/webp" />
        <img src="${escapeAttribute(original)}"${altAttr}${title} loading="lazy" />
      </picture>
    `.trim();
  }

  return `<img src="${escapeAttribute(src)}"${altAttr}${title} loading="lazy" />`;
}

function parseTags(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function estimateReadingTime(markdown) {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatDevDate(article) {
  return formatDate(article.published_at || article.readable_publish_date || "");
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

function stripQuotes(value) {
  return String(value).replace(/^["']|["']$/g, "");
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
