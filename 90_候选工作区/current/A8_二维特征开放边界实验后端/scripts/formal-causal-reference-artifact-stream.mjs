import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import {
  access,
  mkdir,
  open,
  rename,
  rm,
  stat,
} from "node:fs/promises";
import { dirname } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip, createGzip } from "node:zlib";
import chain from "stream-chain";
import { parser } from "stream-json";
import { disassembler } from "stream-json/disassembler.js";
import { pick } from "stream-json/filters/pick.js";
import { streamValues } from "stream-json/streamers/stream-values.js";
import { stringer } from "stream-json/stringer.js";

const COPY_BLOCK_BYTES = 1024 * 1024;

function rejectNonFinite(_key, value) {
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new RangeError("A8O result contains a non-finite number");
  }
  return value;
}

function hashingTransform(hash, onBytes, appendNewline) {
  return new Transform({
    transform(chunk, encoding, callback) {
      const bytes = Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk, encoding);
      hash.update(bytes);
      onBytes(bytes.length);
      callback(null, bytes);
    },
    flush(callback) {
      if (appendNewline) {
        const newline = Buffer.from("\n", "utf8");
        hash.update(newline);
        onBytes(newline.length);
        this.push(newline);
      }
      callback();
    },
  });
}

async function assertAbsent(path) {
  try {
    await access(path);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  throw new Error("A8O output already exists: " + path);
}

export async function writeDeterministicJsonGzip(
  value,
  outputPath,
  { level, mtime },
) {
  await mkdir(dirname(outputPath), { recursive: true });
  await assertAbsent(outputPath);
  const partialPath = outputPath + ".partial-" + process.pid;
  await assertAbsent(partialPath);
  const canonicalHash = createHash("sha256");
  const storedHash = createHash("sha256");
  let canonicalBytes = 0;
  let storedBytes = 0;
  try {
    await pipeline(
      Readable.from([value], { objectMode: true }),
      disassembler.asStream({
        packValues: true,
        streamValues: false,
        replacer: rejectNonFinite,
      }),
      stringer.asStream({ useValues: true }),
      hashingTransform(
        canonicalHash,
        (count) => { canonicalBytes += count; },
        true,
      ),
      createGzip({ level, mtime }),
      hashingTransform(
        storedHash,
        (count) => { storedBytes += count; },
        false,
      ),
      createWriteStream(partialPath, { flags: "wx" }),
    );
    await rename(partialPath, outputPath);
  } catch (error) {
    await rm(partialPath, { force: true });
    throw error;
  }
  return {
    canonicalSha256: canonicalHash.digest("hex"),
    storedSha256: storedHash.digest("hex"),
    canonicalBytes,
    storedBytes,
  };
}

export async function sha256File(path) {
  const hash = createHash("sha256");
  let bytes = 0;
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk);
    bytes += chunk.length;
  }
  return { sha256: hash.digest("hex"), bytes };
}

export async function sha256CanonicalJson(path) {
  const hash = createHash("sha256");
  let bytes = 0;
  const input = path.endsWith(".gz")
    ? createReadStream(path).pipe(createGunzip())
    : createReadStream(path);
  for await (const chunk of input) {
    hash.update(chunk);
    bytes += chunk.length;
  }
  return { sha256: hash.digest("hex"), bytes };
}

export function streamSelectedJsonValues(path, filter) {
  const stages = [createReadStream(path)];
  if (path.endsWith(".gz")) stages.push(createGunzip());
  stages.push(
    parser(),
    pick({ filter }),
    streamValues(),
  );
  return chain(stages);
}

export async function filesAreByteIdentical(firstPath, secondPath) {
  const [firstStat, secondStat] = await Promise.all([
    stat(firstPath),
    stat(secondPath),
  ]);
  if (firstStat.size !== secondStat.size) return false;
  const first = await open(firstPath, "r");
  const second = await open(secondPath, "r");
  const firstBuffer = Buffer.allocUnsafe(COPY_BLOCK_BYTES);
  const secondBuffer = Buffer.allocUnsafe(COPY_BLOCK_BYTES);
  try {
    let position = 0;
    while (position < firstStat.size) {
      const length = Math.min(COPY_BLOCK_BYTES, firstStat.size - position);
      const [firstRead, secondRead] = await Promise.all([
        first.read(firstBuffer, 0, length, position),
        second.read(secondBuffer, 0, length, position),
      ]);
      if (firstRead.bytesRead !== length || secondRead.bytesRead !== length) {
        return false;
      }
      if (!firstBuffer.subarray(0, length).equals(
        secondBuffer.subarray(0, length),
      )) {
        return false;
      }
      position += length;
    }
    return true;
  } finally {
    await Promise.all([first.close(), second.close()]);
  }
}
