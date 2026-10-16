import { Router } from "express";
import { upload } from "../middlewares/upload.middleware.js";
import {
  proxyImage,
  exportDesign,
  extractText,
  searchImagesController,
} from "../controllers/media.controller.js";

const router = Router();

router.get("/image-proxy", proxyImage);
router.post("/export", upload.single("image"), exportDesign);
router.post("/textExtract", upload.single("image"), extractText);

// DuckDuckGo image search endpoints
router.get("/search-images", searchImagesController);

export default router;

