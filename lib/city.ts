// Cidade piloto. O limite oficial fica em public/cities/<slug>.geojson e
// também na tabela public.cities (migration de seed).
export const CITY = {
  id: 3522307,
  slug: "itapetininga",
  name: "Itapetininga",
  uf: "SP",
  // Centro urbano; o município é grande e boa parte é zona rural
  center: [-48.0531, -23.5917] as [number, number],
  zoom: 13.5,
  // Limite do município com folga, para travar o mapa
  maxBounds: [
    [-48.5, -23.95],
    [-47.7, -23.32],
  ] as [[number, number], [number, number]],
};
