"use client";

import { useEffect, useRef, useState } from "react";
import { CITY } from "@/lib/city";
import { dateTime } from "@/lib/agency/types";
import Sheet from "@/components/Sheet";
import { Button } from "@/components/ui";

const SUGESTAO = `Defesa Civil de ${CITY.name}`;
const MAX = 80;

// Dar o crachá de órgão a uma conta.
//
// O nome digitado aqui é o único campo do app que vira documento impresso: ele
// assina o rodapé de toda ficha em PDF que essa conta emitir. Por isso o sheet
// mostra a prévia do rodapé real em vez de explicar isso por escrito — a mesma
// regra do resto do app, onde o anel que esvazia diz o tempo sem dizer "resta".
//
// Tirar o crachá não passa por aqui: é destrutivo e continua no confirm.
export default function AgentSheet({
  email,
  onClose,
  onConfirm,
}: {
  email: string | null;
  onClose: () => void;
  onConfirm: (nome: string) => void;
}) {
  const [nome, setNome] = useState(SUGESTAO);
  const [erro, setErro] = useState<string | null>(null);
  const campo = useRef<HTMLInputElement>(null);
  // A hora congela na abertura: a prévia não pode ficar piscando enquanto a
  // pessoa digita
  const [agora] = useState(() => new Date().toISOString());

  useEffect(() => campo.current?.select(), []);

  const limpo = nome.trim();

  function confirmar() {
    if (limpo.length < 3) {
      setErro("Escreva o nome do órgão, com pelo menos 3 letras.");
      return campo.current?.focus();
    }
    onConfirm(limpo);
  }

  return (
    <Sheet
      eyebrow="crachá de órgão"
      title="Dar acesso à sala de situação"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="fantasma" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={confirmar}>Dar acesso</Button>
        </div>
      }
    >
      {/* A prévia: o rodapé da ficha, montado igual ao de app/defesa-civil/evento */}
      <div className="rounded-xl border border-line bg-elev p-4">
        <p className="rotulo mb-2">prévia do rodapé da ficha</p>
        <p className="text-sm leading-relaxed">
          <span className="border-b-2 border-accent">{limpo || "—"}</span> · {CITY.name}/{CITY.uf}
        </p>
        <p className="mt-1 text-xs text-muted">Emitida em {dateTime(agora)} a partir do registro colaborativo Viu na Cidade.</p>
      </div>

      <label className="mt-4 block">
        <span className="rotulo">nome do órgão</span>
        <input
          ref={campo}
          value={nome}
          onChange={(e) => {
            setNome(e.target.value);
            if (erro) setErro(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && confirmar()}
          maxLength={MAX}
          autoComplete="off"
          aria-invalid={erro ? true : undefined}
          className="mt-1 w-full rounded-lg border border-line bg-elev px-3 py-2 text-sm outline-none focus-visible:border-accent"
        />
      </label>
      {erro && <p className="mt-1.5 text-sm text-danger">{erro}</p>}

      <p className="mt-4 text-sm text-muted">
        {email ?? "Esta conta"} passa a ver ocorrência, foto e coordenada de {CITY.name}. Não vê conta, e-mail, custo nem
        moderação, e cada ficha que abrir fica no registro.
      </p>
    </Sheet>
  );
}
