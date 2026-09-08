import assert from "node:assert";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

void describe("production image processing budget", () => {
  void it("does not enable server-side LQIP or globally trace Sharp binaries", async () => {
    const [siteConfig, nextConfig, notion] = await Promise.all([
      readFile(path.join(repoRoot, "site.config.ts"), "utf8"),
      readFile(path.join(repoRoot, "next.config.js"), "utf8"),
      readFile(path.join(repoRoot, "lib/notion.ts"), "utf8"),
    ]);

    assert.match(siteConfig, /isPreviewImageSupportEnabled:\s*false/);
    assert.doesNotMatch(nextConfig, new RegExp("node_modules/@img/\\\\*\\\\*"));
    assert.doesNotMatch(nextConfig, /sharp-libvips-linux-x64/);
    assert.doesNotMatch(notion, /getPreviewImageMap/);
  });
});
