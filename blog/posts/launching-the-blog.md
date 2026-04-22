---
layout: blog-post
title: Launching the Blog
description: How I am adding a Markdown-powered blog to this portfolio.
date: 2026-04-22
cover: /static/blog1.png
readingTime: 1
permalink: /blog/launching-the-blog/
tags:
  - portfolio
  - markdown
  - engineering
---

This portfolio now has a proper blog route, which means I can write posts in Markdown and have them rendered with consistent typography.

## Why this approach

I wanted something simple to maintain:

- Markdown files are easy to write and edit.
- Each post gets a clean URL.
- The homepage can show a short preview without duplicating content.

## What the blog supports

You can use:

1. Headings
2. Lists
3. Blockquotes
4. Inline code like `npm run start`
5. Code blocks
6. Links

> Keep the content simple and focused. The layout will do the rest.

```js
const post = "hello markdown";
console.log(post);
```

## Images

Markdown images now render as responsive figures.

![Blog preview image](/static/blog2.png)

If you want format variants, use the include with explicit sources:

```liquid
{% include responsive-image.html src="/static/blog2.png" webp="/static/blog2.webp" avif="/static/blog2.avif" alt="Blog preview image" caption="Optional caption" %}
```

If the extra files exist, the browser will use the best format and keep the PNG/JPG as fallback.

That is enough for technical notes, project updates, and short essays.
