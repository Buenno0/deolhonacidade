import "server-only";
import {
  DetectFacesCommand,
  DetectLabelsCommand,
  DetectModerationLabelsCommand,
  DetectTextCommand,
  RekognitionClient,
  type BoundingBox,
  type TextDetection,
} from "@aws-sdk/client-rekognition";
import sharp from "sharp";
import { awsCredentials, awsRegion } from "./aws";

// MODERATION_PROVIDER=none (padrão, local) ou rekognition.
// Duas rodadas, pagando só o que a foto pede (US$ 0,001 por chamada):
// 1. é imprópria? e o que há nela (gente, veículos, placa)?
// 2. rostos, só se há gente; placas, lendo cada veículo recortado e ampliado
//    (até 4) e a foto inteira só se ele vê placa. Na foto inteira a placa de
//    um carro a poucos metros tem uns 50 px e o OCR não lê; no recorte, lê.
// Foto sem gente e sem veículo: 2 chamadas.
// A foto vai nos bytes, sem o Rekognition buscar no S3.
const provider = process.env.MODERATION_PROVIDER ?? "none";
const MIN_CONFIDENCE = Number(process.env.MODERATION_MIN_CONFIDENCE ?? 80);
// Categorias de nível 1 do Rekognition que bloqueiam o post
const BLOCKED = new Set(["Explicit", "Explicit Nudity", "Violence", "Visually Disturbing", "Hate Symbols"]);
// Placa brasileira: antiga (ABC-1234) e Mercosul (ABC1D23). O OCR troca
// letra e número parecidos (O/0, I/1, S/5, B/8), então cada posição aceita o
// "gêmeo" do tipo errado antes de comparar.
const PLATE = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/;
const TO_LETTER: Record<string, string> = { "0": "O", "1": "I", "5": "S", "8": "B", "2": "Z", "6": "G" };
const TO_DIGIT: Record<string, string> = { O: "0", Q: "0", D: "0", I: "1", L: "1", S: "5", B: "8", Z: "2", G: "6" };
export function looksLikePlate(text: string) {
  const t = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  // Placa tem 4 números; sem ao menos 2 lidos como número, palavras de 7
  // letras passariam pela troca de gêmeos ("CURIOSO" vira CUR1O50)
  if (t.length !== 7 || (t.match(/\d/g) ?? []).length < 2) return false;
  const fixed = [...t]
    .map((c, i) => (i < 3 ? (TO_LETTER[c] ?? c) : i === 4 ? c : (TO_DIGIT[c] ?? c)))
    .join("");
  return PLATE.test(fixed);
}

// Dentro de um veículo a regra afrouxa: 5 a 8 letras e números misturados já é
// placa (o OCR de uma placa pequena costuma comer ou trocar um caractere). Um
// adesivo borrado por engano custa pouco; uma placa legível, não.
export function looksLikePlateOnVehicle(text: string) {
  const t = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return t.length >= 5 && t.length <= 8 && /[A-Z]/.test(t) && /\d/.test(t) && !/^BRASIL/.test(t);
}

export type Box = { left: number; top: number; width: number; height: number; kind: "face" | "plate" };
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

const toBox = (b: BoundingBox | undefined, kind: Box["kind"]): Box | null =>
  b && b.Width && b.Height ? { left: b.Left ?? 0, top: b.Top ?? 0, width: b.Width, height: b.Height, kind } : null;

