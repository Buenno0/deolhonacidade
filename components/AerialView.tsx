import { SATELLITE_TILES } from "@/lib/map/style";
import { landmarkSvg, type LandmarkKind } from "@/lib/landmarks";

// Vista aérea do ponto exato, para o marco que ainda não tem foto livre:
// é sempre do lugar certo. Os ladrilhos do mesmo satélite do mapa, no zoom 18,
// montados num SVG que escala com a largura, e o ladrilho do marco no centro.
const Z = 18;
const TILE = 256;
const W = 768;
const H = 576;

export default function AerialView({ lng, lat, kind, name }: { lng: number; lat: number; kind: LandmarkKind; name: string }) {
  const n = 2 ** Z * TILE;
  const cx = ((lng + 180) / 360) * n;
  const s = Math.sin((lat * Math.PI) / 180);
  const cy = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n;
  const x0 = cx - W / 2;
  const y0 = cy - H / 2;
  const tiles: { x: number; y: number; tx: number; ty: number }[] = [];
  for (let ty = Math.floor(y0 / TILE); ty <= Math.floor((y0 + H - 1) / TILE); ty++)
    for (let tx = Math.floor(x0 / TILE); tx <= Math.floor((x0 + W - 1) / TILE); tx++)
      tiles.push({ tx, ty, x: tx * TILE - x0, y: ty * TILE - y0 });
  const url = (tx: number, ty: number) =>
    SATELLITE_TILES.replace("{z}", String(Z)).replace("{x}", String(tx)).replace("{y}", String(ty));

  return (
    <figure className="overflow-hidden rounded-xl border border-line bg-elev">
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block aspect-[4/3] w-full" role="img" aria-label={`Vista aérea de ${name}`}>
          {tiles.map((t) => (
            <image key={`${t.tx}-${t.ty}`} href={url(t.tx, t.ty)} x={t.x} y={t.y} width={TILE} height={TILE} />
          ))}
        </svg>
        {/* .marco é position: relative (fora das camadas do Tailwind): o
            posicionamento fica num contêiner próprio, com a ponta no ponto */}
        <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[calc(100%+5px)]" aria-hidden="true">
          <span className="marco block">
            <span className="marco-face" dangerouslySetInnerHTML={{ __html: landmarkSvg(kind) }} />
          </span>
        </span>
      </div>
      <figcaption className="rotulo flex justify-between gap-2 px-3 py-1.5">
        <span className="truncate">Vista aérea · sem foto livre ainda</span>
        <span className="shrink-0">© Esri, Maxar</span>
      </figcaption>
    </figure>
  );
}
