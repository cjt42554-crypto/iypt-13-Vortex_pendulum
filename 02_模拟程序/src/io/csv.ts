import type { ExperimentalDataset, ExperimentalPoint } from "../core/types";

export const EXPERIMENTAL_CSV_HEADERS = [
  "run_id",
  "time_s",
  "theta_rad",
  "displacement_m",
  "sigma",
] as const;

export interface CsvImportOptions {
  name?: string;
  defaultRunId?: string;
}

/** Parse the RFC 4180 quoting/escaping subset used by the experimental template. */
export function parseCsv(source: string): string[][] {
  if (source.length === 0) return [];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let quoteClosed = false;
  let index = 0;
  const finishCell = (): void => {
    row.push(cell);
    cell = "";
    quoteClosed = false;
  };
  const finishRow = (): void => {
    finishCell();
    rows.push(row);
    row = [];
  };
  while (index < source.length) {
    const character = source[index] ?? "";
    if (inQuotes) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 2;
          continue;
        }
        inQuotes = false;
        quoteClosed = true;
        index += 1;
        continue;
      }
      cell += character;
      index += 1;
      continue;
    }
    if (quoteClosed && character !== "," && character !== "\r" && character !== "\n") {
      throw new SyntaxError(`unexpected character after closing quote at offset ${index}`);
    }
    if (character === '"') {
      if (cell.length !== 0) throw new SyntaxError(`quote must begin a field at offset ${index}`);
      inQuotes = true;
      index += 1;
      continue;
    }
    if (character === ",") {
      finishCell();
      index += 1;
      continue;
    }
    if (character === "\r" || character === "\n") {
      finishRow();
      if (character === "\r" && source[index + 1] === "\n") index += 2;
      else index += 1;
      continue;
    }
    cell += character;
    index += 1;
  }
  if (inQuotes) throw new SyntaxError("unterminated quoted CSV field");
  if (cell.length > 0 || row.length > 0 || quoteClosed) finishRow();
  return rows;
}

function escapeCsvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function stringifyCsv(rows: readonly (readonly (string | number | undefined)[])[]): string {
  return rows.map((row) => row.map((value) => escapeCsvCell(value === undefined ? "" : String(value))).join(","))
    .join("\r\n");
}

/** Stable browser-safe FNV-1a hash used to track the exact imported byte string. */
export function sourceHash(source: string): string {
  let hash = 0xcbf29ce484222325n;
  const bytes = new TextEncoder().encode(source);
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `fnv1a64-${hash.toString(16).padStart(16, "0")}`;
}

function normalizedHeader(header: string): string {
  return header.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function findHeader(headers: readonly string[], aliases: readonly string[]): number {
  const normalized = headers.map(normalizedHeader);
  return aliases.map(normalizedHeader).map((alias) => normalized.indexOf(alias)).find((index) => index >= 0) ?? -1;
}

function parseOptionalNumber(value: string | undefined, label: string, rowNumber: number): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed)) throw new SyntaxError(`${label} at CSV row ${rowNumber} must be a finite number`);
  return parsed;
}

