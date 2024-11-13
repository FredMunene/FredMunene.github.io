require("dotenv").config();

const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const path = require("path");


const app = express();

app.use(express.json());
app.use(bodyParser.urlencoded({extended:true}))

// Serve the index.html file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Serve static files from the "static" folder
app.use("/static", express.static("static"));


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
    console.log(req.body);
    const {name, email,subject,message} = req.body;

    try {
        const info = await transporter.sendMail({
            from: `"Fred Munene Gitonga" <mfredgitonga@gmail.com>`,
            to: `${name} <mikeburns9990@gmail.com`,
            subject: subject,
            text: message,
            html: `<b>${message}</b>`,
            replyTo: email,
        })
        console.log("Message sent: %s", info.messageId);
        res.status(200).send("Email sent successfully!");
    } catch(error) {
        console.error("Error sending email: ", error);
        res.status(500).send("Failed to send email");
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server learning on http:\\localhost:${PORT}`)
})