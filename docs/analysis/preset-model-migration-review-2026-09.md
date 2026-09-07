# Session Preset Model Migration Review — gpt-4o → gpt-5.6 (2026-09-07)

> **Status:** Reviewed, no change made. This records the evidence behind a *not yet* decision
> so the same question does not get re-litigated from scratch.
>
> **Scope:** Whether the four session presets should move from the gpt-4o family to
> `gpt-5.6-luna` / `gpt-5.6-terra`.

## The proposal

Swap `gpt-4o-mini` → `gpt-5.6-luna` and `gpt-4o` → `gpt-5.6-terra` across all four presets,
on the grounds that the cost difference is small.

Preset models as observed in the running settings UI on 2026-09-07:

| Preset | LLM model (live) |
|---|---|
| FAST | `gpt-4o-mini` |
| PRECISION | `gpt-4o` |
| BALANCED (default) | `gpt-4o-mini` |
| HIGH RECALL | `gpt-4o` |

`DEFAULT_LLM_MODEL` is not set in Vercel, so the code fallback in `lib/core/llm-registry.ts`
(`gpt-4o-mini`) applies where no preset model resolves.

## Conclusion

**Do not swap yet, and do not swap all four.** Not because the sample is small — because the
cells that would decide it are empty.

## Evidence

