require("dotenv").config();

const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs/promises");
const multer = require("multer"); 


const app = express();
const upload = multer();
const blogViewsPath = path.join(__dirname, "blog", "views.json");

app.use(express.json());
app.use(bodyParser.urlencoded({extended:true}))
app.use(upload.none());

// Serve the index.html file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Serve static files from the "static" folder
app.use("/static", express.static("static"));
app.use("/blog", express.static("blog"));

app.get("/api/blog/views", async (req, res) => {
  const views = await readBlogViews();
  res.json(views);
});

app.post("/api/blog/views/:slug", async (req, res) => {
  const slug = sanitizeSlug(req.params.slug);
  if (!slug) {
    return res.status(400).json({ error: "Invalid slug" });
  }

  const views = await readBlogViews();
  views[slug] = Number(views[slug] || 0) + 1;
  await writeBlogViews(views);

  res.json({ slug, views: views[slug] });
});


const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port:587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

app.post("/submit", async(req, res) => {
    // console.log(req.body);
    const {name, email,subject,message} = req.body;

    try {
        const info = await transporter.sendMail({
            from: `"Fred Munene Gitonga" <mfredgitonga@gmail.com>`,
            to: `"Fred" <munenegitonga99@gmail.com>`,
            subject: subject,
            text: message,
            html: `<b>${message}</b>`,
            replyTo: `"${name}" ${email}`,
        })
        console.log("Message sent: %s", info.messageId);
        res.status(200).send("Email sent successfully!");
    } catch(error) {
        console.error("Error sending email: ", error);
        res.status(500).send("Failed to send email");
    }
});

async function readBlogViews() {
  try {
    const raw = await fs.readFile(blogViewsPath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

async function writeBlogViews(views) {
  await fs.writeFile(blogViewsPath, `${JSON.stringify(views, null, 2)}\n`);
}

function sanitizeSlug(value) {
  const slug = String(value || "").trim();
  return /^[a-z0-9-]+$/i.test(slug) ? slug : "";
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server learning on http:\\localhost:${PORT}`)
})

// app.listen(300, '0.0.0.0');
