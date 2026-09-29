// Selo de fase: o app está em beta. Contorno em acento, sem animação.
export default function BetaTag() {
  return (
    <span className="rotulo inline-flex h-[18px] items-center rounded-full border border-accent px-1.5 text-[9px] leading-none text-accent">
      Beta
    </span>
  );
}
