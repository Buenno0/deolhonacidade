import Link from "next/link";

export const metadata = { title: "Termos de uso · De Olho na Cidade" };

// Rascunho. Precisa de revisão jurídica antes de abrir ao público.
export default function Termos() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 leading-relaxed">
      <Link href="/" className="text-sm text-blue-600">← Voltar ao mapa</Link>
      <h1 className="mt-4 text-2xl font-bold">Termos de uso (rascunho)</h1>
      <ul className="mt-4 list-disc space-y-2 pl-5">
        <li>Os posts aparecem no mapa sem o seu nome e saem do ar 12 horas depois de publicados.</li>
        <li>
          Para cumprir o Marco Civil da Internet (Lei 12.965/2014, art. 15), guardamos de forma privada, por 6 meses,
          registros de acesso (IP, data e hora) e os dados do post, sem a foto. Eles só são entregues mediante ordem judicial.
        </li>
        <li>É proibido postar conteúdo ilegal, violento, sexual, discriminatório, que exponha a intimidade de alguém ou que seja falso.</li>
        <li>Evite fotos em que pessoas ou placas de veículos possam ser identificadas.</li>
        <li>Posts denunciados por várias pessoas saem do ar automaticamente, e contas que abusam podem ser suspensas.</li>
        <li>Você pode pedir a exclusão da sua conta a qualquer momento (LGPD).</li>
      </ul>
    </main>
  );
}
