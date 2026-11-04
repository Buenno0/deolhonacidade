"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { CATEGORIES, severityVar } from "@/lib/categories";
import { photoUrl } from "@/lib/media";
import { coord, dateTime, fmt, mapsUrl, trust, type AgencyEventSheet } from "@/lib/agency/types";
import { Button, EmptyState, Spinner } from "@/components/ui";

// A ficha da ocorrência: o documento que sai daqui para fora. É uma página de
// impressão, não uma tela: "Gerar PDF" chama a impressão do navegador, que
// salva em PDF sem depender de biblioteca nenhuma.
//
// O que ela precisa declarar, porque vira peça de processo: de onde veio a
// foto, que ela foi alterada (desfoque de rosto e placa) e por quê, se alguém
// que estava perto confirmou, e até quando o município guarda o original.
export default function Ficha() {
  const supabase = getSupabase();
  const { id } = useParams<{ id: string }>();
  const [sheet, setSheet] = useState<AgencyEventSheet | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.rpc("agency_event", { p_id: id }).then(({ data, error }) => {
      if (error) setError(error.message);
      else setSheet(data as AgencyEventSheet);
    });
  }, [supabase, id]);

  if (error)
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState title="Ocorrência não encontrada" action={<Link href="/defesa-civil/registro" className="text-accent underline">voltar ao registro</Link>}>
          {error}
        </EmptyState>
      </main>
    );
  if (!sheet)
    return (
      <main className="mx-auto flex max-w-2xl justify-center px-4 py-24">
        <Spinner />
      </main>
    );

  const { event: e, city, issued_by } = sheet;
  const cat = CATEGORIES[e.category];
  const t = trust(e);
  const blurred = e.faces_blurred + e.plates_blurred;

  const rows: [string, React.ReactNode][] = [
    ["Natureza", cat.label],
    ["Registrada em", dateTime(e.created_at)],
    [
      "Local",
      <a key="l" href={mapsUrl(e.lat, e.lng)} target="_blank" rel="noreferrer" className="font-mono underline">
        {coord(e.lat, e.lng)}
      </a>,
    ],
    ["Descrição do registrante", e.caption || "sem descrição"],
    [
      "Verificação da vizinhança",
      `${t.label} · ${fmt(e.confirm_count)} confirmaram, ${fmt(e.deny_count)} contestaram`,
    ],
    ["Situação", e.live ? "em curso no momento da emissão" : "encerrada"],
    [
      "Tratamento da imagem",
      blurred
        ? `${fmt(blurred)} área(s) desfocada(s): ${fmt(e.faces_blurred)} rosto(s) e ${fmt(e.plates_blurred)} placa(s)`
        : "nenhum rosto ou placa detectado; imagem sem desfoque",
    ],
    ["Checagem automática", e.checked_by ?? "não informada"],
    ["Alcance público", `${fmt(e.view_count)} visualizações, ${fmt(e.share_count)} compartilhamentos`],
    ["Guarda da evidência", e.agency_until ? `até ${dateTime(e.agency_until)}` : "não retida pelo município"],
    ["Identificador", <span key="i" className="font-mono text-xs">{e.id}</span>],
  ];

  return (
    <main className="ficha mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="ficha-oculta mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/defesa-civil/registro" className="rotulo text-accent">
          ← registro
        </Link>
        <Button onClick={() => window.print()}>Gerar PDF</Button>
      </div>

      <header className="border-b border-line pb-4">
        <p className="rotulo">
          {issued_by.agency} · {city.name}/{city.uf}
        </p>
        <h1 className="font-display text-2xl font-bold">Ficha de ocorrência</h1>
        <p className="mt-1 text-sm text-muted">
          Emitida em {dateTime(issued_by.at)} a partir do registro colaborativo Viu na Cidade.
        </p>
      </header>

      <figure className="mt-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl(e.photo_path)}
          alt={`Foto da ocorrência de ${cat.label}`}
          className="w-full rounded-xl border-4 object-contain"
          style={{ borderColor: severityVar(e.category), maxHeight: 460 }}
        />
        <figcaption className="mt-2 text-xs text-muted">
          Foto feita no local pela câmera do aparelho, sem envio de arquivo da galeria. A localização vem do GPS no
          momento do registro, não de digitação.
        </figcaption>
      </figure>

      <table className="mt-6 w-full text-sm">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-t border-line align-top">
              <th scope="row" className="w-48 py-2 pr-4 text-left font-medium text-muted">
                {label}
              </th>
              <td className="py-2">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer className="mt-6 border-t border-line pt-4 text-xs text-muted">
        <p>
          Registro feito por morador, de forma anônima, e exibido publicamente por até {" "}
          {Math.round((new Date(e.expires_at).getTime() - new Date(e.created_at).getTime()) / 3_600_000)} horas no mapa
          da cidade. A imagem passou por checagem automática antes de ficar visível, e rostos e placas de veículo são
          desfocados no servidor antes de qualquer pessoa ver a foto.
        </p>
        <p className="mt-2">
          Este documento não substitui vistoria técnica. A confirmação da vizinhança indica que outras pessoas no raio de
          1 km declararam que a situação persistia, e não constitui laudo.
        </p>
      </footer>
    </main>
  );
}
