import dotenv from "dotenv";
dotenv.config();
import connectDB from "./db/index.js";
import { app } from "./app.js";
import express from "express";



connectDB()
  .then(() => {
    const PORT = 5000|| 8001; // Correct port assignment
    app.listen(PORT, () => {
      console.log(`Server is running at port: ${PORT}`); // Fixed typo
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
  });

