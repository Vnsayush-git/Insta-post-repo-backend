import fetch from "node-fetch";
import fs from "fs";
import Tesseract from "tesseract.js";
import { searchImages } from "duck-duck-scrape";
import { renderImage } from "../renderImage.js";

const { createWorker } = Tesseract;

/**
 * Image proxy controller
 * Proxies external images and attaches CORS headers for canvas/html-to-image capture
 */
export async function proxyImage(req, res) {
  try {
    const imageUrl = req.query.url;
    if (!imageUrl) {
      return res.status(400).send("Missing image url");
    }

    const response = await fetch(imageUrl);

    if (!response.ok) {
      return res.status(500).send("Failed to fetch image");
    }

    res.setHeader(
      "Content-Type",
      response.headers.get("content-type") || "image/jpeg"
    );

    // KEY LINE (same-origin for html-to-image)
    res.setHeader("Access-Control-Allow-Origin", "*");

    response.body.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send("Image proxy error");
  }
}

/**
 * Sharp Image Export controller
 * Generates high-resolution 4K design image using Sharp
 */
export async function exportDesign(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Image required" });
    }

    const imageSource = req.file.buffer || req.file.path;

    // Build design object manually
    const design = {
      width: 3840,
      height: 3840,
      background: "#ffffff",
      elements: [
        {
          type: "image",
          src: imageSource,
          x: 0,
          y: 0,
          width: 3840,
          height: 2200,
        },
        {
          type: "text",
          text: req.body.title || "",
          x: 200,
          y: 2400,
          fontSize: 160,
          color: "#000000",
          fontWeight: "bold",
        },
        {
          type: "text",
          text: req.body.description || "",
          x: 200,
          y: 2650,
          fontSize: 96,
          color: "#333333",
        },
      ],
    };

    const buffer = await renderImage(design);

    if (req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
    }

    res.setHeader("Content-Type", "image/png");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=design-4k.png"
    );

    res.send(buffer);
  } catch (err) {
    console.error(err);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) { }
    }
    res.status(500).json({ error: err.message });
  }
}

/**
 * OCR Text Extraction controller using Tesseract.js
 */
export async function extractText(req, res) {
  let worker;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "Image file required for OCR" });
    }

    worker = await createWorker("eng");

    const imageInput = req.file.buffer || req.file.path;
    const {
      data: { text },
    } = await worker.recognize(imageInput);

    await worker.terminate();

    if (req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
    }

    res.json({ success: true, text: text.trim() });
  } catch (err) {
    if (worker) {
      try {
        await worker.terminate();
      } catch (_) { }
    }
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) { }
    }
    res.status(500).json({ error: err.message });
  }
}

/**
 * Fallback image searcher using direct HTML parsing when DuckDuckGo API is rate-limited
 */
async function fetchFallbackImages(query) {
  const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  const html = await res.text();
  const regex = /m="({.*?})"/g;
  const results = [];
  let match;

  while ((match = regex.exec(html)) !== null) {
    try {
      const decoded = match[1].replace(/&quot;/g, '"');
      const data = JSON.parse(decoded);
      if (data.murl) {
        results.push({
          title: data.t || data.desc || "",
          image: data.murl,
          thumbnail: data.turl || data.murl,
          url: data.purl || data.murl,
          height: data.h || 0,
          width: data.w || 0,
          source: data.purl ? new URL(data.purl).hostname : "Web",
        });
      }
    } catch (_) { }
  }

  return results;
}

/**
 * Image Search controller using duck-duck-scrape (with automatic fallback)
 * Searches images based on a query parameter or body payload
 */
export async function searchImagesController(req, res) {
  try {
    const query =
      req.query.q || req.query.query || req.body?.q || req.body?.query;

    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({
        success: false,
        error: "Query parameter 'q' or 'query' is required",
      });
    }

    const trimmedQuery = query.trim();

    const {
      safeSearch,
      locale,
      offset,
      size,
      type,
      layout,
      color,
      license,
    } = { ...req.query, ...req.body };

    const searchOptions = {};
    if (safeSearch !== undefined) searchOptions.safeSearch = Number(safeSearch);
    if (locale) searchOptions.locale = locale;
    if (offset !== undefined) searchOptions.offset = Number(offset);
    if (size) searchOptions.size = size;
    if (type) searchOptions.type = type;
    if (layout) searchOptions.layout = layout;
    if (color) searchOptions.color = color;
    if (license) searchOptions.license = license;

    let searchResults;

    try {
      // Primary: duck-duck-scrape
      const results = await searchImages(
        trimmedQuery,
        Object.keys(searchOptions).length > 0 ? searchOptions : undefined
      );

      console.log(`Image search results for "${trimmedQuery}":`, results.results?.length || 0);

      searchResults = {
        success: true,
        query: trimmedQuery,
        noResults: results.noResults || false,
        vqd: results.vqd,
        results: results.results || [],
      };
    } catch (ddgErr) {
      console.warn("duck-duck-scrape warning:", ddgErr.message, "- Switching to fallback search engine");

      const fallbackList = await fetchFallbackImages(trimmedQuery);
      searchResults = {
        success: true,
        query: trimmedQuery,
        noResults: fallbackList.length === 0,
        results: fallbackList,
      };
    }

    return res.json(searchResults);
  } catch (err) {
    console.error("Image search error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to search images",
    });
  }
}


