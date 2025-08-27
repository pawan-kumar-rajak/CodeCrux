import dotenv from "dotenv";
dotenv.config();
import connectDB from "./db/index.js";
import { app } from "./app.js";
import express from "express";
import path from "path";


import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware to serve static files (point to the public folder outside src)
app.use(express.static(path.join(__dirname, "..", "public"))); // ".." moves one level up

// Middleware to parse JSON bodies
app.use(express.json());
// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Middleware to serve HTML files
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "HTML", "index.html"));
});


// Middleware to serve HTML files
app.get("/resident/login", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "HTML", "login.html"));
});
// Middleware to serve HTML files
app.get("/resident/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "HTML", "resident.dashboard.html"));
});
// Middleware to serve HTML files
app.get("/resident/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "resident.dashboard.html"));
});
// Middleware to serve HTML files
app.get("/resident/report", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "resident.report.html"));
});
// Middleware to serve HTML files
app.get("/resident/faq", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "resident.faq.html"));
});
// Middleware to serve HTML files
app.get("/resident/faq", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "resident.faq.html"));
});
// Middleware to serve HTML files
app.get("/admin/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "HTML" ,"admin.dashboard.html"));
});

app.get("/vendor/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "HTML", "vendor.dashboard.html"));
});

app.get("/collector/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "HTML", "collector.dashboard.html"));
});
// Middleware to serve HTML files



connectDB()
  .then(() => {
    const PORT = 5000|| 8001; // Correct port assignment
    app.listen(PORT, () => {
      console.log(`Server is running at port: ${PORT}`); 
      console.log(`Server is running at address: http://127.0.0.1:${PORT}`); 
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
  });