Source: Langfuse project `jacks-ai-assistant` (org *Jack's Playground*), all data through
2026-09-07. Queried via the Langfuse MCP server.

> Traces are tagged `env:prod` / `env:preview` / `env:dev`, and separately carry an
> `environment` field. A query filtered on neither returns everything; a query that assumes
> only one of the two returns a misleading subset. See
> [langfuse-guide.md](../telemetry/langfuse-guide.md).

### 1. Preset usage — one preset, everything else zero

Every trace carries a `preset:<key>` tag, attached in
`lib/server/api/langchain_chat_impl_heavy.ts` (`attachLangfuseTraceTags`).

| Preset tag | Traces (all envs) | Traces (`env:prod`) |
|---|---|---|
| `preset:default` | 26 | 5 |
| `preset:fast` | 0 | 0 |
| `preset:precision` | 0 | 0 |
| `preset:highRecall` | 0 | 0 |

Every tagged trace ever recorded, in every environment, is BALANCED. FAST, PRECISION and
HIGH RECALL have never been exercised in roughly ten months of tracing.

Consequences:

- Three of the four rows in the proposal have no production behaviour to compare against.
- Latency arguments about FAST are moot — nobody reaches FAST.
- PRECISION and HIGH RECALL are, on this evidence, dead configuration. Deciding their model
  matters less than deciding whether they should exist.

**Counting note:** the figure "81" that circulated is `meta.totalItems` over *observations*
(spans), not traces. Actual traces: 29 (24 tagged + 5 untagged), of which **5 are prod**.

### 2. Latency baseline

Prod `GENERATION` spans, n=5, all `gpt-4o-mini-2024-07-18`:

| Span | p50 | p95 |
|---|---|---|
| LLM call (`ChatOpenAI`) | 1,942 ms | 2,761 ms |
| `rag:root` (retrieval) | 2,637 ms | — |
| `langchain-chat` (end-to-end) | 5,281 ms | — |

Preview adds 17 more generations (p50 1,470 ms), also all `gpt-4o-mini`, also all
`preset:default`.

Two things follow:

- At n=5 a p95 is the second-slowest sample, not a percentile. It cannot serve as a
  regression gate.
- **Retrieval is the larger half of the wall clock** (~2.6 s vs ~1.9 s). A model swap moves
  the smaller term. Latency work should start with retrieval, not with the LLM.

### 3. Grounding — not measurable with current instrumentation

`sum_countScores` across the entire Langfuse project is **0**. There are no faithfulness,
citation-usage, or relevance scores of any kind.

The retrieval spans (`retrieve`, `rerank`, `context:selection`) record that chunks were
fetched. Nothing records whether the answer used them.

This is the risk that matters most here. A stronger model can be *worse* for RAG by leaning
on parametric knowledge instead of retrieved context — precisely the behaviour the preset
prompts try to suppress ("Avoid speculation. Use retrieved context only when it clearly
improves correctness."). Today that failure mode would be **unfalsifiable**: we would have no
signal that distinguishes it from a successful upgrade.

Judging this by reading answer bodies is not an option either — the traces carry visitor
questions from a public app, and `LANGFUSE_INCLUDE_PII` (production, encrypted, added
~2026-07) governs what is captured at all.

### 4. Token volume — "the cost difference is small" is true and irrelevant

Lifetime totals, all environments, all time:

| Env | Generations | Input tokens | Output tokens | Cost |
|---|---|---|---|---|
| preview | 17 | 36,766 | 1,770 | $0.0064 |
| prod | 5 | 11,461 | 489 | $0.0020 |
| dev | 2 | 4,812 | 287 | $0.0009 |

**$0.0093 total, ever.** A 50× price increase would still be under a dollar a year.

Cost is therefore not an argument in either direction. The decision rests entirely on quality
and latency — and neither is currently measured well enough to carry it.

## Per-preset recommendation

| Preset | Recommendation | Reason |
|---|---|---|
| **BALANCED** | Try `gpt-5.6-luna`, as a deliberate observation window | The only preset with traffic, and the default every visitor hits. Worth doing — but not fire-and-forget. |
| **FAST** | Keep `gpt-4o-mini` | See below. A reasoning model here can make the *speed* preset the slowest one. |
| **PRECISION** | No change | Zero usage; a swap changes nothing observable. |
| **HIGH RECALL** | No change | Zero usage; same. |

Swapping all four also collapses the differentiation the presets exist to provide: if every
preset is frontier-class, FAST and PRECISION stop being distinguishable by model at all.

### Why FAST is the risky one

`gpt-5.6-luna` and `gpt-5.6-terra` are declared in `lib/shared/models.ts` with
`supportsReasoningEffort: true` and `supportsSampling: false`. The effective reasoning effort
comes from `adminConfig.generation.reasoningEffort`, whose default is `"provider-default"`
(`lib/server/admin-chat-config.ts`).

So a naive swap runs FAST at the provider's default reasoning effort, spending most completion
tokens on reasoning. The preset whose entire purpose is latency would plausibly become the
slowest. If FAST is ever switched to a reasoning model, its effort must be pinned to
`none`/`low` first — which today is not expressible per preset (see
[Known gap](#known-gap-reasoning-effort-is-global-not-per-preset)).

## Precondition before any swap

**Add one grounding score.** A single faithfulness or citation-usage score on the `answer:llm`
span would turn the next ~20 prod traces into an actual answer to the question this review
could not answer. Without it, a gpt-5.6 rollout cannot be evaluated, only hoped for.

## Known gap: reasoning effort is global, not per-preset

`AdminChatConfig.generation.reasoningEffort` (`types/chat-config.ts`) is a single top-level
field, a sibling of `presets` — not a per-preset field. The admin dashboard exposes it fully
(`components/admin/chat-config/GenerationControlsCard.tsx`: five options from
`provider-default` through `high`), and the runtime reads it globally
(`lib/server/api/langchain_chat_impl_heavy.ts`).

This is adequate while presets share a model family. It stops being adequate the moment
presets differ in *how much thinking* they should do — which is exactly what a mixed
gpt-4o / gpt-5.6 lineup means. Today you cannot express "FAST at `none`, BALANCED at
`medium`"; one global setting applies to whichever presets happen to use reasoning-capable
models.

Moving `reasoningEffort` into `AdminChatPreset` (with the global value as the fallback) is the
natural fix, and it is a precondition for a *partial* migration rather than a nice-to-have.

## How to apply the change when it happens

Preset values are **data, not code**. See
[session-presets.md § Where preset values actually come from](../chat/session-presets.md#where-preset-values-actually-come-from).
Editing `DEFAULT_ADMIN_CHAT_PRESETS` does not change production. Use the admin dashboard
(Chat Config → Session presets), which writes the `admin_chat_config` row in `system_settings`.

## Related

- [session-presets.md](../chat/session-presets.md)
- [langfuse-guide.md](../telemetry/langfuse-guide.md)
- [model-catalog-expansion-plan.md](../chat/model-catalog-expansion-plan.md)
- [admin-guide.md](../operations/admin-guide.md)