export function importExperimentalCsv(
  source: string,
  options: CsvImportOptions = {},
): ExperimentalDataset {
  const rows = parseCsv(source);
  if (rows.length === 0) throw new SyntaxError("CSV input is empty");
  const headers = rows[0] ?? [];
  const timeColumn = findHeader(headers, ["time_s", "time", "t", "时间_s", "时间"]);
  const runColumn = findHeader(headers, ["run_id", "runid", "run", "replicate", "实验组"]);
  const thetaColumn = findHeader(headers, ["theta_rad", "theta", "angle_rad", "角度_rad", "摆角_rad"]);
  const thetaDegreeColumn = findHeader(headers, ["theta_deg", "angle_deg", "角度_deg", "摆角_deg"]);
  const displacementColumn = findHeader(headers, ["displacement_m", "displacement", "x_m", "x", "位移_m"]);
  const sigmaColumn = findHeader(headers, ["sigma", "uncertainty", "standard_uncertainty", "标准不确定度"]);
  if (timeColumn < 0) throw new SyntaxError("CSV header must contain time_s");
  if (thetaColumn < 0 && thetaDegreeColumn < 0 && displacementColumn < 0) {
    throw new SyntaxError("CSV header must contain theta_rad, theta_deg, or displacement_m");
  }
  const warnings: string[] = [];
  if (runColumn < 0) warnings.push(`run_id column is missing; using ${options.defaultRunId ?? "run-1"}`);
  if (thetaDegreeColumn >= 0 && thetaColumn < 0) warnings.push("theta_deg was converted to radians");
  const points: ExperimentalPoint[] = [];
  let blankRows = 0;
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    if (row.every((value) => value.trim() === "")) {
      blankRows += 1;
      continue;
    }
    const csvRow = rowIndex + 1;
    const time = parseOptionalNumber(row[timeColumn], "time_s", csvRow);
    if (time === undefined) throw new SyntaxError(`time_s at CSV row ${csvRow} is required`);
    const thetaRadians = thetaColumn >= 0
      ? parseOptionalNumber(row[thetaColumn], "theta_rad", csvRow)
      : undefined;
    const thetaDegrees = thetaDegreeColumn >= 0
      ? parseOptionalNumber(row[thetaDegreeColumn], "theta_deg", csvRow)
      : undefined;
    const theta = thetaRadians ?? (thetaDegrees === undefined ? undefined : thetaDegrees * Math.PI / 180);
    const displacement = displacementColumn >= 0
      ? parseOptionalNumber(row[displacementColumn], "displacement_m", csvRow)
      : undefined;
    if (theta === undefined && displacement === undefined) {
      throw new SyntaxError(`CSV row ${csvRow} must contain theta or displacement`);
    }
    const sigma = sigmaColumn >= 0 ? parseOptionalNumber(row[sigmaColumn], "sigma", csvRow) : undefined;
    if (sigma !== undefined && sigma < 0) throw new SyntaxError(`sigma at CSV row ${csvRow} must be non-negative`);
    const runId = runColumn >= 0 ? (row[runColumn]?.trim() || (options.defaultRunId ?? "run-1")) : (options.defaultRunId ?? "run-1");
    const base: ExperimentalPoint = { runId, time };
    points.push({
      ...base,
      ...(theta === undefined ? {} : { theta }),
      ...(displacement === undefined ? {} : { displacement }),
      ...(sigma === undefined ? {} : { sigma }),
    });
  }
  if (points.length === 0) throw new SyntaxError("CSV contains no experimental data rows");
  points.sort((left, right) => left.runId.localeCompare(right.runId) || left.time - right.time);
  if (blankRows > 0) warnings.push(`${blankRows} blank rows were ignored`);
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (previous !== undefined && current !== undefined
      && previous.runId === current.runId && previous.time === current.time) {
      warnings.push(`duplicate time ${current.time} in run ${current.runId} was preserved`);
    }
  }
  return {
    name: options.name ?? "Imported experiment",
    points,
    sourceHash: sourceHash(source),
    warnings,
  };
}

export function exportExperimentalCsv(
  datasetOrPoints: ExperimentalDataset | readonly ExperimentalPoint[],
): string {
  const points = Array.isArray(datasetOrPoints)
    ? datasetOrPoints
    : (datasetOrPoints as ExperimentalDataset).points;
  const rows: Array<Array<string | number | undefined>> = [[...EXPERIMENTAL_CSV_HEADERS]];
  for (const point of points) {
    rows.push([
      point.runId,
      point.time,
      point.theta,
      point.displacement,
      point.sigma,
    ]);
  }
  return `${stringifyCsv(rows)}\r\n`;
}

export function experimentalCsvTemplate(): string {
  return `${stringifyCsv([[...EXPERIMENTAL_CSV_HEADERS]])}\r\n`;
}
