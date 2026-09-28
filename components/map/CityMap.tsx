"use client";

import { useEffect, useRef } from "react";
import {
  GeolocateControl,
  MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type ExpressionSpecification,
  type GeoJSONSource,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { CITY } from "@/lib/city";
import { CATEGORIES } from "@/lib/categories";
import type { PostProperties, PostsCollection } from "@/lib/posts";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const MAP_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE ?? "https://tiles.openfreemap.org/styles/liberty";
const WORLD_RING = [
  [-180, -85],
  [180, -85],
  [180, 85],
  [-180, 85],
  [-180, -85],
];

const categoryColor = [
  "match",
  ["get", "category"],
  ...Object.entries(CATEGORIES).flatMap(([key, c]) => [key, c.color]),
  "#64748b",
] as unknown as ExpressionSpecification;

type Props = {
  posts: PostsCollection;
  focus: [number, number] | null;
  onSelect: (post: PostProperties) => void;
};

export default function CityMap({ posts, focus, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const ready = useRef(false);
  const latestPosts = useRef(posts);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const m = new MapLibreMap({
      container: container.current!,
      style: MAP_STYLE,
      center: CITY.center,
      zoom: CITY.zoom,
      maxBounds: CITY.maxBounds,
      minZoom: 10,
      attributionControl: { compact: true },
    });
    map.current = m;

    m.addControl(new NavigationControl({ showCompass: false }), "top-right");
    m.addControl(
      new GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      "top-right",
    );

    m.on("load", async () => {
      const boundary = (await fetch(`/cities/${CITY.slug}.geojson`).then((r) =>
        r.json(),
      )) as GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
      const geom = boundary.features[0].geometry;
      const holes = geom.type === "Polygon" ? [geom.coordinates[0]] : geom.coordinates.map((p) => p[0]);

      m.addSource("city-mask", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [WORLD_RING, ...holes] } },
      });
      m.addLayer({ id: "city-mask", type: "fill", source: "city-mask", paint: { "fill-color": "#0f172a", "fill-opacity": 0.45 } });
      m.addSource("city-boundary", { type: "geojson", data: boundary });
      m.addLayer({
        id: "city-boundary",
        type: "line",
        source: "city-boundary",
        paint: { "line-color": "#0f172a", "line-width": 2, "line-opacity": 0.7 },
      });

      m.addSource("posts", {
        type: "geojson",
        data: latestPosts.current,
        cluster: true,
        clusterRadius: 45,
        clusterMaxZoom: 16,
      });
      m.addLayer({
        id: "clusters",
        type: "circle",
        source: "posts",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#2563eb",
          "circle-opacity": 0.9,
          "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 50, 28],
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
        },
      });
      m.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "posts",
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Bold"], "text-size": 13 },
        paint: { "text-color": "#ffffff" },
      });
      m.addLayer({
        id: "post-points",
        type: "circle",
        source: "posts",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": categoryColor,
          "circle-radius": 10,
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
        },
      });

      m.on("click", "clusters", async (e: MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const source = m.getSource<GeoJSONSource>("posts")!;
        const zoom = await source.getClusterExpansionZoom(feature.properties.cluster_id);
        m.easeTo({ center: (feature.geometry as GeoJSON.Point).coordinates as [number, number], zoom });
      });
      m.on("click", "post-points", (e: MapLayerMouseEvent) => {
        const props = e.features?.[0]?.properties as PostProperties | undefined;
        if (props) onSelectRef.current(props);
      });
      for (const layer of ["clusters", "post-points"]) {
        m.on("mouseenter", layer, () => (m.getCanvas().style.cursor = "pointer"));
        m.on("mouseleave", layer, () => (m.getCanvas().style.cursor = ""));
      }

      ready.current = true;
    });

    return () => {
      ready.current = false;
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    latestPosts.current = posts;
    if (ready.current) map.current?.getSource<GeoJSONSource>("posts")?.setData(posts);
  }, [posts]);

  useEffect(() => {
    if (focus) map.current?.flyTo({ center: focus, zoom: Math.max(map.current.getZoom(), 16) });
  }, [focus]);

  // O CSS do MapLibre (fora das layers do Tailwind) força position: relative
  // no container, então quem ocupa a tela é o wrapper
  return (
    <div className="absolute inset-0">
      <div ref={container} className="h-full w-full" />
    </div>
  );
}
