import type { ReactNode } from "react";
import { cx } from "@/components/ui";

// Um número do painel: rótulo, valor e uma linha de contexto
export default function Stat({
  label,
  value,
  hint,
  tone,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "danger" | "warn" | "ok";
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-1 rounded-xl border border-line bg-surface p-3", className)}>
      <p className="rotulo">{label}</p>
      <p
        className={cx(
          "font-display text-2xl font-semibold leading-none",
          tone === "danger" && "text-danger",
          tone === "warn" && "text-warn",
          tone === "ok" && "text-ok",
        )}
      >
        {value}
      </p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
