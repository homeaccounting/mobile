import type { ApiClient } from './client';
import type { PromptRequest, PromptResponse } from './types';

// POST /api/prompt — interpret a natural-language prompt and record 1..N
// transactions. 503 when the server has no LLM configured (tracker#94).
export const promptApi = (client: ApiClient) => ({
  submit: (body: PromptRequest) => client.post<PromptResponse>('/api/prompt', body),
});
