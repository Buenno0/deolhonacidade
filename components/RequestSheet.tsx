"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { photoUrl, thumbUrl } from "@/lib/media";
import { timeAgo, timeLeftShort, type PostFeature, type RequestProperties } from "@/lib/posts";
import Sheet from "./Sheet";
import { Button } from "./ui";
import { CameraIcon, FlagIcon } from "./ui/icons";
import { useDragScroll } from "@/lib/useDragScroll";

type Props = {
  request: RequestProperties;
  answers: PostFeature[];
  loggedIn: boolean;
  onClose: () => void;
  onAnswer: () => void;
  onOpenAnswer: (postId: string) => void;
  onNeedLogin: () => void;
};

// Um pedido "Alguém aí?": a pergunta, as fotos que já responderam e o botão
// para responder. Só quem está a até 1 km consegue (o banco confere).
export default function RequestSheet({ request, answers, loggedIn, onClose, onAnswer, onOpenAnswer, onNeedLogin }: Props) {
  const faixa = useDragScroll();
  const [reported, setReported] = useState(false);

  async function report() {
    if (!loggedIn) return onNeedLogin();
    const { error } = await getSupabase().rpc("report_request", { p_id: request.id });
    if (!error) setReported(true);
  }

  return (
    <Sheet eyebrow={`Alguém aí? · fecha em ${timeLeftShort(request.expires_at)}`} title={request.question} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="rotulo">Perguntado {timeAgo(request.created_at)}</p>

        {answers.length > 0 ? (
          <div>
            <p className="rotulo mb-2">
              {answers.length} {answers.length === 1 ? "resposta" : "respostas"}
            </p>
            <div ref={faixa} className="no-scrollbar flex select-none gap-2 overflow-x-auto">
              {answers.map((f) => (
                <button
                  key={f.properties.id}
                  onClick={() => onOpenAnswer(f.properties.id)}
                  className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-line bg-elev"
                  aria-label={`Ver resposta de ${timeAgo(f.properties.created_at)}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbUrl(f.properties.photo_path)}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.dataset.fallback) {
                        img.dataset.fallback = "1";
                        img.src = photoUrl(f.properties.photo_path);
                      }
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Ninguém respondeu ainda. Se você está por perto, mande uma foto.</p>
        )}

        <Button size="lg" onClick={loggedIn ? onAnswer : onNeedLogin} className="w-full">
          <CameraIcon /> Responder com foto
        </Button>
        <Button variant="perigo" onClick={report} disabled={reported} className="self-end px-3 py-1.5 text-xs">
          <FlagIcon /> {reported ? "Denúncia enviada" : "Denunciar pergunta"}
        </Button>
      </div>
    </Sheet>
  );
}
