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

export interface IsraelProfile {
  keren_hishtalmut_value: number;
  keren_hishtalmut_years: number;
  keren_pansiya_value: number;
  kupat_gemel_value: number;
  bituach_menahalim_value: number;
  days_in_israel_this_year: number;
  years_as_israeli_resident: number;
  has_israeli_company: boolean;
  family_in_israel: boolean;
}

export const DEFAULT_ISRAEL_PROFILE: IsraelProfile = {
  keren_hishtalmut_value: 0,
  keren_hishtalmut_years: 0,
  keren_pansiya_value: 0,
  kupat_gemel_value: 0,
  bituach_menahalim_value: 0,
  days_in_israel_this_year: 0,
  years_as_israeli_resident: 0,
  has_israeli_company: false,
  family_in_israel: false,
};

export interface BituachLeumiAnalysis {
  years_as_resident: number;
  old_age_pension: {
    qualifies: boolean;
    monthly_ils: number;
    years_to_qualify: number;
    note_he: string;
    note_en: string;
  };
  healthcare: {
    warning_he: string;
    warning_en: string;
    action_he: string;
    action_en: string;
  };
  unemployment: {
    note_he: string;
    note_en: string;
  };
  contributions_ongoing: {
    note_he: string;
    note_en: string;
  };
}

export interface TaxUpdate {
  date: string;
  country: string;
  country_code: string;
  type: 'alert' | 'change' | 'positive';
  he: string;
  en: string;
}

export interface CompanyJurisdiction {
  code: string;
  name: string;
  corp_tax: number;
  dividend_tax: number;
  effective_rate: number;
  setup_cost: number;
  annual_cost: number;
  eu: boolean;
  israel_treaty: boolean;
  residency_required: boolean;
  substance_required: boolean;
  score: number;
  net_profit_after_tax: number;
}

export interface CompanyAnalysis {
  profit: number;
  results: CompanyJurisdiction[];
}

export interface Scenario {
  id: string;
  name: string;
  savedAt: string;
  israelProfile: IsraelProfile;
  userProfile: UserProfile | null;
  analysis: IsraelAnalysis;
}

export interface IsraelAnalysis {
  kh_analysis: {
    status: string;
    status_he: string;
    status_en: string;
    withdrawal_net?: number;
    tax_if_withdraw_now?: number;
    withdrawal_net_now?: number;
    withdrawal_net_if_wait?: number;
    advice_he: string;
    advice_en: string;
  };
  pension_analysis: Array<{
    type: string;
    name_he: string;
    value: number;
    strategy_he: string;
    strategy_en: string;
  }>;
  exit_tax_analysis: {
    unrealized_gain_estimate: number;
    exit_tax_estimate: number;
    rate: number;
    note_he: string;
    note_en: string;
    deferral_options_he: string[];
    deferral_options_en: string[];
  };
  residency_risks: Array<{
    severity: string;
    text_he: string;
    text_en: string;
  }>;
  country_recommendations: Array<{
    code: string;
    name: string;
    name_en: string;
    adjusted_score: number;
    treaty_with_israel: boolean;
    flight_hours: number;
    israeli_community: string;
    israeli_community_en: string;
    tax_benefit: string;
    tax_benefit_en: string;
    residency_req: string;
    residency_req_en: string;
    pros: string[];
    cons: string[];
    annual_tax_estimate: number | null;
    annual_savings_vs_israel: number | null;
    cost_of_living_index?: number | null;
  }>;
  israel_annual_tax: number;
  total_income_usd: number;
  exit_process: Array<{
    step: number;
    category: string;
    title_he: string;
    title_en: string;
    detail_he: string;
    detail_en: string;
  }>;
  timing_messages: Array<{
    priority: string;
    text_he: string;
    text_en: string;
  }>;
  bituach_leumi?: BituachLeumiAnalysis;
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
