import assert from "node:assert/strict";
import test from "node:test";

import type { AdminChatConfig } from "@/types/chat-config";
import { resolveReasoningEffort } from "@/lib/server/admin-chat-config";

type EffortConfig = Pick<AdminChatConfig, "generation" | "presets">;

function buildConfig(
  presets: Record<string, { reasoningEffort?: unknown }>,
  generation?: AdminChatConfig["generation"],
): EffortConfig {
  return {
    generation,
    presets: presets as AdminChatConfig["presets"],
  };
}

void test("a preset override wins over the global setting", () => {
  const config = buildConfig(
    { fast: { reasoningEffort: "none" }, default: {} },
    { reasoningEffort: "high" },
  );
  assert.equal(resolveReasoningEffort(config, "fast"), "none");
});

void test("a preset without an override inherits the global setting", () => {
  const config = buildConfig(
    { fast: { reasoningEffort: "none" }, default: {} },
    { reasoningEffort: "high" },
  );
  assert.equal(resolveReasoningEffort(config, "default"), "high");
});

void test("an unset override is inheritance, not none", () => {
  // The distinction that makes this worth a resolver: on a reasoning model,
  // "none" suppresses reasoning while inheritance may enable it. Reading the
  // field directly would conflate the two.
  const config = buildConfig({ default: {} }, { reasoningEffort: "medium" });
  assert.equal(resolveReasoningEffort(config, "default"), "medium");
  assert.notEqual(resolveReasoningEffort(config, "default"), "none");
});

void test("provider-default resolves to undefined so no effort is sent", () => {
  const globalDefault = buildConfig(
    { default: {} },
    { reasoningEffort: "provider-default" },
  );
  assert.equal(resolveReasoningEffort(globalDefault, "default"), undefined);

  const presetDefault = buildConfig(
    { fast: { reasoningEffort: "provider-default" } },
    { reasoningEffort: "high" },
  );
  // An explicit provider-default on the preset still overrides a global "high".
  assert.equal(resolveReasoningEffort(presetDefault, "fast"), undefined);
});

void test("missing generation config falls back to the provider default", () => {
  const config = buildConfig({ default: {} });
  assert.equal(resolveReasoningEffort(config, "default"), undefined);
});

void test("an unknown preset id falls back to the global setting", () => {
  const config = buildConfig({ default: {} }, { reasoningEffort: "low" });
  assert.equal(resolveReasoningEffort(config, "nonexistent"), "low");
  assert.equal(resolveReasoningEffort(config, null), "low");
});

void test("an unrecognized stored effort is ignored rather than forwarded", () => {
  const config = buildConfig(
    { fast: { reasoningEffort: "extreme" } },
    { reasoningEffort: "low" },
  );
  assert.equal(resolveReasoningEffort(config, "fast"), "low");
});

void test("stored efforts are matched case- and whitespace-insensitively", () => {
  const config = buildConfig({ fast: { reasoningEffort: "  HIGH " } });
  assert.equal(resolveReasoningEffort(config, "fast"), "high");
});
