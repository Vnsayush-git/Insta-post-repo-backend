import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../.env");

export function loadEnv() {
  if (fs.existsSync(envPath)) {
    try {
      const envContent = fs.readFileSync(envPath, "utf8");
      for (const line of envContent.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const value = trimmed
              .slice(eqIdx + 1)
              .trim()
              .replace(/^["']|["']$/g, "");
            process.env[key] = value;
          }
        }
      }
    } catch (e) {
      console.warn("Could not parse .env file:", e.message);
    }
  }
}

// Auto-execute when imported
loadEnv();
