const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

async function main() {
  const root = process.cwd();
  const svgPath = path.join(root, "icon.svg");
  const res = path.join(root, "android", "app", "src", "main", "res");
  if (!fs.existsSync(svgPath) || !fs.existsSync(res)) {
    throw new Error("Ícone SVG ou pasta de recursos Android não encontrada.");
  }
  const svg = fs.readFileSync(svgPath);
  const densities = [
    ["mdpi", 48, 108],
    ["hdpi", 72, 162],
    ["xhdpi", 96, 216],
    ["xxhdpi", 144, 324],
    ["xxxhdpi", 192, 432]
  ];
  for (const [density, launcherSize, foregroundSize] of densities) {
    const dir = path.join(res, "mipmap-" + density);
    fs.mkdirSync(dir, { recursive: true });
    for (const name of ["ic_launcher.png", "ic_launcher_round.png"]) {
      await sharp(svg).resize(launcherSize, launcherSize).png().toFile(path.join(dir, name));
    }
    await sharp(svg).resize(foregroundSize, foregroundSize).png()
      .toFile(path.join(dir, "ic_launcher_foreground.png"));
  }
  console.log("Android launcher icons generated from icon.svg.");
}
main().catch((error) => {
  console.error("Failed to generate Android launcher icons:", error.message);
  process.exit(1);
});
