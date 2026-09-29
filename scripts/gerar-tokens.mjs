// Gera app/tokens.css a partir de design/tokens.mjs. Roda no predev/prebuild;
// o arquivo gerado também vai para o git, para o projeto abrir sem rodar nada.
import { writeFileSync } from "node:fs";
import { kebab, salaEscura, tema } from "../design/tokens.mjs";

const bloco = (seletor, cores, chaves = Object.keys(cores)) =>
  `${seletor} {\n${chaves.map((k) => `  --${kebab(k)}: ${cores[k]};`).join("\n")}\n}`;

const css = `/* GERADO por scripts/gerar-tokens.mjs a partir de design/tokens.mjs.
   Não edite aqui: mude lá e rode \`npm run tokens\`. */

${bloco(":root,\n.dark", tema.escuro)}

${bloco(".light", tema.claro)}

${bloco(".sala-escura", tema.escuro, salaEscura)}
`;

writeFileSync(new URL("../app/tokens.css", import.meta.url), css);
