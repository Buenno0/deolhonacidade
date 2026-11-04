# Viu na Cidade

**[viunacidade.com.br](https://viunacidade.com.br)**

Um mapa da sua cidade com o que está acontecendo **agora** — em fotos de quem
está lá. Alagou a rua? Caiu uma árvore? A fila do posto está dobrando a
esquina? Alguém tira uma foto, e ela aparece no mapa no ponto exato.

Tudo some em até 12 horas. É o que está acontecendo agora, não um arquivo do
que já aconteceu.

Abra no celular e instale na tela inicial — é um app web, não precisa de loja.

> Cidade piloto: **Itapetininga/SP**. O repositório ainda se chama
> `deolhonacidade`, nome antigo do projeto.

## Por que isso existe

Hoje, quando algo acontece na cidade, a informação circula em grupo de WhatsApp:
chega torta, atrasada, sem saber se ainda vale e sem dizer onde foi. O Viu na
Cidade resolve isso com três regras simples:

1. **Foto tirada na hora** — nada de print, meme ou foto antiga.
2. **No ponto certo do mapa** — a localização vem do celular, não do dedo.
3. **Com prazo de validade** — trânsito some em 2h, acidente em 3h, alagamento
   em 6h, o resto em 12h.

Não tem feed infinito, não tem comentário, não tem curtida. Tem a cidade agora.

## O que dá para fazer

**Postar.** A câmera abre direto. Você escolhe a categoria, escreve uma legenda
curta e pronto — está no mapa.

**Dizer se ainda está rolando.** Quem está a até 1 km de um post responde
"ainda está?". Confirmação mantém a foto no ar; três pessoas dizendo que acabou
tiram do mapa. A informação se corrige sozinha.

**Perguntar.** Marque um ponto e pergunte "alguém aí?". Quem estiver perto pode
responder com uma foto. O pedido fica aberto por 2 horas.

**Ser avisado.** Escolha as categorias que te interessam e um raio de 500 m a
3 km em volta de onde você mora ou trabalha. O celular avisa quando algo
acontece ali.

**Compartilhar no WhatsApp.** Todo post tem um link próprio, com prévia da foto
e quanto tempo ainda resta.

**Ver os padrões.** O mapa de calor mostra onde as coisas se repetem — hoje e
nos últimos 30 dias. A aba de tendências lista o que está em alta na cidade.

**Ganhar pontos por ajudar.** Quem posta coisa útil, responde pedido rápido ou
ajuda a derrubar post falso ganha XP, sobe de nível (de "Curioso" a "Lenda de
Itapetininga") e junta conquistas. Postar por postar vale pouco; ajudar vale
mais.

**Pedir o app para a sua cidade.** Quem abre de fora da área atendida vê a
cidade mais próxima e pode registrar interesse.

## Para a Defesa Civil

Órgãos conveniados têm uma porta separada, em `/defesa-civil`. Ela mostra só
ocorrência (alagamento, acidente, falta de energia, obra, trânsito e
segurança), só do município do convênio, e nada de conta ou autor.

**Agora.** O que está no ar neste minuto, no mapa e em lista, com a hora de
chegada e se alguém que estava perto confirmou.

**Pedir olhos num ponto.** O agente marca um lugar no mapa e quem estiver a
até 1 km responde com uma foto. Em vez de mandar viatura para saber se a água
subiu, pergunta.

**Registro.** A lista do período, com coordenada e confirmação, que sai em CSV.
Cada ocorrência tem uma ficha pronta para virar PDF, que declara de onde veio a
foto e o que foi desfocado nela.

**Recorrência.** Os trechos de ~110 m onde o mesmo problema voltou, para
priorizar obra e alimentar o Plano Diretor.

Quem dá o crachá é a moderação, na ficha do usuário. O agente não vê moderação,
custo, e-mail nem conta, e cada ficha que ele abre fica no registro de acesso.

## Sobre a sua privacidade

- **Ninguém sabe quem postou.** As fotos aparecem sem nome. Um apelido público
  é opcional.
- **A foto não carrega seus dados.** Antes de sair do celular, ela é recomprimida
  e perde todas as informações escondidas do arquivo (inclusive onde e quando
  foi tirada pelo aparelho).
- **A foto não fica guardada.** Quando o post expira, a imagem é apagada de
  verdade.
- **Rosto e placa saem borrados.** Antes de a foto aparecer para alguém, o
  servidor acha os rostos e as placas de veículo e desfoca cada um, só naquele
  pedaço.
- **Nada entra sem passar por revisão.** Toda foto é checada automaticamente
  antes de aparecer no mapa: nudez, violência gráfica, ódio, propaganda, golpe,
  print, meme e exposição de dados de alguém são barrados. Além disso, qualquer
  pessoa pode denunciar, e três denúncias escondem o post na hora.
- **Você manda na sua conta.** Dá para apagar qualquer post seu e excluir a
  conta inteira a qualquer momento, como manda a LGPD.

## Como é por dentro (resumo)

Um app web que funciona como aplicativo no celular (dá para instalar na tela
inicial, sem loja), um banco de dados com as regras da cidade e as fotos
guardadas por pouco tempo. Nada roda no celular que o servidor não confira
depois — não dá para pular a moderação ou postar fora da cidade.

Para quem vai mexer no código:

| o quê | onde |
|---|---|
| Rodar na sua máquina, arquitetura, AWS, estrutura de pastas | [docs/tecnico.md](docs/tecnico.md) |
| Colocar no ar (Supabase, Vercel, AWS) | [DEPLOY.md](DEPLOY.md) |
| Cores, tipografia, o visual do mapa e dos pins | [DESIGN.md](DESIGN.md) |

Em uma linha: Next.js + MapLibre no navegador, Supabase (Postgres com PostGIS)
no servidor e AWS opcional para fotos, moderação e e-mail.

## O que ainda falta

- Revisão jurídica dos termos de uso antes de abrir ao público
- Tirar a foto escondida do cache do CDN na hora da denúncia (hoje leva até 10 min)
- Ofertas do comércio local
- Ligar a guarda da evidência para o município: a sala de situação da Defesa
  Civil já existe (`/defesa-civil`), mas só mostra o que está no ar. Guardar a
  foto vencida como registro do município exige acertar antes os termos de uso
  e a página de privacidade, que hoje prometem o apagamento
