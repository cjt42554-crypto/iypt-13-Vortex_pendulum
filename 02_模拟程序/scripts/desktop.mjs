import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(projectRoot, "dist");
const indexPath = path.join(distRoot, "index.html");

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".csv", "text/csv; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".wasm", "application/wasm"],
  [".webp", "image/webp"],
]);

function parseArguments(argv) {
  const browserArgument = argv.find((argument) => argument.startsWith("--browser="));
  return {
    check: argv.includes("--check"),
    browser: browserArgument?.slice("--browser=".length),
  };
}

function requireBuiltApplication() {
  if (!existsSync(indexPath)) {
    throw new Error(
      `没有找到 ${indexPath}。请先运行 npm run build，或直接运行 npm run desktop。`,
    );
  }
}

function isInsideDist(candidate) {
  return candidate === distRoot || candidate.startsWith(`${distRoot}${path.sep}`);
}

async function resolveStaticPath(urlPathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPathname);
  } catch {
    return { error: 400 };
  }

  const relative = decoded.replace(/^\/+/, "") || "index.html";
  let candidate = path.resolve(distRoot, relative);
  if (!isInsideDist(candidate)) {
    return { error: 403 };
  }

  try {
    const info = await stat(candidate);
    if (info.isDirectory()) {
      candidate = path.join(candidate, "index.html");
    }
    const fileInfo = await stat(candidate);
    if (!fileInfo.isFile()) {
      return { error: 404 };
    }
    return { file: candidate, size: fileInfo.size };
  } catch {
    return { error: 404 };
  }
}

async function handleRequest(request, response) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method Not Allowed");
    return;
  }

  const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
  const resolved = await resolveStaticPath(requestUrl.pathname);
  if (!resolved.file) {
    const status = resolved.error ?? 404;
    response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(status === 403 ? "Forbidden" : status === 400 ? "Bad Request" : "Not Found");
    return;
  }

  const body = await readFile(resolved.file);
  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Length": resolved.size,
    "Content-Type": mimeTypes.get(path.extname(resolved.file).toLowerCase()) ?? "application/octet-stream",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(request.method === "HEAD" ? undefined : body);
}

async function startLocalServer() {
  const server = createServer((request, response) => {
    void handleRequest(request, response).catch((error) => {
      console.error("本地桌面服务请求失败：", error);
      if (!response.headersSent) {
        response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      }
      response.end("Internal Server Error");
    });
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0, exclusive: true }, resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("无法取得本地桌面服务端口。");
  }

  return { server, origin: `http://127.0.0.1:${address.port}` };
}

async function closeServer(server) {
  await new Promise((resolve) => server.close(resolve));
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function fileUrl(origin, filePath) {
  const relative = path.relative(distRoot, filePath);
  const encoded = relative.split(path.sep).map(encodeURIComponent).join("/");
  return `${origin}/${encoded}`;
}

async function checkBuiltApplication(origin) {
  const files = await listFiles(distRoot);
  if (files.length === 0) {
    throw new Error("dist 目录为空。请重新运行 npm run build。");
  }

  let totalBytes = 0;
  for (const file of files) {
    const expected = await stat(file);
    const response = await fetch(fileUrl(origin, file));
    if (!response.ok) {
      throw new Error(`桌面服务无法读取 ${path.relative(distRoot, file)}：HTTP ${response.status}`);
    }
    const body = await response.arrayBuffer();
    if (body.byteLength !== expected.size) {
      throw new Error(
        `${path.relative(distRoot, file)} 字节数不一致：${body.byteLength} != ${expected.size}`,
      );
    }
    totalBytes += body.byteLength;
  }

  const indexResponse = await fetch(`${origin}/`);
  const index = await indexResponse.text();
  const hasExpectedTitle = index.includes("<title>涡激摆研究平台</title>");
  const hasApplicationRoot = index.includes('<div id="app"></div>');
  if (!indexResponse.ok || !hasExpectedTitle || !hasApplicationRoot) {
    throw new Error("桌面入口没有返回预期的涡激摆应用主页面。");
  }

  return { files: files.length, totalBytes };
}

function chooseBrowser(explicitBrowser) {
  const configured = explicitBrowser ?? process.env.VORTEX_PENDULUM_BROWSER;
  const candidates = [
    configured,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (!path.isAbsolute(candidate) || existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "没有找到 Google Chrome 或 Chromium。可用 VORTEX_PENDULUM_BROWSER 指定 Chromium 系浏览器路径。",
  );
}

async function runDesktop(origin, explicitBrowser) {
  const browser = chooseBrowser(explicitBrowser);
  const profilePrefix = path.join(tmpdir(), "iypt-vortex-pendulum-desktop-");
  const profileDirectory = await mkdtemp(profilePrefix);
  const child = spawn(browser, [
    `--app=${origin}/`,
    `--user-data-dir=${profileDirectory}`,
    "--class=iypt-vortex-pendulum-lab",
    "--window-size=1440,960",
    "--no-first-run",
    "--disable-background-mode",
    "--disable-default-apps",
  ], {
    cwd: projectRoot,
    stdio: "ignore",
  });

  const terminateChild = () => {
    if (child.exitCode === null && !child.killed) {
      child.kill("SIGTERM");
    }
  };
  process.once("SIGINT", terminateChild);
  process.once("SIGTERM", terminateChild);

  try {
    await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => {
        if (code && code !== 0) {
          reject(new Error(`桌面窗口异常退出：code=${code}, signal=${signal ?? "none"}`));
        } else {
          resolve();
        }
      });
    });
  } finally {
    process.off("SIGINT", terminateChild);
    process.off("SIGTERM", terminateChild);
    if (profileDirectory.startsWith(profilePrefix)) {
      await rm(profileDirectory, { force: true, recursive: true, maxRetries: 2 });
    }
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  requireBuiltApplication();
  const { server, origin } = await startLocalServer();

  try {
    if (options.check) {
      const result = await checkBuiltApplication(origin);
      console.log(JSON.stringify({
        status: "PASS",
        bind: "127.0.0.1",
        files: result.files,
        totalBytes: result.totalBytes,
      }, null, 2));
      return;
    }

    console.log(`涡流摆研究平台已在独立桌面窗口启动（本地服务 ${origin}）。`);
    console.log("关闭应用窗口后，本地服务会自动停止。");
    await runDesktop(origin, options.browser);
  } finally {
    await closeServer(server);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
