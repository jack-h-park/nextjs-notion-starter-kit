import assert from "node:assert";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

void describe("Vercel Preview deployment policy", () => {
  void it("ignores Preview builds but permits production builds", async () => {
    const config = JSON.parse(await readFile(path.join(repoRoot, "vercel.json"), "utf8")) as {
      ignoreCommand?: string;
    };

    assert.equal(
      config.ignoreCommand,
      'if [ "$VERCEL_ENV" = "preview" ]; then exit 0; else exit 1; fi',
    );
  });
});
