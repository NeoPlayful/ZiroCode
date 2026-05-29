export interface ModelCategory {
  name: string
  provider: string
  models: { id: string; name: string; description?: string }[]
}

export const MODEL_CATEGORIES: ModelCategory[] = [
  {
    name: 'Anthropic',
    provider: 'anthropic',
    models: [
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', description: 'Best balance of speed & quality' },
      { id: 'claude-opus-4-7', name: 'Claude Opus 4.7', description: 'Most capable, best for complex tasks' },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', description: 'Fastest, lightweight tasks' },
      { id: 'claude-sonnet-4-6-latest', name: 'Claude Sonnet 4.6 Latest', description: 'Latest iteration' },
    ],
  },
  {
    name: 'OpenAI',
    provider: 'openai',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Multimodal flagship model' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Affordable small model' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Previous generation flagship' },
      { id: 'gpt-4', name: 'GPT-4', description: 'Legacy high-quality model' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast & cost-effective' },
      { id: 'o3-mini', name: 'o3 Mini', description: 'Reasoning model' },
      { id: 'o1', name: 'o1', description: 'Advanced reasoning' },
      { id: 'o1-mini', name: 'o1 Mini', description: 'Lightweight reasoning' },
    ],
  },
  {
    name: 'Google',
    provider: 'google',
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Google\'s most capable model' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Fast & efficient' },
      { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', description: 'Lightweight, low cost' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Previous generation pro' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Previous generation fast' },
    ],
  },
  {
    name: 'DeepSeek',
    provider: 'deepseek',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', description: 'General purpose chat' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', description: 'Reasoning & analysis' },
      { id: 'deepseek-coder', name: 'DeepSeek Coder', description: 'Code generation' },
    ],
  },
  {
    name: 'Other',
    provider: 'other',
    models: [
      { id: 'qwen-max', name: 'Qwen Max', description: 'Alibaba\'s flagship' },
      { id: 'qwen-plus', name: 'Qwen Plus', description: 'Balanced performance' },
      { id: 'mistral-large', name: 'Mistral Large', description: 'Mistral\'s best model' },
      { id: 'mistral-medium', name: 'Mistral Medium', description: 'Efficient mid-range' },
      { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', description: 'Meta\'s open model' },
      { id: 'llama-3.1-8b', name: 'Llama 3.1 8B', description: 'Lightweight open model' },
    ],
  },
]

export function getAllModels() {
  return MODEL_CATEGORIES.flatMap(cat => cat.models)
}

export function getModelById(id: string) {
  return getAllModels().find(m => m.id === id)
}

export function getModelIcon(provider: string): string {
  const icons: Record<string, string> = {
    anthropic: 'A',
    openai: 'O',
    google: 'G',
    deepseek: 'D',
    other: 'M',
  }
  return icons[provider] || 'M'
}

export function getProviderForModel(modelId: string): string {
  for (const cat of MODEL_CATEGORIES) {
    if (cat.models.some(m => m.id === modelId)) return cat.provider
  }
  return 'other'
}
