import { getStore } from "@netlify/blobs";

const STORE_NAME = "blog-views";
const STORE_KEY = "views";

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 204);
  }

  const store = getStore(STORE_NAME);

  try {
    if (request.method === "GET") {
      const views = await readViews(store);
      return jsonResponse(views);
    }

    if (request.method === "POST") {
      const { slug } = await readPayload(request);
      const cleanSlug = sanitizeSlug(slug);

      if (!cleanSlug) {
        return jsonResponse({ error: "Invalid slug" }, 400);
      }

      const views = await readViews(store);
      views[cleanSlug] = Number(views[cleanSlug] || 0) + 1;
      await store.set(STORE_KEY, JSON.stringify(views));

      return jsonResponse({ slug: cleanSlug, views: views[cleanSlug] });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error) {
    return jsonResponse({ error: "Blog views unavailable" }, 500);
  }
}

async function readViews(store) {
  const raw = await store.get(STORE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

async function readPayload(request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return await request.json();
  }

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    return Object.fromEntries(formData.entries());
  }

  const text = await request.text();
  return text ? { slug: text } : {};
}

function sanitizeSlug(value) {
  const slug = String(value || "").trim();
  return /^[a-z0-9-]+$/i.test(slug) ? slug : "";
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept"
    }
  });
}
