/**
 * scripts/generate-yml.js
 *
 * 为 electron-updater 生成 latest.yml / latest-mac.yml / latest-linux-xxx.yml
 * 适配 Electron Forge 打包结果。
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const pkg = require("../package.json");

const VERSION = pkg.version;
const OUT_DIR = path.resolve(__dirname, "..", "out", "make");

/**
 * 计算文件 SHA512
 */
function sha512(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash("sha512").update(buffer).digest("base64");
}

/**
 * 生成 yml 文件
 */
function generateYml({ filePath, fileName, output }) {
  const stats = fs.statSync(filePath);
  const content = [
    `version: ${VERSION}`,
    "files:",
    `  - url: ${fileName}`,
    `    sha512: ${sha512(filePath)}`,
    `    size: ${stats.size}`,
    `path: ${fileName}`,
    `sha512: ${sha512(filePath)}`,
    `releaseDate: '${new Date().toISOString()}'`,
    ""
  ].join("\n");

  fs.writeFileSync(output, content);
  console.log(`✅ Generated ${output}`);
}

/**
 * Windows (Squirrel.Windows)
 */
function handleWindows() {
  const dir = path.join(OUT_DIR, "squirrel.windows", "x64");
  if (!fs.existsSync(dir)) return;

  const exe = fs.readdirSync(dir).find(f => f.endsWith(".exe"));
  if (exe) {
    generateYml({
      filePath: path.join(dir, exe),
      fileName: exe,
      output: path.join(OUT_DIR, "latest.yml")
    });
  }
}

/**
 * macOS (zip / dmg)
 */
function handleMac() {
  // 先找 zip
  const zipDir = path.join(OUT_DIR, "zip", "darwin", "arm64");
  if (fs.existsSync(zipDir)) {
    const zip = fs.readdirSync(zipDir).find(f => f.endsWith(".zip"));
    if (zip) {
      generateYml({
        filePath: path.join(zipDir, zip),
        fileName: zip,
        output: path.join(OUT_DIR, "latest-mac.yml")
      });
      return;
    }
  }

  // 再找 dmg
  const dmgDir = path.join(OUT_DIR, "dmg");
  if (fs.existsSync(dmgDir)) {
    const dmg = fs.readdirSync(dmgDir).find(f => f.endsWith(".dmg"));
    if (dmg) {
      generateYml({
        filePath: path.join(dmgDir, dmg),
        fileName: dmg,
        output: path.join(OUT_DIR, "latest-mac.yml")
      });
    }
  }
}

/**
 * Linux (AppImage / deb / rpm)
 */
function handleLinux() {
  const formats = ["AppImage", "deb", "rpm"];

  for (const format of formats) {
    const dir = path.join(OUT_DIR, format.toLowerCase(), "x64");
    if (!fs.existsSync(dir)) continue;

    const file = fs.readdirSync(dir).find(f => f.endsWith(format));
    if (file) {
      generateYml({
        filePath: path.join(dir, file),
        fileName: file,
        output: path.join(OUT_DIR, `latest-linux-${format.toLowerCase()}.yml`)
      });
    }
  }
}

// ---------------------------
// 主执行逻辑
// ---------------------------
handleWindows();
handleMac();
handleLinux();
