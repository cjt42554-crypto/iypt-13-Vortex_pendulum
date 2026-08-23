import { existsSync } from "node:fs";
import { readFile, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const managedMarker = "X-IYPT-Managed=true";
const target = path.join(
  homedir(),
  ".local",
  "share",
  "applications",
  "iypt-vortex-pendulum-lab.desktop",
);

if (!existsSync(target)) {
  console.log(`桌面入口不存在，无需卸载：${target}`);
  process.exit(0);
}

const existing = await readFile(target, "utf8");
if (!existing.includes(managedMarker)) {
  throw new Error(`拒绝删除非本项目管理的桌面入口：${target}`);
}

await unlink(target);
console.log(`已卸载桌面应用入口：${target}`);
