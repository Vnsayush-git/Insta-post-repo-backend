import "./config/env.js";
import express from "express";
import cors from "cors";

import newsRoutes from "./routes/news.routes.js";
import instagramRoutes from "./routes/instagram.routes.js";
import mediaRoutes from "./routes/media.routes.js";

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());

// Health check / root route
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Server is running",
  });
});

// Routes
app.use("/api/news", newsRoutes);
app.use("/api/instagram", instagramRoutes);
app.use("/api/medias", mediaRoutes);

const PORT = process.env.PORT || 4000;

// Only start the HTTP listener when running directly (local development)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

export default app;


