import "server-only";
import { DetectModerationLabelsCommand, RekognitionClient } from "@aws-sdk/client-rekognition";
import { readBytes, s3Key, storageProvider } from "./storage";

// MODERATION_PROVIDER=none (padrão, local) ou rekognition.
// Rekognition recusa nudez explícita, violência gráfica e afins. O resto
// (spam, foto falsa) continua com as denúncias.
const provider = process.env.MODERATION_PROVIDER ?? "none";
const MIN_CONFIDENCE = Number(process.env.MODERATION_MIN_CONFIDENCE ?? 80);
// Categorias de nível 1 do Rekognition que bloqueiam o post
const BLOCKED = new Set(["Explicit", "Explicit Nudity", "Violence", "Visually Disturbing", "Hate Symbols"]);

export type ModerationResult = { approved: boolean; provider: string; labels: { name: string; parent?: string; confidence: number }[] };

let rk: RekognitionClient | undefined;

export async function moderate(photoPath: string): Promise<ModerationResult> {
  if (provider !== "rekognition") return { approved: true, provider, labels: [] };

  rk ??= new RekognitionClient({ region: process.env.AWS_REGION ?? "us-east-1" });
  const Image =
    storageProvider === "s3"
      ? { S3Object: { Bucket: process.env.S3_BUCKET!, Name: s3Key(photoPath) } }
      : { Bytes: await readBytes(photoPath) };
  const out = await rk.send(new DetectModerationLabelsCommand({ Image, MinConfidence: MIN_CONFIDENCE }));
  const labels = (out.ModerationLabels ?? []).map((l) => ({
    name: l.Name ?? "",
    parent: l.ParentName || undefined,
    confidence: Math.round(l.Confidence ?? 0),
  }));
  const approved = !labels.some((l) => BLOCKED.has(l.parent || l.name) || BLOCKED.has(l.name));
  return { approved, provider, labels };
}
