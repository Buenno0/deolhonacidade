// Formas das respostas das RPCs do painel (supabase/migrations/…_painel_admin.sql)
import type { BusinessStatus } from "@/lib/business";
import type { Category } from "@/lib/categories";

export type DayPoint = { day: string; signups: number; posts: number; active: number; votes: number; requests: number };

export type Overview = {
  days: number;
  series: DayPoint[];
  totals: {
    users: number;
    users_new_7d: number;
    users_new_period: number;
    banned: number;
    admins: number;
    no_terms: number;
    live_now: number;
    posts_period: number;
    posts_all: number;
    in_history: number;
    requests_open: number;
    push: number;
    businesses: Partial<Record<BusinessStatus, number>>;
  };
  active: { d1: number; d7: number; d30: number };
  by_category: { category: Category; n: number }[];
  by_hour: number[];
  moderation: {
    finalized: number;
    auto_rejected: number;
    hidden_by_admin: number;
    bans: number;
    post_reports: number;
    request_reports: number;
  };
  engagement: { views: number; shares: number; confirms: number; denies: number };
  requests: { total: number; answered: number };
  top: { id: string; nickname: string | null; email: string | null; xp: number; level: number }[];
};

export type Counts = { posts: number; requests: number; businesses: number };

export type AdminUserRow = {
  id: string;
  email: string | null;
  provider: string;
  created_at: string;
  last_sign_in_at: string | null;
  nickname: string | null;
  xp: number;
  level: number;
  streak_days: number;
  is_admin: boolean;
  banned_at: string | null;
  accepted_terms_at: string | null;
  posts: number;
  reports_received: number;
  requests: number;
  business_status: BusinessStatus | null;
};

export type LogEntry = {
  id: number;
  action: string;
  post_id: string | null;
  user_id: string | null;
  target_user: string | null;
  ip: string | null;
  user_agent?: string | null;
  created_at: string;
  user_email?: string | null;
  target_email?: string | null;
};

export type AdminUserDetail = {
  user: AdminUserRow & { show_nickname: boolean; streak_last: string | null; votes: number; reports_made: number; push: number };
  badges: { badge: string; tier: 1 | 2 | 3; earned_at: string }[];
  posts: {
    id: string;
    status: "pending" | "published" | "hidden" | "expired";
    category: Category;
    caption: string | null;
    photo_path: string | null;
    created_at: string;
    expires_at: string;
    report_count: number;
    confirm_count: number;
    deny_count: number;
    view_count: number;
    share_count: number;
    keep_history: boolean;
    archived_until: string | null;
    is_business: boolean;
    auto_rejected: boolean;
  }[];
  requests: { id: string; status: "open" | "hidden" | "expired"; question: string; created_at: string; answer_count: number; report_count: number }[];
  business: { name: string; status: BusinessStatus; address: string } | null;
  logs: LogEntry[];
};

// Nome legível de cada ação do registro
export const ACTION_LABELS: Record<string, string> = {
  create_post: "postou",
  delete_post: "apagou um post",
  report_post: "denunciou um post",
  confirm_post: "confirmou um post",
  deny_post: "disse que acabou",
  create_request: "pediu uma foto",
  report_request: "denunciou uma pergunta",
  request_business: "pediu estabelecimento",
  remove_from_history: "tirou do histórico",
  delete_account: "excluiu a conta",
  admin_hide_post: "escondeu um post",
  admin_restore_post: "restaurou um post",
  admin_hide_request: "escondeu uma pergunta",
  admin_restore_request: "restaurou uma pergunta",
  admin_remove_from_history: "tirou do histórico (moderação)",
  admin_ban: "baniu",
  admin_unban: "desbaniu",
  admin_grant: "deu moderação a",
  admin_revoke: "tirou a moderação de",
  admin_view_user: "abriu a ficha de",
  admin_export_users: "exportou a lista de usuários",
  admin_business_approved: "aprovou um estabelecimento",
  admin_business_rejected: "recusou um estabelecimento",
  admin_business_suspended: "suspendeu um estabelecimento",
};

export const actionLabel = (a: string) => ACTION_LABELS[a] ?? a;

export const PROVIDER_LABEL: Record<string, string> = { google: "Google", email: "código por e-mail" };

const nf = new Intl.NumberFormat("pt-BR");
export const fmt = (n: number) => nf.format(n);
export const plural = (n: number, one: string, many: string) => `${nf.format(n)} ${n === 1 ? one : many}`;
export const pct = (part: number, total: number) => (total ? `${Math.round((part / total) * 100)}%` : "—");

const df = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const dd = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });
export const dateTime = (iso: string | null) => (iso ? df.format(new Date(iso)) : "—");
export const dateOnly = (iso: string | null) => (iso ? dd.format(new Date(iso)) : "—");
