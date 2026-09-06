export interface SourceItem {
  chunk_id: string;
  title: string;
  source_file: string;
  category: string;
  page_url: string;
  score?: number;
  snippet?: string;
  domain?: string;
  image?: string;
}

export interface ReasoningStep {
  primary: string;
  secondary?: string;
  mono?: boolean;
  add?: number;
  del?: number;
  href?: string;
}

export interface TokenStep {
  step_number: number;
  step_name: string;
  model_name: string;
  model_id: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  cost_inr: number;
  duration_ms?: number;
  details?: string;
}

export interface TokenMetrics {
  model_id: string;
  model_name: string;
  provider: string;
  prompt_tokens: number;
  completion_tokens: number;
  embedding_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
  total_cost_inr: number;
  latency_ms: number;
  ttft_ms: number;
  tokens_per_sec: number;
  pricing_rates?: {
    input_per_1m: number;
    output_per_1m: number;
  };
  steps: TokenStep[];
}

export interface ResourceAttachment {
  title: string;
  resource_type: string;
  url: string;
  description?: string;
  source_page_title?: string;
  source_page_url?: string;
  doc_name?: string;
  status?: string;
  http_code?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string | Date;
  model?: string;
  tokens_used?: number;
  latency_ms?: number;
  sources?: SourceItem[];
  resource_attachments?: ResourceAttachment[];
  reasoning_steps?: string[] | ReasoningStep[];
  token_metrics?: TokenMetrics;
  is_streaming?: boolean;
  is_cached?: boolean;
  suggestions?: string[];
}

export interface Session {
  id: string;
  title: string;
  model_used: string;
  created_at?: string;
  updated_at?: string;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  description: string;
  is_default: boolean;
  supports_reasoning: boolean;
}

export interface SystemStats {
  status: string;
  vector_count: number;
  bm25_chunks: number;
  total_sessions: number;
  total_messages: number;
  cached_queries: number;
  average_latency_ms: number;
  feedback_logged: number;
  models_available: string[];
}

export interface RateLimitInfo {
  isLimited: boolean;
  type: 'minute' | 'daily' | 'ban' | 'permanent' | 'none';
  message: string;
  resetTimeString: string;
  untilTimestamp: number;
}
