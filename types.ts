export interface FileAttachment {
  name: string;
  mimeType: string;
  data: string; // Base64 string
  preview: string; // Data URL for preview
}

export interface ModelConfig {
  id: string;
  modelName: string;
  systemInstruction: string;
  temperature: number;
  apiKey?: string;
  baseUrl?: string;
  size?: string;
  numberResults?: number;
}

export interface TestResult {
  configId: string;
  isLoading: boolean;
  error?: string;
  textResponse?: string;
  imageBase64s?: string[];
  imageUrls?: string[];
  rawResponse?: string;
  requestPayload?: string;
  endpoint?: string;
  timestamp: number;
}

export enum OpenAIModel {
  GPT_4O_MINI = 'gpt-4o-mini',
  GPT_4O = 'gpt-4o',
}

export enum GeminiModel {
  GOOGLE_NANO_BANANA = 'google/nano-banana',
  GOOGLE_GEMINI_FLASH = 'google/gemini-2.0-flash',
  VOLCENGINE_DOUBAO_LITE = 'volcengine/doubao-lite',
  OPENAI_GPT_4O_MINI = 'gpt-4o-mini',
  OPENAI_GPT_4O = 'gpt-4o',
}
