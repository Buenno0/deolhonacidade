import Link from "next/link";
import Mark from "@/components/ui/Mark";

export const metadata = { title: "Política de privacidade · Viu na Cidade" };

// Rascunho. Precisa de revisão jurídica antes de abrir ao público.
export default function Privacidade() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/mapa" className="rotulo text-accent">
        ← voltar ao mapa
      </Link>
      <div className="mt-6 flex items-center gap-3">
        <Mark size={36} />
        <div>
          <p className="rotulo">Viu na Cidade</p>
          <h1 className="font-display text-2xl font-bold">Política de privacidade</h1>
        </div>
      </div>
      <div className="mt-6 space-y-5 rounded-xl border border-line bg-surface p-5 text-sm leading-relaxed">
        <p>
          O Viu na Cidade é um mapa de fotos do que está acontecendo agora em Itapetininga/SP. Esta política explica quais
          dados coletamos, para que usamos e como você pode apagá-los, de acordo com a Lei Geral de Proteção de Dados (LGPD,
          Lei 13.709/2018).
        </p>
        <section>
          <h2 className="font-semibold">Login com Google</h2>
          <p className="mt-1">
            Quando você entra com o Google, recebemos o seu <b>endereço de e-mail</b>, o identificador da sua conta Google e
            as informações básicas de perfil (nome e foto), que não exibimos no app. Usamos esses dados só para criar e manter a sua conta, permitir o login e evitar abuso (por exemplo,
            suspender contas que violam os termos). Não pedimos acesso a contatos, Gmail, Drive ou qualquer outro dado da
            sua conta Google, não vendemos nem compartilhamos esses dados com terceiros para publicidade e não usamos esses
            dados para treinar modelos de inteligência artificial. O uso de informações recebidas das APIs do Google segue a{" "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-accent underline underline-offset-2">
              Política de dados do usuário dos serviços de API do Google
            </a>
            , incluindo os requisitos de uso limitado.
          </p>
        </section>
        <section>
          <h2 className="font-semibold">O que coletamos</h2>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Conta: e-mail, data de cadastro e aceite dos termos.</li>
            <li>Posts: a foto, a categoria, o texto opcional e o local. Os posts aparecem no mapa sem o seu nome.</li>
            <li>Localização: usada no momento de postar ou confirmar um registro; não guardamos seu histórico de posições.</li>
            <li>Alertas (opcional): o ponto, o raio e as categorias escolhidos, para avisar o seu aparelho.</li>
            <li>Registros de acesso (IP, data e hora), guardados por 6 meses por exigência do Marco Civil da Internet.</li>
          </ul>
        </section>
        <section>
          <h2 className="font-semibold">Como usamos</h2>
          <p className="mt-1">
            Para mostrar os posts no mapa, enviar os alertas que você pediu, moderar conteúdo e cumprir a lei. As fotos passam
            por uma verificação automática que desfoca rostos e placas de veículos antes de serem publicadas.
          </p>
        </section>
        <section>
          <h2 className="font-semibold">Com quem compartilhamos</h2>
          <p className="mt-1">
            Só com os serviços que fazem o app funcionar: Supabase (banco de dados e login), Vercel (hospedagem) e Amazon Web
            Services (armazenamento das fotos e verificação de imagens). Registros de acesso só são entregues mediante ordem
            judicial.
          </p>
        </section>
        <section>
          <h2 className="font-semibold">Por quanto tempo</h2>
          <p className="mt-1">
            Posts saem do mapa em até 12 horas; os que você guardar no histórico ficam até 30 dias. Registros de acesso, 6
            meses. Os dados da conta ficam até você pedir a exclusão.
          </p>
        </section>
        <section>
          <h2 className="font-semibold">Seus direitos</h2>
          <p className="mt-1">
            Você pode acessar, corrigir ou apagar seus dados e excluir a sua conta a qualquer momento. Para isso, ou para
            qualquer dúvida, escreva para{" "}
            <a href="mailto:contato@viunacidade.com.br" className="text-accent underline underline-offset-2">
              contato@viunacidade.com.br
            </a>
            . Veja também os{" "}
            <Link href="/termos" className="text-accent underline underline-offset-2">
              termos de uso
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
