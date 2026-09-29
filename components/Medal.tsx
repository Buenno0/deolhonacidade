import type { Icon } from "@/lib/progress";
import { TIER_COLOR } from "@/lib/progress";
import {
  CameraIcon,
  ChatIcon,
  CheckIcon,
  ClockIcon,
  EyeIcon,
  FlagIcon,
  FlameIcon,
  MoonIcon,
  QuestionIcon,
  ShareIcon,
  TrendIcon,
} from "./ui/icons";
import { cx } from "./ui";

const ICONS: Record<Icon, typeof CameraIcon> = {
  camera: CameraIcon,
  check: CheckIcon,
  clock: ClockIcon,
  moon: MoonIcon,
  flag: FlagIcon,
  trend: TrendIcon,
  flame: FlameIcon,
  eye: EyeIcon,
  question: QuestionIcon,
  share: ShareIcon,
  chat: ChatIcon,
};

type Props = {
  icon?: Icon;
  label?: string; // no lugar do ícone (ex.: o número do nível)
  tier?: 1 | 2 | 3;
  locked?: boolean;
  size?: number;
  animate?: boolean;
  className?: string;
};

// A medalha: o anel do pin (o mesmo que conta o tempo) fechado em volta da
// conquista. Sempre na sala escura, para as três cores lerem igual nos temas.
export default function Medal({ icon, label, tier = 3, locked, size = 64, animate, className }: Props) {
  const Glyph = icon ? ICONS[icon] : null;
  const color = locked ? "var(--line)" : TIER_COLOR[tier - 1];
  return (
    <span className={cx("sala-escura relative inline-grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} className="absolute inset-0" aria-hidden="true">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#40372b" strokeWidth="6" />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100"
          strokeDashoffset={animate ? 100 : 0}
          transform="rotate(-90 50 50)"
          className={animate ? "medalha-anel" : undefined}
        />
        <circle cx="50" cy="50" r="35" fill="#211c15" stroke={color} strokeWidth="2" />
      </svg>
      <span className="relative grid place-items-center" style={{ color: locked ? "#6b6154" : color }}>
        {label ? (
          <span className="num font-medium" style={{ fontSize: size * 0.34 }}>
            {label}
          </span>
        ) : Glyph ? (
          <Glyph width={size * 0.38} height={size * 0.38} />
        ) : null}
      </span>
    </span>
  );
}
