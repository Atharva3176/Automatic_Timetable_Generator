import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import timetableRoutes from "./routes/timetable";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000"
  })
);
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "automatic-timetable-backend" });
});

app.use("/api", timetableRoutes);

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;

async function start() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI is not set in environment variables.");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`Backend server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();

