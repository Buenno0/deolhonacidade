import "server-only";
import {
  DetectFacesCommand,
  DetectModerationLabelsCommand,
  DetectTextCommand,
  RekognitionClient,
  type BoundingBox,
} from "@aws-sdk/client-rekognition";
import { awsCredentials, awsRegion } from "./aws";

// MODERATION_PROVIDER=none (padrão, local) ou rekognition.
// Numa foto, três perguntas em paralelo (cerca de 1 s no total, em vez de 3
// em sequência): é imprópria? onde há rostos? onde há placas?
// A foto vai nos bytes, sem o Rekognition buscar no S3.
const provider = process.env.MODERATION_PROVIDER ?? "none";
const MIN_CONFIDENCE = Number(process.env.MODERATION_MIN_CONFIDENCE ?? 80);
// Categorias de nível 1 do Rekognition que bloqueiam o post
const BLOCKED = new Set(["Explicit", "Explicit Nudity", "Violence", "Visually Disturbing", "Hate Symbols"]);
// Placa brasileira: antiga (ABC-1234) e Mercosul (ABC1D23)
const PLATE = /^[A-Z]{3}[-\s]?\d[A-Z0-9]\d{2}$/;

export type Box = { left: number; top: number; width: number; height: number };
export type ModerationResult = {
  approved: boolean;
  provider: string;
  labels: { name: string; parent?: string; confidence: number }[];
  faces: number;
  plates: number;
  ms?: number;
};

let rk: RekognitionClient | undefined;
// O Rekognition não existe em todas as regiões (São Paulo incluso): região própria
const client = () =>
  (rk ??= new RekognitionClient({ region: process.env.REKOGNITION_REGION ?? awsRegion, credentials: awsCredentials() }));

const toBox = (b?: BoundingBox): Box | null =>
  b && b.Width && b.Height ? { left: b.Left ?? 0, top: b.Top ?? 0, width: b.Width, height: b.Height } : null;

export async function inspect(bytes: Uint8Array): Promise<{ result: ModerationResult; boxes: Box[] }> {
  if (provider !== "rekognition") return { result: { approved: true, provider, labels: [], faces: 0, plates: 0 }, boxes: [] };

  const t0 = Date.now();
  const Image = { Bytes: bytes };
  const [mod, faces, text] = await Promise.all([
    client().send(new DetectModerationLabelsCommand({ Image, MinConfidence: MIN_CONFIDENCE })),
    client().send(new DetectFacesCommand({ Image })),
    client().send(new DetectTextCommand({ Image })),
  ]);

  const labels = (mod.ModerationLabels ?? []).map((l) => ({
    name: l.Name ?? "",
    parent: l.ParentName || undefined,
    confidence: Math.round(l.Confidence ?? 0),
  }));
  const approved = !labels.some((l) => BLOCKED.has(l.parent || l.name) || BLOCKED.has(l.name));

  const faceBoxes = (faces.FaceDetails ?? [])
    .filter((f) => (f.Confidence ?? 0) >= 70)
    .map((f) => toBox(f.BoundingBox))
    .filter((b): b is Box => b !== null);
  const plateBoxes = (text.TextDetections ?? [])
    .filter((t) => t.Type === "LINE" && PLATE.test((t.DetectedText ?? "").toUpperCase().trim()))
    .map((t) => toBox(t.Geometry?.BoundingBox))
    .filter((b): b is Box => b !== null);

  return {
    result: { approved, provider, labels, faces: faceBoxes.length, plates: plateBoxes.length, ms: Date.now() - t0 },
    boxes: [...faceBoxes, ...plateBoxes],
  };
}
