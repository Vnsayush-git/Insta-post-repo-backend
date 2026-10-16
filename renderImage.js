import sharp from "sharp";
import fs from "fs";

export async function renderImage(design = {}) {
  const {
    width = 3840,
    height = 3840,
    background = "#ffffff",
    elements = [],
  } = design;

  const canvas = sharp({
    create: {
      width,
      height,
      channels: 4,
      background,
    },
  });

  const layers = [];
  for (const el of elements) {
    if (el.type === "image") {
      const buffer = Buffer.isBuffer(el.src)
        ? el.src
        : Buffer.isBuffer(el.buffer)
        ? el.buffer
        : fs.readFileSync(el.src);

      const resized = await sharp(buffer)
        .resize(el.width, el.height)
        .toBuffer();

      layers.push({ input: resized, left: el.x, top: el.y });
    }

    if (el.type === "text") {
      const svg = `
        <svg width="${width}" height="${height}">
          <text x="${el.x}" y="${el.y}"
            font-size="${el.fontSize}"
            fill="${el.color}"
            font-weight="${el.fontWeight || "normal"}"
            font-family="Arial">
            ${el.text}
          </text>
        </svg>
      `;
      layers.push({ input: Buffer.from(svg), left: 0, top: 0 });
    }
  }

  return await canvas.composite(layers).png({ quality: 100 }).toBuffer();
}
