import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { chromium } from "@playwright/test";

const server = spawn("npm", ["run", "preview", "--", "--port", "4174"], {
  cwd: process.cwd(),
  stdio: ["ignore", "pipe", "pipe"],
  // A process group lets the test reliably terminate npm and its Vite child.
  detached: process.platform !== "win32",
});
let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += String(chunk); });
server.stderr.on("data", (chunk) => { serverOutput += String(chunk); });

async function waitForServer() {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch("http://127.0.0.1:4174/");
      if (response.ok) return;
    } catch {
      // Preview is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`preview server did not start\n${serverOutput}`);
}

let browser;
try {
  await waitForServer();
  const systemChrome = [
    process.env.CHROME_EXECUTABLE,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
  ].find((candidate) => candidate && existsSync(candidate));
  browser = await chromium.launch({
    headless: true,
    ...(systemChrome ? { executablePath: systemChrome } : {}),
  });
  const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto("http://127.0.0.1:4174/", { waitUntil: "domcontentloaded" });
  await page.getByText("VP-FWD-P0-SL1-v1", { exact: true }).waitFor();
  const flowSpeedInput = page.locator('[data-parameter-path="fluid.flowSpeed"]');
  await flowSpeedInput.waitFor();
  await flowSpeedInput.fill("");
  await page.getByRole("button", { name: "运行", exact: true }).click();
  await page.locator("#config-state").filter({ hasText: "输入无效" }).waitFor();
  if (await page.locator("#run-state").innerText() !== "ready") {
    throw new Error("invalid visual parameter did not block the run");
  }
  await flowSpeedInput.fill("0.018");
  await page.locator("#config-state").filter({ hasText: "可运行" }).waitFor();
  const visuallyEditedConfig = await page.locator("#config-editor").evaluate((element) => JSON.parse(element.value));
  if (visuallyEditedConfig.fluid.flowSpeed !== 0.018) {
    throw new Error("visual parameter input did not update the reproducible JSON config");
  }
  await page.locator("#config-editor").evaluate((element) => {
    const config = JSON.parse(element.value);
    config.body.movingMass = 0.036;
    element.value = JSON.stringify(config, null, 2);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
  if (await page.locator('[data-parameter-path="body.movingMass"]').inputValue() !== "0.036") {
    throw new Error("advanced JSON edit did not update the visual parameter input");
  }
  const configDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出配置", exact: true }).click();
  const configDownload = await configDownloadPromise;
  if (configDownload.suggestedFilename() !== "vortex-pendulum-config.json") {
    throw new Error(`unexpected configuration filename: ${configDownload.suggestedFilename()}`);
  }
  await page.getByRole("button", { name: "运行", exact: true }).click();
  await page.locator("#termination-badge").filter({ hasText: "COMPLETED" }).waitFor({ timeout: 20_000 });
  const summary = await page.locator("#summary-grid").innerText();
  if (!summary.includes("能量闭合 RMS") || !summary.includes("配置哈希")) {
    throw new Error(`audit summary is incomplete: ${summary}`);
  }

  const themeAudit = await page.evaluate(() => {
    const parseRgb = (value) => {
      const match = value.match(/rgba?\(\s*(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)/i);
      return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : undefined;
    };
    const styleProperties = [
      "color",
      "backgroundColor",
      "borderTopColor",
      "borderRightColor",
      "borderBottomColor",
      "borderLeftColor",
      "outlineColor",
      "caretColor",
      "accentColor",
    ];
    const coloredStyles = [];
    for (const element of document.querySelectorAll("body *")) {
      const style = getComputedStyle(element);
      for (const property of styleProperties) {
        const value = style[property];
        const rgb = parseRgb(value);
        if (rgb && Math.max(...rgb) - Math.min(...rgb) > 1) {
          coloredStyles.push(`${element.tagName.toLowerCase()}#${element.id}.${element.className}:${property}=${value}`);
        }
      }
    }

    const bodyStyle = getComputedStyle(document.body);
    const bodyBackground = parseRgb(bodyStyle.backgroundColor);
    const bodyText = parseRgb(bodyStyle.color);

    let coloredPlotPixels = 0;
    const plotBackgrounds = [];
    for (const id of ["time-canvas", "phase-canvas", "spectrum-canvas", "energy-canvas"]) {
      const canvas = document.querySelector(`#${id}`);
      const context = canvas?.getContext("2d");
      if (!canvas || !context) continue;
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      plotBackgrounds.push([pixels[0], pixels[1], pixels[2]]);
      for (let offset = 0; offset < pixels.length; offset += 4) {
        const red = pixels[offset];
        const green = pixels[offset + 1];
        const blue = pixels[offset + 2];
        if (Math.max(red, green, blue) - Math.min(red, green, blue) > 2) coloredPlotPixels += 1;
      }
    }

    const scene = document.querySelector("#scene-canvas");
    const sceneContext = scene?.getContext("2d");
    let bluePixels = 0;
    let orangePixels = 0;
    if (scene && sceneContext) {
      const pixels = sceneContext.getImageData(0, 0, scene.width, scene.height).data;
      for (let offset = 0; offset < pixels.length; offset += 4) {
        const red = pixels[offset];
        const green = pixels[offset + 1];
        const blue = pixels[offset + 2];
        if (blue > green + 16 && green > red + 14) bluePixels += 1;
        if (red > green + 24 && green > blue + 24) orangePixels += 1;
      }
    }

    return {
      coloredStyles: coloredStyles.slice(0, 12),
      coloredPlotPixels,
      bodyBackground,
      bodyText,
      plotBackgrounds,
      bluePixels,
      orangePixels,
    };
  });
  if (themeAudit.coloredStyles.length > 0) {
    throw new Error(`non-scene UI is not monochrome: ${themeAudit.coloredStyles.join(" | ")}`);
  }
  if (themeAudit.coloredPlotPixels > 0) {
    throw new Error(`diagnostic plots contain ${themeAudit.coloredPlotPixels} colored pixels`);
  }
  if (!themeAudit.bodyBackground?.every((channel) => channel >= 250)
    || !themeAudit.bodyText?.every((channel) => channel <= 24)
    || themeAudit.plotBackgrounds.some((rgb) => rgb.some((channel) => channel < 250))) {
    throw new Error(`light theme is not white-background/black-text: ${JSON.stringify(themeAudit)}`);
  }
  if (themeAudit.bluePixels < 100 || themeAudit.orangePixels < 100) {
    throw new Error(`scene semantic colors missing: ${JSON.stringify(themeAudit)}`);
  }

  // Exercise the independent CFD backend through the same browser/worker path.
  // The deliberately small case is an interface smoke test, not a cylinder
  // validation benchmark.
  await page.selectOption("#backend-select", "highFidelity");
  const openCategory = async (category) => {
    const details = page.locator(`details[data-category="${category}"]`);
    await details.waitFor({ state: "attached" });
    if (!(await details.evaluate((element) => element.open))) await details.locator("summary").click();
  };
  await openCategory("cfd2d");
  await openCategory("solver");
  await page.locator('[data-parameter-path="cfd2d.nx"]').waitFor();
  const fillParameter = async (path, value) => {
    await page.locator(`[data-parameter-path="${path}"]`).fill(String(value));
  };
  await fillParameter("fluid.flowRampTime", 0.03);
  await fillParameter("solver.duration", 0.1);
  await fillParameter("solver.outputInterval", 0.01);
  await fillParameter("cfd2d.nx", 96);
  await fillParameter("cfd2d.ny", 56);
  await fillParameter("cfd2d.cylinderCells", 8);
  await fillParameter("cfd2d.latticeVelocity", 0.04);
  await fillParameter("cfd2d.stepsPerChunk", 5);
  await fillParameter("cfd2d.fieldEvery", 10);
  await fillParameter("cfd2d.sampleEvery", 2);
  await fillParameter("cfd2d.penalizationTimeSteps", 1);
  await page.getByRole("button", { name: "检查参数", exact: true }).click();
  await page.locator("#config-state").filter({ hasText: "可运行" }).waitFor();
  await page.evaluate(() => {
    const canvas = document.querySelector("#scene-canvas");
    globalThis.__iyptSceneModes = [];
    globalThis.__iyptSceneModeObserver = new MutationObserver(() => {
      const mode = canvas?.getAttribute("data-scene-mode");
      if (mode && globalThis.__iyptSceneModes.at(-1) !== mode) globalThis.__iyptSceneModes.push(mode);
    });
    if (canvas) globalThis.__iyptSceneModeObserver.observe(canvas, { attributes: true, attributeFilter: ["data-scene-mode"] });
  });
  await page.getByRole("button", { name: "运行", exact: true }).click();
  await page.waitForFunction(() => {
    const summaryText = document.querySelector("#summary-grid")?.textContent ?? "";
    const badgeText = document.querySelector("#evidence-badges")?.textContent ?? "";
    return summaryText.includes("实际 raw 线力")
      && summaryText.includes("终点 diagnostic raw 线力")
      && summaryText.includes("VP-CFD2D-RAW-BRINKMAN-A1-v1")
      && badgeText.includes("unvalidated-preview/no-go");
  }, undefined, { timeout: 20_000 });
  await page.locator("#termination-badge").filter({ hasText: "COMPLETED" }).waitFor();
  const evidenceBadgeCount = await page.locator("#evidence-badges .badge").count();
  if (evidenceBadgeCount < 5) {
    throw new Error(`expected at least five evidence-contract badges, got ${evidenceBadgeCount}`);
  }
  const comparisonGateText = await page.locator("#comparison-gate").innerText();
  if (!comparisonGateText.includes("定量叠图已禁止")) {
    throw new Error(`incompatible result overlay was not blocked: ${comparisonGateText}`);
  }
  const sceneModeAudit = await page.evaluate(() => {
    globalThis.__iyptSceneModeObserver?.disconnect();
    return {
      modes: globalThis.__iyptSceneModes ?? [],
      finalMode: document.querySelector("#scene-canvas")?.getAttribute("data-scene-mode"),
    };
  });
  if (!sceneModeAudit.modes.includes("cfd")
    || sceneModeAudit.modes.includes("forward")
    || sceneModeAudit.finalMode !== "cfd") {
    throw new Error(`CFD scene switched rendering modes during one run: ${JSON.stringify(sceneModeAudit)}`);
  }
  const fieldHasContrast = await page.locator("#scene-canvas").evaluate((element) => {
    const canvas = element;
    const context = canvas.getContext("2d");
    if (context === null || canvas.width === 0 || canvas.height === 0) return false;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let minimum = 255;
    let maximum = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      minimum = Math.min(minimum, pixels[index], pixels[index + 1], pixels[index + 2]);
      maximum = Math.max(maximum, pixels[index], pixels[index + 1], pixels[index + 2]);
    }
    return maximum - minimum > 20;
  });
  if (!fieldHasContrast) throw new Error("cfd2d sectional field canvas has no rendered contrast");
  if (consoleErrors.length > 0) throw new Error(`browser console errors: ${consoleErrors.join(" | ")}`);
  process.stdout.write("E2E PASS: bidirectional visual parameters, five evidence-contract badges, incompatible-overlay gate, applied/diagnostic CFD summary, stable field rendering, light monochrome UI/plots, and blue-orange scene palette verified.\n");
} finally {
  await browser?.close();
  if (server.pid !== undefined && process.platform !== "win32") {
    try { process.kill(-server.pid, "SIGTERM"); } catch { /* already exited */ }
  } else {
    server.kill("SIGTERM");
  }
}
