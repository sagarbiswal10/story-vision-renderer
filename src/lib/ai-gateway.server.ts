/**
 * Lovable AI Gateway provider — server-only.
 * Connects the AI SDK to Lovable's gateway with a per-request runId fetch wrapper.
 */
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const LOVABLE_AIG_RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

export function createLovableAiGatewayProvider(
  lovableApiKey: string,
  initialRunId?: string,
  options?: { structuredOutputs?: boolean },
) {
  let runId = initialRunId?.trim() || undefined;
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    supportsStructuredOutputs: options?.structuredOutputs ?? false,
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(LOVABLE_AIG_RUN_ID_HEADER)) {
        headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);
      }
      const response = await fetch(input as RequestInfo, { ...init, headers });
      const incoming = response.headers.get(LOVABLE_AIG_RUN_ID_HEADER);
      if (!runId && incoming) runId = incoming;
      return response;
    },
  });
}
