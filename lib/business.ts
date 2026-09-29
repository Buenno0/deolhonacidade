// Estabelecimento: o comerciante verificado que pode publicar divulgação.
export type BusinessStatus = "pending" | "approved" | "rejected" | "suspended";

export type Business = {
  id: string;
  name: string;
  segment: string | null;
  address: string;
  lat: number;
  lng: number;
  whatsapp: string | null;
  instagram: string | null;
  status: BusinessStatus;
  review_note: string | null;
  last_post_at: string | null;
  created_at: string;
};

export const BUSINESS_STATUS: Record<BusinessStatus, { label: string; tone: string }> = {
  pending: { label: "em análise", tone: "text-warn" },
  approved: { label: "verificado", tone: "text-ok" },
  rejected: { label: "recusado", tone: "text-danger" },
  suspended: { label: "suspenso", tone: "text-danger" },
};

// Até 150 m do endereço cadastrado (espelha create_post)
export const BUSINESS_RADIUS_M = 150;
