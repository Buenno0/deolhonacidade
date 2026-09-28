"use client";

import { useState } from "react";
import { getSupabase, photoUrl } from "@/lib/supabase/client";
import { CATEGORIES } from "@/lib/categories";
import { timeAgo, timeLeft, type PostProperties } from "@/lib/posts";
import Sheet from "./Sheet";

type Props = {
  post: PostProperties;
  loggedIn: boolean;
  onClose: () => void;
  onNeedLogin: () => void;
};

export default function PostSheet({ post, loggedIn, onClose, onNeedLogin }: Props) {
  const category = CATEGORIES[post.category];
  const [reportState, setReportState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function report() {
    if (!loggedIn) return onNeedLogin();
    if (!confirm("Denunciar este post como impróprio ou falso?")) return;
    setReportState("sending");
    const { error } = await getSupabase().rpc("report_post", { p_id: post.id });
    if (error) {
      setError(error.message);
      setReportState("idle");
    } else {
      setReportState("done");
    }
  }

  return (
    <Sheet title={`${category.emoji} ${category.label}`} onClose={onClose}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photoUrl(post.photo_path)} alt={post.caption ?? category.label} className="w-full rounded-xl bg-neutral-100 object-cover dark:bg-neutral-800" />
      {post.caption && <p className="mt-3 text-base">{post.caption}</p>}
      <p className="mt-2 text-sm text-neutral-500">
        {timeAgo(post.created_at)} · {timeLeft(post.expires_at)}
      </p>
      <div className="mt-4 flex justify-end">
        <button
          onClick={report}
          disabled={reportState !== "idle"}
          className="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60 dark:hover:bg-red-950"
        >
          {reportState === "done" ? "Denúncia enviada, obrigado" : "Denunciar"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </Sheet>
  );
}
