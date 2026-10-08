// Ported from web/src/api/types.ts (tracker#87), trimmed to what the mobile MVP
// calls. Shapes mirror backend/src/Web/Types.hs; when the backend changes a
// shape, update web and mobile together until the shared client package lands.

export type UUID = string;
export type ISO8601 = string;

// --- Auth ---

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  userId: UUID;
  email: string | null;
  expiresIn: number; // seconds
}

// --- Accounts ---
// JSON shape from backend/src/Web/Types.hs:248-258 (`AccountResponse`).

export interface AccountSubtype {
  // Discriminator: "cash" | "bankAccount" | "eWallet" | "asset" | "loan".
  // Other fields vary by type — see backend/src/Web/Types.hs `fromAccountSubtype` for
  // the per-discriminator field set. The MVP UI only reads `.type` for display.
  type: string;
  [key: string]: unknown;
}

// Account lifecycle status. Mirrors backend fromAccountStatus
// (../server-infra/src/Web/Types.hs:793-795): every account starts "Opened".
export type AccountStatus = 'Opened' | 'Closed';

// Account roles — mirrors backend AccountRole (Domain/Core/Types.hs). Wire tokens
// are lowercase (see backend roleToText).
export const ACCOUNT_ROLES = ['owner', 'editor', 'viewer'] as const;
export type AccountRole = (typeof ACCOUNT_ROLES)[number];

export interface AccountResponse {
  id: UUID;
  name: string;
  balance: number;
  currency: string;
  overdraftLimit: number | null;
  subtype: AccountSubtype | null;
  status: AccountStatus; // backend Web/Types.hs:260
  role: AccountRole; // tracker#29 — current user's role on this account
  version: number;
}

export interface AccountListResponse {
  accounts: AccountResponse[];
  totalCount: number;
}

// Subset of web/src/api/types.ts TransactionResponse — only what the mobile
// prompt result card reads. Extend from web's definition when a screen needs more.
export interface TransactionResponse {
  id: UUID;
  sourceAccountId: UUID;
  targetAccountId: UUID;
  sourceAmount: number;
  sourceCurrency: string;
  targetAmount: number;
  targetCurrency: string;
  description: string;
  transactionType: 'income' | 'expense' | 'transfer' | 'adjustment' | (string & {});
  date: ISO8601;
}

// Prompt (natural-language) DTOs — mirror server-infra/src/Web/API/PromptAPI.hs.
// PromptRequest { text :: Text, account :: Maybe AccountId }.
export interface PromptRequest {
  text: string;
  account?: UUID;
}

// One failed transaction in the response envelope: { index, reason }.
// `index` is the zero-based position in the parsed list.
export interface PromptFailure {
  index: number;
  reason: string;
}

// Kind-tagged success envelope from POST /api/prompt. Named `PromptResponse` to
// mirror the backend wire type (the backend's internal `PromptResult` domain
// type is a different thing). `succeeded` are full transactions; `failed` are
// commit-good/report-bad entries.
export interface PromptResponse {
  kind: 'transactions';
  succeeded: TransactionResponse[];
  failed: PromptFailure[];
}

// --- API errors ---

export interface ApiErrorShape {
  status: number;
  code?: string;
  message: string;
  fieldErrors?: Record<string, string>;
}
