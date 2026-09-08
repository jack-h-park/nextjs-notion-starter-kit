import assert from "node:assert";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

void describe("production monitoring budget", () => {
  void it("uses one region at a fifteen-minute cadence", async () => {
    const source = await readFile(path.join(repoRoot, "checkly.config.ts"), "utf8");

    assert.match(source, /frequency:\s*15/);
    assert.match(source, /locations:\s*\["us-east-1"\]/);
  });
});
