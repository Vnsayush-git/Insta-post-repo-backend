import { Router } from "express";
import { handleInstagramScraperRequest } from "../controllers/instagram.controller.js";

const router = Router();

// Instagram scraper endpoints
router.get("/posts", handleInstagramScraperRequest);
router.post("/posts", handleInstagramScraperRequest);


export default router;
