import fetch from "node-fetch";

/**
 * Controller to fetch news from GNews API
 * Supports both top-headlines and search queries
 * Automatically injects the API key from .env and forwards all query parameters
 */
export async function handleGNewsRequest(req, res) {
  try {
    const apiKeyToUse =
      process.env.GNEWS_API_KEY || req.query.apikey;

    if (!apiKeyToUse) {
      return res.status(400).json({
        errors: [
          "GNews API key is missing. Please configure GNEWS_API_KEY in your .env file.",
        ],
      });
    }

    const pathUrl = (req.baseUrl || "") + (req.path || "");
    const isSearchRoute = pathUrl.endsWith("/search");
    const isTopHeadlinesRoute = pathUrl.endsWith("/top-headlines");

    // Check if query contains search keyword
    const hasSearchQuery = Boolean(req.query.q && String(req.query.q).trim());
    const isSearch = isSearchRoute || (!isTopHeadlinesRoute && hasSearchQuery);

    const targetUrl = new URL(
      isSearch
        ? "https://gnews.io/api/v4/search"
        : "https://gnews.io/api/v4/top-headlines"
    );

    // Forward all incoming query parameters from client (except apikey)
    for (const [key, value] of Object.entries(req.query)) {
      if (
        key !== "apikey" &&
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        // Filter out "all" category as GNews expects specific category or none
        if (key === "category" && value === "all") {
          continue;
        }
        targetUrl.searchParams.set(key, String(value).trim());
      }
    }

    // Set sensible defaults if not provided in query params
    if (isSearch) {
      if (!targetUrl.searchParams.has("q") || !targetUrl.searchParams.get("q")) {
        targetUrl.searchParams.set("q", "general");
      }
    } else {
      if (!targetUrl.searchParams.has("category")) {
        targetUrl.searchParams.set("category", "world");
      }
    }

    if (!targetUrl.searchParams.has("lang")) {
      targetUrl.searchParams.set("lang", "en");
    }
    if (!targetUrl.searchParams.has("country")) {
      targetUrl.searchParams.set("country", "in");
    }
    if (!targetUrl.searchParams.has("max")) {
      targetUrl.searchParams.set("max", "30");
    }

    // Securely inject API key from .env
    targetUrl.searchParams.set("apikey", apiKeyToUse);

    console.log(
      `[Server] Proxying GNews (${isSearch ? "Search" : "Headlines"}): URL=${targetUrl.pathname}, q=${targetUrl.searchParams.get("q") || "none"}, category=${targetUrl.searchParams.get("category") || "none"}, lang=${targetUrl.searchParams.get("lang")}, country=${targetUrl.searchParams.get("country")}, max=${targetUrl.searchParams.get("max")}`
    );

    const apiRes = await fetch(targetUrl.toString());
    const data = await apiRes.json();

    res.status(apiRes.status).json(data);
  } catch (err) {
    console.error("[Server] GNews proxy error:", err);
    res.status(500).json({
      error: "Failed to fetch news from GNews service",
      details: err.message,
    });
  }
}

/**
 * Controller to fetch news from NewsData.io API
 * Automatically injects the API key from .env and forwards all query parameters
 */
export async function handleNewsDataRequest(req, res) {
  try {
    const apiKeyToUse =
      process.env.NEWSDATA_API_KEY || req.query.apikey;

    if (!apiKeyToUse) {
      return res.status(400).json({
        status: "error",
        results: {
          message:
            "NewsData API key is missing. Please configure NEWSDATA_API_KEY in your .env file.",
        },
      });
    }

    const targetUrl = new URL("https://newsdata.io/api/1/latest");
    targetUrl.searchParams.set("apikey", apiKeyToUse);

    // Forward all incoming query parameters from client (except apikey)
    for (const [key, value] of Object.entries(req.query)) {
      if (
        key !== "apikey" &&
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        if (key === "category" && value === "all") {
          continue;
        }
        targetUrl.searchParams.set(key, String(value).trim());
      }
    }

    // Default fallbacks if none provided
    if (!targetUrl.searchParams.has("q") && !targetUrl.searchParams.has("category")) {
      targetUrl.searchParams.set("q", "indian");
    }
    if (!targetUrl.searchParams.has("country")) {
      targetUrl.searchParams.set("country", "in");
    }
    if (!targetUrl.searchParams.has("language")) {
      targetUrl.searchParams.set("language", "en");
    }

    const apiRes = await fetch(targetUrl.toString());
    const data = await apiRes.json();

    res.status(apiRes.status).json(data);
  } catch (err) {
    console.error("[Server] NewsData proxy error:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch news from NewsData service",
      details: err.message,
    });
  }
}
