import { ApifyClient } from "apify-client";

/**
 * Controller to fetch/scrape Instagram posts using Apify Actor (apify/instagram-post-scraper)
 * Accepts GET and POST requests
 * Supports query params or JSON body: username/usernames, resultsLimit/limit, dataDetailLevel, etc.
 */
export async function handleInstagramScraperRequest(req, res) {
  try {
    const tokenToUse =
      req.headers["x-apify-token"] ||
      req.query.token ||
      req.body?.token ||
      process.env.APIFY_API_TOKEN ||
      process.env.APIFY_TOKEN ||
      process.env.APIFY;

    if (!tokenToUse) {
      return res.status(400).json({
        success: false,
        error:
          "Apify API token is missing. Please configure APIFY or APIFY_API_TOKEN in your .env file or pass token in request.",
      });
    }

    // Determine input username / profile / post URLs
    let usernamesInput =
      req.body?.username ||
      req.body?.usernames ||
      req.query.username ||
      req.query.usernames ||
      req.body?.urls ||
      req.query.urls;

    let parsedUsernames = [];
    if (Array.isArray(usernamesInput)) {
      parsedUsernames = usernamesInput
        .map((u) => String(u).trim())
        .filter(Boolean);
    } else if (typeof usernamesInput === "string" && usernamesInput.trim()) {
      // Allow comma-separated values or single username/url
      parsedUsernames = usernamesInput
        .split(",")
        .map((u) => u.trim())
        .filter(Boolean);
    }

    // Fallback default sample username if none specified
    if (parsedUsernames.length === 0) {
      parsedUsernames = [
        "thebharatpost_",
        "https://www.instagram.com/thebharatpost_",
        "https://www.instagram.com/p/CMq9_X0HL1x/",
      ];
    }

    const resultsLimit = parseInt(
      req.body?.resultsLimit ||
      req.query.resultsLimit ||
      req.body?.limit ||
      req.query.limit ||
      20,
      10
    );

    const dataDetailLevel =
      req.body?.dataDetailLevel ||
      req.query.dataDetailLevel ||
      "basicData";

    // Prepare Actor input
    const input = {
      username: parsedUsernames,
      resultsLimit: isNaN(resultsLimit) ? 20 : resultsLimit,
      dataDetailLevel: dataDetailLevel,
      ...(req.body?.customInput && typeof req.body.customInput === "object"
        ? req.body.customInput
        : {}),
    };

    console.log(
      "[Server] Calling Apify instagram-post-scraper with input:",
      JSON.stringify(input, null, 2)
    );

    // Initialize the ApifyClient with token
    const client = new ApifyClient({
      token: tokenToUse,
    });

    // Run the Actor and wait for it to finish
    const run = await client.actor("apify/instagram-post-scraper").call(input);

    console.log("Results from dataset");
    console.log(
      `💾 Check your data here: https://console.apify.com/storage/datasets/${run.defaultDatasetId}`
    );

    // Fetch Actor results from the run's dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    console.log(`[Server] Retrieved ${items.length} items from dataset`);

    res.json({
      success: true,
      runId: run.id,
      datasetId: run.defaultDatasetId,
      datasetUrl: `https://console.apify.com/storage/datasets/${run.defaultDatasetId}`,
      total: items.length,
      items: items,
    });
  } catch (err) {
    console.error("[Server] Apify Instagram Scraper error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to scrape Instagram posts via Apify",
      details: err.message,
    });
  }
}