// OCR mais sensível que o padrão: placa pequena sai com confiança baixa
const TEXT_FILTERS = { WordFilter: { MinConfidence: 40 } };
const VEHICLES = ["Car", "Truck", "Bus", "Van", "Motorcycle"];
// Se nada disso aparece na foto, não há rosto para procurar. Os nomes têm de
// existir no catálogo do Rekognition ("Human" não existe e recusa o pedido todo).
const PEOPLE = ["Person", "Adult", "Man", "Woman", "Male", "Female", "Boy", "Girl", "Child", "Baby", "Face", "Head", "Selfie", "Portrait", "Crowd"];
const PLATE_LABEL = "License Plate";
// Até 4 veículos por foto, os maiores. Com menos de 140 px de largura a placa
// tem menos de ~25 px: nem o OCR nem uma pessoa leem, e a leitura só custaria.
const MAX_VEHICLES = 4;
const MIN_VEHICLE_PX = 140;
// Placas lidas na foto inteira: linha ou palavra no formato brasileiro, e
// também duas palavras vizinhas que juntas formam a placa ("ABC" "1D23")
function platesInText(detections: TextDetection[]) {
  const boxes: Box[] = [];
  for (const d of detections) {
    if (looksLikePlate(d.DetectedText ?? "")) {
      const b = toBox(d.Geometry?.BoundingBox, "plate");
      if (b) boxes.push(b);
    }
  }
  const words = detections.filter((d) => d.Type === "WORD");
  for (let i = 0; i + 1 < words.length; i++) {
    const [a, b] = [words[i], words[i + 1]];
    if (a.ParentId !== b.ParentId || !looksLikePlate(`${a.DetectedText}${b.DetectedText}`)) continue;
    const u = union(toBox(a.Geometry?.BoundingBox, "plate"), toBox(b.Geometry?.BoundingBox, "plate"));
    if (u) boxes.push(u);
  }
  return boxes;
}

function union(a: Box | null, b: Box | null): Box | null {
  if (!a || !b) return a ?? b;
  const left = Math.min(a.left, b.left);
  const top = Math.min(a.top, b.top);
  return {
    left,
    top,
    width: Math.max(a.left + a.width, b.left + b.width) - left,
    height: Math.max(a.top + a.height, b.top + b.height) - top,
    kind: a.kind,
  };
}

// Segunda leitura: recorta o veículo, amplia até ~1000 px e lê de novo. As
// caixas achadas no recorte voltam para a proporção da foto inteira.
async function platesOnVehicle(jpeg: Buffer, W: number, H: number, v: BoundingBox): Promise<Box[]> {
  const left = Math.max(0, Math.floor((v.Left ?? 0) * W));
  const top = Math.max(0, Math.floor((v.Top ?? 0) * H));
  const w = Math.min(W - left, Math.ceil((v.Width ?? 0) * W));
  const h = Math.min(H - top, Math.ceil((v.Height ?? 0) * H));
  if (w < 24 || h < 24) return [];
  const scale = Math.min(4, Math.max(1, 1000 / Math.max(w, h)));
  const crop = await sharp(jpeg)
    .extract({ left, top, width: w, height: h })
    .resize(Math.round(w * scale), Math.round(h * scale), { kernel: "lanczos3" })
    .sharpen()
    .jpeg({ quality: 92 })
    .toBuffer();
  const r = await client().send(new DetectTextCommand({ Image: { Bytes: new Uint8Array(crop) }, Filters: TEXT_FILTERS }));
  const found = (r.TextDetections ?? []).filter((d) => looksLikePlateOnVehicle(d.DetectedText ?? ""));
  // Se a linha inteira já é placa, as palavras dela sobram
  const lines = found.filter((d) => d.Type === "LINE");
  const lineIds = new Set(lines.map((d) => d.Id));
  const pick = [...lines, ...found.filter((d) => d.Type === "WORD" && !lineIds.has(d.ParentId))];
  return pick
    .map((d) => toBox(d.Geometry?.BoundingBox, "plate"))
    .filter((b): b is Box => b !== null)
    .map((b) => ({
      kind: "plate" as const,
      left: (left + b.left * w) / W,
      top: (top + b.top * h) / H,
      width: (b.width * w) / W,
      height: (b.height * h) / H,
    }));
}

