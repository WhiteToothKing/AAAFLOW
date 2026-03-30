const PROVIDER_KEY = 'aaaflow_llm_provider';
const MODEL_KEY = 'aaaflow_llm_model';

export function getChatLlmPrefs(): { provider: string; model: string | null } {
  try {
    const provider = localStorage.getItem(PROVIDER_KEY) || 'anthropic';
    const model = localStorage.getItem(MODEL_KEY);
    return { provider, model: model || null };
  } catch {
    return { provider: 'anthropic', model: null };
  }
}

export function setChatLlmPrefs(provider: string, model: string | null): void {
  try {
    localStorage.setItem(PROVIDER_KEY, provider);
    if (model) localStorage.setItem(MODEL_KEY, model);
    else localStorage.removeItem(MODEL_KEY);
  } catch {
    /* ignore */
  }
}
