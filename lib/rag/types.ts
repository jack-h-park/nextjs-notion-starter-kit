export type GuardrailRoute = "normal" | "chitchat" | "command";

export type ChatConfigSnapshot = {
  // Identifier / preset
  presetKey: string;

  // Engine & models
  safeMode: boolean;
  llmModel: string;
  // Effective reasoning effort after preset override and global fallback are
  // applied — "provider-default" when no explicit effort is sent. Recorded so a
  // trace shows what the model was actually asked to do, not just which model.
  reasoningEffort: string;
  embeddingModel: string;

  // RAG / retrieval configuration
  rag: {
    enabled: boolean;
    topK: number;
    similarity: number;

    ranker: string;
    reverseRAG: boolean;
    hyde: boolean;
    summaryLevel: string;

    numericLimits: {
      ragTopK: number;
      similarityThreshold: number;
    };

    ranking: {
      docTypeWeights: Record<string, number>;
      personaTypeWeights: Record<string, number>;
    };
  };

  // Context / history budgets
  context: {
    tokenBudget: number;
    historyBudget: number;
    clipTokens: number;
  };

  // Telemetry configuration
  telemetry: {
    sampleRate: number;
    detailLevel: "minimal" | "standard" | "verbose";
  };

  // Cache configuration
  cache: {
    responseTtlSeconds: number;
    retrievalTtlSeconds: number;
    responseEnabled?: boolean;
    retrievalEnabled?: boolean;
  };

  // Prompt / guardrail metadata (optional)
  prompt?: {
    baseVersion?: string;
  };

  guardrails?: {
    route?: GuardrailRoute;
  };
};

/** @deprecated Use ChatConfigSnapshot instead. */
export type RagConfigSnapshot = ChatConfigSnapshot;
