// O MapLibre 6 carrega o Web Worker a partir de import.meta.url, o que não
// sobrevive ao bundle do Next. Copiamos o worker para public/ e apontamos
// para ele com setWorkerUrl (ver components/map/CityMap.tsx).
import { cpSync, mkdirSync } from "node:fs";

const src = "node_modules/maplibre-gl/dist";
const dest = "public/maplibre";
mkdirSync(dest, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  cpSync(`${src}/${file}`, `${dest}/${file}`);
}
