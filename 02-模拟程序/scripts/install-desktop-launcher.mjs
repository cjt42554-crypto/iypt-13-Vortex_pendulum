import { existsSync } from "node:fs";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const managedMarker = "X-IYPT-Managed=true";
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmPath = "/usr/bin/npm";
const chromePath = "/usr/bin/google-chrome";
const applicationDirectory = path.join(homedir(), ".local", "share", "applications");
const target = path.join(applicationDirectory, "iypt-vortex-pendulum-lab.desktop");

function quoteExecArgument(value) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

if (!existsSync(npmPath)) {
  throw new Error(`没有找到 ${npmPath}，无法生成稳定的桌面启动命令。`);
}
if (!existsSync(chromePath)) {
  throw new Error(`没有找到 ${chromePath}。仍可在终端用 VORTEX_PENDULUM_BROWSER 指定其他 Chromium。`);
}

if (existsSync(target)) {
  const existing = await readFile(target, "utf8");
  if (!existing.includes(managedMarker)) {
    throw new Error(`拒绝覆盖非本项目管理的桌面入口：${target}`);
  }
}

const desktopEntry = [
  "[Desktop Entry]",
  "Version=1.0",
  "Type=Application",
  "Name=涡流摆研究平台",
  "Comment=IYPT 2027 第 13 题本地计算与可视化",
  `Exec=${quoteExecArgument(npmPath)} --prefix ${quoteExecArgument(projectRoot)} run desktop`,
  `Path=${projectRoot}`,
  `Icon=${path.join(projectRoot, "public", "favicon.svg")}`,
  `TryExec=${chromePath}`,
  "Terminal=false",
  "Categories=Education;",
  "Keywords=IYPT;Vortex;Pendulum;CFD;涡流摆;",
  "StartupNotify=true",
  "StartupWMClass=iypt-vortex-pendulum-lab",
  managedMarker,
  "",
].join("\n");

await mkdir(applicationDirectory, { recursive: true });
await writeFile(target, desktopEntry, { encoding: "utf8", mode: 0o644 });
await chmod(target, 0o644);

console.log(`已安装桌面应用入口：${target}`);
console.log("应用菜单中搜索“涡流摆研究平台”即可启动。");
