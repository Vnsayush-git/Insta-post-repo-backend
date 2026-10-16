import { Router } from "express";
import {
  handleGNewsRequest,
  handleNewsDataRequest,
} from "../controllers/news.controller.js";

const router = Router();

// GNews Endpoints
router.get("/gnews", handleGNewsRequest);
router.get("/gnews/top-headlines", handleGNewsRequest);
router.get("/gnews/search", handleGNewsRequest);

// NewsData Endpoints
router.get("/newsdata", handleNewsDataRequest);
router.get("/newsdata/latest", handleNewsDataRequest);

export default router;
