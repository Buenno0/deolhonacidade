// Ícones inline na mesma assinatura do NAS: viewBox 24, traço 1.8, pontas e
// junções redondas, 1.25em, cor herdada. Para adicionar, use <Icon>; nunca
// cole SVG de biblioteca com outro traço.
import type { ReactNode, SVGProps } from "react";
import type { Category } from "@/lib/categories";

type P = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: P & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1.25em"
      height="1.25em"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const CameraIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="13.5" r="3.5" />
  </Icon>
);
export const LocateIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </Icon>
);
export const SunIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
);
export const MoonIcon = (p: P) => (
  <Icon {...p}>
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
  </Icon>
);
export const CloseIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);
export const FlagIcon = (p: P) => (
  <Icon {...p}>
    <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
  </Icon>
);
export const ClockIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);
export const PinIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Icon>
);
export const AlertIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 3 2 20h20L12 3z" />
    <path d="M12 10v4M12 17h.01" />
  </Icon>
);
export const LayersIcon = (p: P) => (
  <Icon {...p}>
    <path d="m12 3 9 5-9 5-9-5 9-5z" />
    <path d="m3 13 9 5 9-5" />
  </Icon>
);
export const ShareIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 3v12M7 8l5-5 5 5" />
    <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </Icon>
);
export const CheckIcon = (p: P) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);
export const LinkIcon = (p: P) => (
  <Icon {...p}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </Icon>
);
export const ChatIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 20l1.4-4.2A8 8 0 1 1 8.2 18.6L4 20z" />
  </Icon>
);
export const BellIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </Icon>
);
export const QuestionIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 5h16v11H9l-5 4V5z" />
    <path d="M10 9a2 2 0 1 1 2.8 1.8c-.5.3-.8.7-.8 1.2M12 14h.01" />
  </Icon>
);
export const FlameIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 21c-4 0-7-2.8-7-6.5 0-3 2-5 3.5-6.5.4 1.6 1.2 2.6 2.3 3C10.3 8 11.5 5 14 3c0 3 5 5.5 5 11.5 0 3.7-3 6.5-7 6.5z" />
    <path d="M12 21c-1.7 0-3-1.2-3-2.8 0-1.8 1.6-2.8 3-4.2 1.4 1.4 3 2.4 3 4.2 0 1.6-1.3 2.8-3 2.8z" />
  </Icon>
);
export const EyeIcon = (p: P) => (
  <Icon {...p}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);
export const TrendIcon = (p: P) => (
  <Icon {...p}>
    <path d="m3 17 6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </Icon>
);
export const MapIcon = (p: P) => (
  <Icon {...p}>
    <path d="m9 4-6 2.5v13L9 17l6 3 6-2.5v-13L15 7 9 4z" />
    <path d="M9 4v13M15 7v13" />
  </Icon>
);
export const UserIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </Icon>
);
export const ChevronIcon = (p: P) => (
  <Icon {...p}>
    <path d="m9 6 6 6-6 6" />
  </Icon>
);

// Um ícone por categoria, no mesmo traço
const CATEGORY_PATHS: Record<Category, ReactNode> = {
  transito: (
    <>
      <path d="M5 16V11l2-5h10l2 5v5" />
      <path d="M3 16h18v2H3zM7 18v2M17 18v2" />
      <circle cx="8" cy="13" r=".8" />
      <circle cx="16" cy="13" r=".8" />
    </>
  ),
  alagamento: (
    <>
      <path d="M2 16c2 0 2-1.5 4-1.5S8 16 10 16s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5" />
      <path d="M2 20c2 0 2-1.5 4-1.5S8 20 10 20s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5" />
      <path d="M12 3s-4 4.5-4 7a4 4 0 0 0 8 0c0-2.5-4-7-4-7z" />
    </>
  ),
  acidente: (
    <>
      <path d="M12 3 2 20h20L12 3z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  evento: (
    <>
      <path d="M4 20 9 7l8 8-13 5z" />
      <path d="M14 4v2M19 9h2M17.5 5.5 16 7M20 13l-1.5-.5" />
    </>
  ),
  seguranca: (
    <>
      <path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3z" />
      <path d="M12 8v5M12 16h.01" />
    </>
  ),
  falta_energia: (
    <>
      <path d="M13 2 5 14h6l-1 8 8-12h-6l1-8z" />
    </>
  ),
  obra: (
    <>
      <path d="M3 20h18M5 20l3-12h8l3 12" />
      <path d="M7 14h10M6.5 17h11" />
    </>
  ),
  outro: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="8" cy="12" r=".8" />
      <circle cx="12" cy="12" r=".8" />
      <circle cx="16" cy="12" r=".8" />
    </>
  ),
};

export const CategoryIcon = ({ category, ...p }: P & { category: Category }) => (
  <Icon {...p}>{CATEGORY_PATHS[category]}</Icon>
);
