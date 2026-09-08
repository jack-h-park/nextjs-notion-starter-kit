import assert from "node:assert";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

void describe("production monitoring budget", () => {
  void it("uses one region at a fifteen-minute cadence", async () => {
    const [config, monitors] = await Promise.all([
      readFile(path.join(repoRoot, "checkly.config.ts"), "utf8"),
      readFile(
        path.join(repoRoot, "__checks__/production-availability.check.ts"),
        "utf8",
      ),
    ]);

    assert.match(config, /frequency:\s*15/);
    assert.match(config, /locations:\s*\["us-east-1"\]/);
    assert.match(monitors, /frequency:\s*Frequency\.EVERY_15M/);
  });
});
