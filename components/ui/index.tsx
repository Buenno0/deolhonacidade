// Receitas do design system (DESIGN.md §5) como componentes. Se um componente
// novo precisa de sombra para se separar do fundo, ele devia ser uma borda.
import type { ButtonHTMLAttributes, ReactNode } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "primario" | "secundario" | "fantasma" | "perigo";

const VARIANTS: Record<Variant, string> = {
  primario: "bg-accent text-accent-ink font-semibold hover:opacity-90",
  secundario: "border border-line bg-surface text-ink font-medium hover:bg-elev",
  fantasma: "text-muted hover:text-ink hover:bg-elev",
  perigo: "text-danger hover:bg-elev",
};

export function Button({
  variant = "primario",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "md" | "lg" }) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg transition active:translate-y-px disabled:opacity-50 disabled:pointer-events-none",
        size === "lg" ? "px-5 py-3 text-base" : "px-4 py-2 text-sm",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}

export function IconButton({ label, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cx(
        "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-muted transition hover:text-ink active:translate-y-px",
        className,
      )}
      {...props}
    />
  );
}

export function Chip({
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      aria-pressed={active}
      className={cx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition",
        active ? "border-accent bg-accent text-accent-ink font-medium" : "border-line bg-surface text-muted hover:text-ink",
        className,
      )}
      {...props}
    />
  );
}

// Carregando: o disco da lua minguando, a mesma lua do NAS no lugar do spinner.
export function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="1.25em" height="1.25em" className={cx("animate-spin", className)} aria-label="Carregando">
      <circle cx="12" cy="12" r="9" fill="none" stroke="var(--line)" strokeWidth="2" />
      <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface px-6 py-5 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      {children && <p className="text-sm text-muted">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export { cx };
