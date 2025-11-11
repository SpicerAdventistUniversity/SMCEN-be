
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import fs from "fs";
import https from "https";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import certificateRoutes from "./routes/certificateRoutes.js";

dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: 'https://smcen.netlify.app',
  credentials: true
}));

app.get('/', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

// Routes
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", certificateRoutes);
app.use("/api/sem2", userRoutes);

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

app.listen(3000, () => {
  console.log("🚀 Server running at http://localhost:3000");
});