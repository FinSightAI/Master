export interface IncomeProfile {
  employment: number;
  business: number;
  capital_gains: number;
  dividends: number;
  crypto: number;
  rental: number;
  other: number;
}

export interface AssetProfile {
  stocks: number;
  real_estate: number;
  crypto_holdings: number;
  business_value: number;
  other: number;
}

export interface UserProfile {
  citizenships: string[];
  current_residency: string;
  years_in_country: number;
  is_us_person: boolean;
  crypto_long_term: boolean;
  income: IncomeProfile;
  assets: AssetProfile;
  goals: string[];
  constraints: string[];
  timeline: string;
  notes: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tools?: ToolEvent[];
  timestamp: Date;
}

export interface ToolEvent {
  type: 'tool_start' | 'tool_result';
  tool: string;
  input?: Record<string, unknown>;
  result_preview?: string;
}

export type StreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_start'; tool: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool: string; result_preview: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

export const TOOL_DISPLAY_NAMES: Record<string, string> = {
  web_search: 'Web Search',
  get_country_tax_profile: 'Loading Country Data',
  get_special_regime_details: 'Loading Regime Details',
  calculate_tax_scenario: 'Calculating Tax Scenario',
  lookup_tax_treaty: 'Looking Up Tax Treaty',
};

export const TOOL_ICONS: Record<string, string> = {
  web_search: '🔍',
  get_country_tax_profile: '🌍',
  get_special_regime_details: '📋',
  calculate_tax_scenario: '🧮',
  lookup_tax_treaty: '🤝',
};

export interface SavingsResult {
  code: string;
  name: string;
  estimated_tax: number;
  annual_savings: number;
  ten_year_savings: number;
  effective_rate: number;
  special_regimes: string[];
  territorial: boolean;
  region: string;
}

export interface SavingsAnalysis {
  current_country: string;
  current_country_name: string;
  current_tax: number;
  total_income: number;
  current_effective_rate: number;
  exit_tax_info: { rate?: number; note?: string; applicable?: string };
  exit_tax_estimate: number;
  results: SavingsResult[];
  error?: string;
}

export interface SavedSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  history: Array<{ role: string; content: string }>;
  savedAt: string;
}

export const DEFAULT_PROFILE: UserProfile = {
  citizenships: [],
  current_residency: '',
  years_in_country: 0,
  is_us_person: false,
  crypto_long_term: false,
  income: {
    employment: 0,
    business: 0,
    capital_gains: 0,
    dividends: 0,
    crypto: 0,
    rental: 0,
    other: 0,
  },
  assets: {
    stocks: 0,
    real_estate: 0,
    crypto_holdings: 0,
    business_value: 0,
    other: 0,
  },
  goals: [],
  constraints: [],
  timeline: '',
  notes: '',
};
