import Link from "next/link";
import Mark from "@/components/ui/Mark";

export const metadata = { title: "Termos de uso · De Olho na Cidade" };

// Rascunho. Precisa de revisão jurídica antes de abrir ao público.
export default function Termos() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/" className="rotulo text-accent">
        ← voltar ao mapa
      </Link>
      <div className="mt-6 flex items-center gap-3">
        <Mark size={36} />
        <div>
          <p className="rotulo">rascunho</p>
          <h1 className="font-display text-2xl font-bold">Termos de uso</h1>
        </div>
      </div>
      <ul className="mt-6 space-y-3 rounded-xl border border-line bg-surface p-5 text-sm leading-relaxed">
        <li>Os posts aparecem no mapa sem o seu nome e saem do ar 12 horas depois de publicados.</li>
        <li>
          Para cumprir o Marco Civil da Internet (Lei 12.965/2014, art. 15), guardamos de forma privada, por 6 meses,
          registros de acesso (IP, data e hora) e os dados do post, sem a foto. Eles só são entregues mediante ordem judicial.
        </li>
        <li>As fotos passam por uma verificação automática de conteúdo impróprio antes de aparecer no mapa.</li>
        <li>
          Quem está a até 1 km pode confirmar se algo ainda está acontecendo. Para isso usamos sua localização naquele
          momento, que não fica guardada junto com o voto.
        </li>
        <li>
          Se você ligar os alertas, guardamos o ponto, o raio e as categorias que escolheu para avisar este aparelho. Você
          pode desligar a qualquer momento.
        </li>
        <li>
          O mapa de calor dos últimos dias usa os registros de forma agregada e anônima, em áreas de cerca de 150 m, e só
          mostra lugares com pelo menos 3 registros.
        </li>
        <li>É proibido postar conteúdo ilegal, violento, sexual, discriminatório, que exponha a intimidade de alguém ou que seja falso.</li>
        <li>Evite fotos em que pessoas ou placas de veículos possam ser identificadas.</li>
        <li>Posts denunciados por várias pessoas saem do ar automaticamente, e contas que abusam podem ser suspensas.</li>
        <li>Você pode pedir a exclusão da sua conta a qualquer momento (LGPD).</li>
      </ul>
    </main>
  );
}