export async function inspect(bytes: Uint8Array): Promise<{ result: ModerationResult; boxes: Box[] }> {
  if (provider !== "rekognition") return { result: { approved: true, provider, labels: [], faces: 0, plates: 0 }, boxes: [] };

  const t0 = Date.now();
  // O Rekognition só lê JPEG e PNG; a foto chega em WebP. As caixas vêm em
  // proporção (0 a 1), então valem para a WebP original.
  const jpeg = await sharp(bytes).rotate().jpeg({ quality: 88 }).toBuffer();
  const { width: W = 0, height: H = 0 } = await sharp(jpeg).metadata();
  const Image = { Bytes: new Uint8Array(jpeg) };

  // 1ª rodada: é imprópria? e o que há na foto (gente, veículos, placa)?
  const [mod, objects] = await Promise.all([
    client().send(new DetectModerationLabelsCommand({ Image, MinConfidence: MIN_CONFIDENCE })),
    client()
      .send(
        new DetectLabelsCommand({
          Image,
          MinConfidence: 50,
          Settings: { GeneralLabels: { LabelInclusionFilters: [...VEHICLES, ...PEOPLE, PLATE_LABEL] } },
        }),
      )
      .catch((e) => {
        // Sem essa resposta, faz como antes: procura rosto e placa na foto toda
        console.warn("objetos indisponíveis", (e as Error).name);
        return null;
      }),
  ]);

  const labels = (mod.ModerationLabels ?? []).map((l) => ({
    name: l.Name ?? "",
    parent: l.ParentName || undefined,
    confidence: Math.round(l.Confidence ?? 0),
  }));
  const approved = !labels.some((l) => BLOCKED.has(l.parent || l.name) || BLOCKED.has(l.name));

  // Desfoca mesmo a foto recusada: a moderação pode restaurá-la depois
  const found = objects?.Labels ?? [];
  const hasPeople = !objects || found.some((l) => PEOPLE.includes(l.Name ?? ""));
  const vehicles = found
    .filter((l) => VEHICLES.includes(l.Name ?? ""))
    .flatMap((l) => l.Instances ?? [])
    .map((i) => i.BoundingBox)
    .filter((b): b is BoundingBox => Boolean(b?.Width && b?.Height && b.Width * W >= MIN_VEHICLE_PX))
    .sort((a, b) => b.Width! * b.Height! - a.Width! * a.Height!)
    .slice(0, MAX_VEHICLES);
  // Se o Rekognition vê placa (ou não respondeu), lê também a foto toda: pega a
  // placa de carro cortado na borda, que ele não aponta como veículo
  const plateLabel = found.find((l) => l.Name === PLATE_LABEL);
  const needFullText = !objects || Boolean(plateLabel);

  // 2ª rodada, só o que a foto pede: rostos, o mosaico dos veículos e a leitura da foto toda
  const [faces, onVehicles, text] = await Promise.all([
    hasPeople ? client().send(new DetectFacesCommand({ Image })) : null,
    // Um veículo por chamada: juntar os recortes num mosaico economizaria, mas
    // o OCR reduz a imagem grande e deixou passar placa legível no teste
    W && H ? Promise.all(vehicles.map((v) => platesOnVehicle(jpeg, W, H, v).catch(() => []))).then((r) => r.flat()) : [],
    needFullText ? client().send(new DetectTextCommand({ Image, Filters: TEXT_FILTERS })) : null,
  ]);

  const faceBoxes = (faces?.FaceDetails ?? [])
    .filter((f) => (f.Confidence ?? 0) >= 70)
    .map((f) => toBox(f.BoundingBox, "face"))
    .filter((b): b is Box => b !== null);
  // Placa que o Rekognition já reconhece como objeto vai direto
  const labeledPlates = (plateLabel?.Instances ?? [])
    .map((i) => toBox(i.BoundingBox, "plate"))
    .filter((b): b is Box => b !== null);
  const plateBoxes = dedupe([...platesInText(text?.TextDetections ?? []), ...labeledPlates, ...onVehicles]);

  return {
    result: { approved, provider, labels, faces: faceBoxes.length, plates: plateBoxes.length, ms: Date.now() - t0 },
    boxes: [...faceBoxes, ...plateBoxes],
  };
}

// A mesma placa achada por dois caminhos vira uma caixa só
function dedupe(boxes: Box[]) {
  const out: Box[] = [];
  for (const b of boxes) {
    const same = out.findIndex((o) => overlap(o, b) > 0.5);
    if (same === -1) out.push(b);
    else out[same] = union(out[same], b)!;
  }
  return out;
}

function overlap(a: Box, b: Box) {
  const x = Math.max(0, Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left));
  const y = Math.max(0, Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top));
  return (x * y) / Math.min(a.width * a.height, b.width * b.height);
}
