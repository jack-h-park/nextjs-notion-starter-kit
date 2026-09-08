import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

type Redirect = {
  destination: string;
  permanent?: boolean;
  source: string;
};

void test("permanently redirects the legacy brand-guide URL to the R2 asset host", async () => {
  const config = JSON.parse(await readFile("vercel.json", "utf8")) as {
    redirects?: Redirect[];
  };

  assert.deepEqual(
    config.redirects?.find(
      ({ source }) => source === "/assets/brand-design-system-guide.html",
    ),
    {
      source: "/assets/brand-design-system-guide.html",
      destination:
        "https://assets.jackhpark.com/brand-design-system-guide.html",
      permanent: true,
    },
  );
});
