import type { ResolvedTheme } from "@/features/theme/domain/types";
import { MAP_OVERZOOM_SCALE } from "@/features/map/infrastructure/constants";
import { blendHex } from "@/shared/utils/color";
import type { StyleSpecification } from "maplibre-gl";

const OPENFREEMAP_SOURCE = "https://tiles.openfreemap.org/planet";
const SOURCE_ID = "openfreemap";
const TERRAIN_SOURCE_ID = "terrain";
const TERRAIN_TILES_URL =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const GLYPHS_URL =
  "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

/**
 * OpenFreeMap is OpenMapTiles-based and can generalize data at low zooms.
 * Setting maxzoom explicitly keeps high zoom behavior deterministic (standard overzoom above this level).
 */
const SOURCE_MAX_ZOOM = 14;

const BUILDING_BLEND_FACTOR = 0.14;
const BUILDING_FILL_OPACITY = 0.84;
const MAP_BUILDING_MIN_ZOOM_DEFAULT = 8;
const MAP_BUILDING_MIN_ZOOM_PRESERVE = 8.2;
const DETAIL_PRESERVE_DISTANCE_METERS = 30_000;

const MAP_WATERWAY_WIDTH_STOPS: [number, number][] = [
  [0, 0.2],
  [6, 0.34],
  [12, 0.8],
  [18, 2.4],
];

const MAP_RAIL_WIDTH_STOPS: [number, number][] = [
  [3, 0.4],
  [6, 0.7],
  [10, 1],
  [18, 1.5],
];

/**
 * Road classes are intentionally broad in minor/detail buckets so dense road texture
 * remains visible when the camera zooms out.
 */
const MAP_ROAD_MAJOR_CLASSES = ["motorway"];

const MAP_ROAD_MINOR_HIGH_CLASSES = [
  "primary",
  "primary_link",
  "secondary",
  "secondary_link",
  "motorway_link",
  "trunk",
  "trunk_link",
];

const MAP_ROAD_MINOR_MID_CLASSES = ["tertiary", "tertiary_link", "minor"];

const MAP_ROAD_MINOR_LOW_CLASSES = [
  "residential",
  "living_street",
  "unclassified",
  "road",
  "street",
  "street_limited",
  "service",
];

const MAP_ROAD_PATH_CLASSES = ["path", "pedestrian", "cycleway", "track"];
const MAP_RAIL_CLASSES = ["rail", "transit"];

/**
 * Two-stage minor/path rendering:
 * - overview layer: very thin roads at low zoom so detail does not disappear abruptly
 * - detail layer: thicker, readable network from mid zoom upward
 */
const MAP_ROAD_MINOR_HIGH_OVERVIEW_WIDTH_STOPS: [number, number][] = [
  [0, 0.1],
  [4, 0.18],
  [8, 0.3],
  [11, 0.46],
];
const MAP_ROAD_MINOR_MID_OVERVIEW_WIDTH_STOPS: [number, number][] = [
  [0, 0.08],
  [4, 0.14],
  [8, 0.24],
  [11, 0.36],
];
const MAP_ROAD_MINOR_LOW_OVERVIEW_WIDTH_STOPS: [number, number][] = [
  [0, 0.06],
  [4, 0.1],
  [8, 0.18],
  [11, 0.3],
];
const MAP_ROAD_MINOR_HIGH_DETAIL_WIDTH_STOPS: [number, number][] = [
  [6, 0.46],
  [10, 0.8],
  [14, 1.48],
  [18, 2.7],
];
const MAP_ROAD_MINOR_MID_DETAIL_WIDTH_STOPS: [number, number][] = [
  [6, 0.34],
  [10, 0.62],
  [14, 1.2],
  [18, 2.35],
];
const MAP_ROAD_MINOR_LOW_DETAIL_WIDTH_STOPS: [number, number][] = [
  [6, 0.24],
  [10, 0.44],
  [14, 0.84],
  [18, 1.65],
];

const MAP_ROAD_PATH_OVERVIEW_WIDTH_STOPS: [number, number][] = [
  [5, 0.06],
  [8, 0.1],
  [11, 0.2],
];
const MAP_ROAD_PATH_DETAIL_WIDTH_STOPS: [number, number][] = [
  [8, 0.2],
  [12, 0.42],
  [16, 0.85],
  [18, 1.3],
];

const MAP_ROAD_MAJOR_WIDTH_STOPS: [number, number][] = [
  [0, 0.36],
  [3, 0.52],
  [9, 1.1],
  [14, 2.05],
  [18, 3.3],
];

const ROAD_MINOR_OVERVIEW_MIN_ZOOM = 0;
const ROAD_MINOR_DETAIL_MIN_ZOOM = 6;
const ROAD_PATH_OVERVIEW_MIN_ZOOM = 5;
const ROAD_PATH_DETAIL_MIN_ZOOM = 8;
const ROAD_OVERVIEW_MAX_ZOOM = 11.8;

const LINE_GEOMETRY_FILTER = [
  "match",
  ["geometry-type"],
  ["LineString", "MultiLineString"],
  true,
  false,
] as const;

/**
 * Over-zoom preview/export shrinks rendered strokes after viewport scale compensation.
 * Apply a global width boost to keep perceived stroke thickness closer to non-overzoom output.
 */
const OVERZOOM_LINE_WIDTH_SCALE = Math.pow(MAP_OVERZOOM_SCALE, 0.8);

function resolveBuildingMinZoom(distanceMeters?: number): number {
  if (
    Number.isFinite(distanceMeters) &&
    Number(distanceMeters) <= DETAIL_PRESERVE_DISTANCE_METERS
  ) {
    return MAP_BUILDING_MIN_ZOOM_PRESERVE;
  }
  return MAP_BUILDING_MIN_ZOOM_DEFAULT;
}

function widthExpr(stops: [number, number][]): any {
  const flat = stops.flatMap(([zoom, width]) => [zoom, width]);
  return ["interpolate", ["linear"], ["zoom"], ...flat];
}

function opacityExpr(stops: [number, number][]): any {
  const flat = stops.flatMap(([zoom, opacity]) => [zoom, opacity]);
  return ["interpolate", ["linear"], ["zoom"], ...flat];
}

function scaledStops(
  stops: [number, number][],
  scale: number,
): [number, number][] {
  return stops.map(([zoom, width]) => [zoom, width * scale]);
}

function compensateLineWidthStops(
  stops: [number, number][],
): [number, number][] {
  return scaledStops(stops, OVERZOOM_LINE_WIDTH_SCALE);
}

function lineClassFilter(classes: string[]): any {
  return [
    "all",
    LINE_GEOMETRY_FILTER,
    ["match", ["get", "class"], classes, true, false],
  ];
}

export function generateMapStyle(
  theme: ResolvedTheme,
  options?: {
    includeBuildings?: boolean;
    includeWater?: boolean;
    includeParks?: boolean;
    includeAeroway?: boolean;
    includeRail?: boolean;
    includeRoads?: boolean;
    includeRoadPath?: boolean;
    includeRoadMinorLow?: boolean;
    includeRoadOutline?: boolean;
    includeLandcover?: boolean;
    includeLabels?: boolean;
    includeTerrain?: boolean;
    distanceMeters?: number;
  },
): StyleSpecification {
  const buildingFill =
    theme.map.buildings ||
    blendHex(
      theme.map.land || "#ffffff",
      theme.ui.text || "#111111",
      BUILDING_BLEND_FACTOR,
    );

  const includeBuildings = options?.includeBuildings ?? true;
  const includeWater = options?.includeWater ?? true;
  const includeParks = options?.includeParks ?? true;
  const includeAeroway = options?.includeAeroway ?? true;
  const includeRail = options?.includeRail ?? true;
  const includeRoads = options?.includeRoads ?? true;
  const includeRoadPath = options?.includeRoadPath ?? true;
  const includeRoadMinorLow = options?.includeRoadMinorLow ?? true;
  const includeRoadOutline = options?.includeRoadOutline ?? true;
  const includeLandcover = options?.includeLandcover ?? true;
  const includeLabels = options?.includeLabels ?? true;
  const includeTerrain = options?.includeTerrain ?? false;
  const buildingMinZoom = resolveBuildingMinZoom(options?.distanceMeters);

  // Landcover colours derived from existing theme palette so they always harmonise.
  const forestColor = blendHex(theme.map.parks, theme.ui.text, 0.1);
  const grassColor = theme.map.parks;
  const farmlandColor = blendHex(theme.map.land, theme.map.parks, 0.3);
  const wetlandColor = blendHex(theme.map.water, theme.map.parks, 0.45);

  // Label colours — text on map, not on poster overlay.
  const labelColor = theme.ui.text;
  const labelHaloColor = theme.map.land;
  const waterLabelColor = blendHex(theme.map.water, theme.ui.text, 0.6);
  const waterLabelHaloColor = theme.map.water;

  const minorHighCasingStops = scaledStops(
    MAP_ROAD_MINOR_HIGH_DETAIL_WIDTH_STOPS,
    1.45,
  );
  const minorMidCasingStops = scaledStops(
    MAP_ROAD_MINOR_MID_DETAIL_WIDTH_STOPS,
    1.15,
  );
  const pathCasingStops = scaledStops(MAP_ROAD_PATH_DETAIL_WIDTH_STOPS, 1.6);
  const majorCasingStops = scaledStops(MAP_ROAD_MAJOR_WIDTH_STOPS, 1.38);
  const waterwayWidthStops = compensateLineWidthStops(MAP_WATERWAY_WIDTH_STOPS);
  const railWidthStops = compensateLineWidthStops(MAP_RAIL_WIDTH_STOPS);
  const roadMinorOverviewHighWidthStops = compensateLineWidthStops(
    MAP_ROAD_MINOR_HIGH_OVERVIEW_WIDTH_STOPS,
  );
  const roadMinorOverviewMidWidthStops = compensateLineWidthStops(
    MAP_ROAD_MINOR_MID_OVERVIEW_WIDTH_STOPS,
  );
  const roadMinorOverviewLowWidthStops = compensateLineWidthStops(
    MAP_ROAD_MINOR_LOW_OVERVIEW_WIDTH_STOPS,
  );
  const roadPathOverviewWidthStops = compensateLineWidthStops(
    MAP_ROAD_PATH_OVERVIEW_WIDTH_STOPS,
  );
  const roadMinorDetailHighWidthStops = compensateLineWidthStops(
    MAP_ROAD_MINOR_HIGH_DETAIL_WIDTH_STOPS,
  );
  const roadMinorDetailMidWidthStops = compensateLineWidthStops(
    MAP_ROAD_MINOR_MID_DETAIL_WIDTH_STOPS,
  );
  const roadMinorDetailLowWidthStops = compensateLineWidthStops(
    MAP_ROAD_MINOR_LOW_DETAIL_WIDTH_STOPS,
  );
  const roadPathDetailWidthStops = compensateLineWidthStops(
    MAP_ROAD_PATH_DETAIL_WIDTH_STOPS,
  );
  const roadMajorWidthStops = compensateLineWidthStops(
    MAP_ROAD_MAJOR_WIDTH_STOPS,
  );
  const roadMinorHighCasingStops =
    compensateLineWidthStops(minorHighCasingStops);
  const roadMinorMidCasingStops = compensateLineWidthStops(minorMidCasingStops);
  const roadPathCasingStops = compensateLineWidthStops(pathCasingStops);
  const roadMajorCasingStops = compensateLineWidthStops(majorCasingStops);
  const roadMinorHighColor = theme.map.roads.minor_high;
  const roadMinorMidColor = theme.map.roads.minor_mid;
  const roadMinorLowColor = theme.map.roads.minor_low;
  const roadPathColor = theme.map.roads.path;
  const roadOutlineColor = theme.map.roads.outline;

  const sources: StyleSpecification["sources"] = {
    [SOURCE_ID]: {
      type: "vector",
      url: OPENFREEMAP_SOURCE,
      maxzoom: SOURCE_MAX_ZOOM,
    },
  };

  if (includeTerrain) {
    sources[TERRAIN_SOURCE_ID] = {
      type: "raster-dem",
      tiles: [TERRAIN_TILES_URL],
      tileSize: 256,
      maxzoom: 15,
      encoding: "terrarium",
    } as any;
  }

  return {
    version: 8,
    glyphs: GLYPHS_URL,
    sources,
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": theme.map.land },
      },

      // Terrain hillshading — placed immediately after background so all map
      // features render on top of the relief.
      ...(includeTerrain
        ? ([
            {
              id: "hillshade",
              type: "hillshade",
              source: TERRAIN_SOURCE_ID,
              paint: {
                "hillshade-shadow-color": blendHex(theme.map.land, "#000000", 0.22),
                "hillshade-highlight-color": blendHex(theme.map.land, "#ffffff", 0.22),
                "hillshade-illumination-direction": 315,
                "hillshade-exaggeration": 0.7,
              },
            },
          ] as any[])
        : []),

      // Landcover — drawn after hillshade so terrain relief shows through.
      {
        id: "landcover-forest",
        source: SOURCE_ID,
        "source-layer": "landcover",
        type: "fill" as const,
        filter: ["match", ["get", "class"], ["wood", "forest", "scrub"], true, false],
        layout: { visibility: includeLandcover ? ("visible" as const) : ("none" as const) },
        paint: { "fill-color": forestColor, "fill-opacity": 0.85 },
      },
      {
        id: "landcover-grass",
        source: SOURCE_ID,
        "source-layer": "landcover",
        type: "fill" as const,
        filter: ["match", ["get", "class"], ["grass", "meadow"], true, false],
        layout: { visibility: includeLandcover ? ("visible" as const) : ("none" as const) },
        paint: { "fill-color": grassColor, "fill-opacity": 0.6 },
      },
      {
        id: "landcover-farmland",
        source: SOURCE_ID,
        "source-layer": "landcover",
        type: "fill" as const,
        filter: ["match", ["get", "class"], ["farmland", "crop"], true, false],
        layout: { visibility: includeLandcover ? ("visible" as const) : ("none" as const) },
        paint: { "fill-color": farmlandColor, "fill-opacity": 0.55 },
      },
      {
        id: "landcover-wetland",
        source: SOURCE_ID,
        "source-layer": "landcover",
        type: "fill" as const,
        filter: ["match", ["get", "class"], ["wetland", "marsh"], true, false],
        layout: { visibility: includeLandcover ? ("visible" as const) : ("none" as const) },
        paint: { "fill-color": wetlandColor, "fill-opacity": 0.6 },
      },

      // Parks are drawn before water so that marine protected areas / ocean parks
      // are always covered by the water layer and don't bleed the parks color onto oceans.
      {
        id: "park",
        source: SOURCE_ID,
        "source-layer": "park",
        type: "fill" as const,
        layout: { visibility: includeParks ? ("visible" as const) : ("none" as const) },
        paint: { "fill-color": theme.map.parks },
      },

      {
        id: "water",
        source: SOURCE_ID,
        "source-layer": "water",
        type: "fill" as const,
        layout: { visibility: includeWater ? ("visible" as const) : ("none" as const) },
        paint: { "fill-color": theme.map.water },
      },
      {
        id: "waterway",
        source: SOURCE_ID,
        "source-layer": "waterway",
        type: "line" as const,
        filter: lineClassFilter(["river", "canal", "stream", "ditch"]),
        paint: {
          "line-color": theme.map.waterway,
          "line-width": widthExpr(waterwayWidthStops),
        },
        layout: {
          visibility: includeWater ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },

      {
        id: "aeroway",
        source: SOURCE_ID,
        "source-layer": "aeroway",
        type: "fill" as const,
        filter: [
          "match",
          ["geometry-type"],
          ["MultiPolygon", "Polygon"],
          true,
          false,
        ],
        layout: { visibility: includeAeroway ? ("visible" as const) : ("none" as const) },
        paint: {
          "fill-color": theme.map.aeroway,
          "fill-opacity": 0.85,
        },
      },

      {
        id: "building",
        source: SOURCE_ID,
        "source-layer": "building",
        type: "fill" as const,
        minzoom: buildingMinZoom,
        layout: { visibility: includeBuildings ? ("visible" as const) : ("none" as const) },
        paint: {
          "fill-color": buildingFill,
          "fill-opacity": BUILDING_FILL_OPACITY,
        },
      },

      {
        id: "rail",
        source: SOURCE_ID,
        "source-layer": "transportation",
        type: "line" as const,
        filter: lineClassFilter(MAP_RAIL_CLASSES),
        paint: {
          "line-color": theme.map.rail,
          "line-width": widthExpr(railWidthStops),
          "line-opacity": opacityExpr([
            [0, 0.56],
            [12, 0.62],
            [18, 0.72],
          ]),
          "line-dasharray": [2, 1.6],
        },
        layout: {
          visibility: includeRail ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },

      {
        id: "road-minor-overview-high",
        source: SOURCE_ID,
        "source-layer": "transportation",
        type: "line",
        minzoom: ROAD_MINOR_OVERVIEW_MIN_ZOOM,
        maxzoom: ROAD_OVERVIEW_MAX_ZOOM,
        filter: lineClassFilter(MAP_ROAD_MINOR_HIGH_CLASSES),
        paint: {
          "line-color": roadMinorHighColor,
          "line-width": widthExpr(roadMinorOverviewHighWidthStops),
          "line-opacity": opacityExpr([
            [0, 0.66],
            [8, 0.76],
            [12, 0],
          ]),
        },
        layout: {
          visibility: includeRoads ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },
      {
        id: "road-minor-overview-mid",
        source: SOURCE_ID,
        "source-layer": "transportation",
        type: "line",
        minzoom: ROAD_MINOR_OVERVIEW_MIN_ZOOM,
        maxzoom: ROAD_OVERVIEW_MAX_ZOOM,
        filter: lineClassFilter(MAP_ROAD_MINOR_MID_CLASSES),
        paint: {
          "line-color": roadMinorMidColor,
          "line-width": widthExpr(roadMinorOverviewMidWidthStops),
          "line-opacity": opacityExpr([
            [0, 0.46],
            [8, 0.56],
            [12, 0],
          ]),
        },
        layout: {
          visibility: includeRoads ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },
      {
        id: "road-minor-overview-low",
        source: SOURCE_ID,
        "source-layer": "transportation",
        type: "line",
        minzoom: ROAD_MINOR_OVERVIEW_MIN_ZOOM,
        maxzoom: ROAD_OVERVIEW_MAX_ZOOM,
        filter: lineClassFilter(MAP_ROAD_MINOR_LOW_CLASSES),
        paint: {
          "line-color": roadMinorLowColor,
          "line-width": widthExpr(roadMinorOverviewLowWidthStops),
          "line-opacity": includeRoadMinorLow
            ? opacityExpr([
                [0, 0.26],
                [8, 0.34],
                [12, 0],
              ])
            : 0,
        },
        layout: {
          visibility: includeRoads ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },
      {
        id: "road-path-overview",
        source: SOURCE_ID,
        "source-layer": "transportation",
        type: "line",
        minzoom: ROAD_PATH_OVERVIEW_MIN_ZOOM,
        maxzoom: ROAD_OVERVIEW_MAX_ZOOM,
        filter: lineClassFilter(MAP_ROAD_PATH_CLASSES),
        paint: {
          "line-color": roadPathColor,
          "line-width": widthExpr(roadPathOverviewWidthStops),
          "line-opacity": includeRoadPath
            ? opacityExpr([
                [5, 0.45],
                [9, 0.58],
                [12, 0],
              ])
            : 0,
        },
        layout: {
          visibility: includeRoads ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },

      {
        id: "road-major-casing",
        source: SOURCE_ID,
        "source-layer": "transportation",
        type: "line",
        filter: lineClassFilter(MAP_ROAD_MAJOR_CLASSES),
        paint: {
          "line-color": roadOutlineColor,
          "line-width": widthExpr(roadMajorCasingStops),
          "line-opacity": includeRoadOutline ? 0.95 : 0,
        },
        layout: {
          visibility: includeRoads ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },
      {
        id: "road-minor-high-casing",
        source: SOURCE_ID,
        "source-layer": "transportation",
        type: "line",
        minzoom: ROAD_MINOR_DETAIL_MIN_ZOOM,
        filter: lineClassFilter(MAP_ROAD_MINOR_HIGH_CLASSES),
        paint: {
          "line-color": roadOutlineColor,
          "line-width": widthExpr(roadMinorHighCasingStops),
          "line-opacity": includeRoadOutline
            ? opacityExpr([
                [6, 0.72],
                [12, 0.85],
                [18, 0.92],
              ])
            : 0,
        },
        layout: {
          visibility: includeRoads ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },
      {
        id: "road-minor-mid-casing",
        source: SOURCE_ID,
        "source-layer": "transportation",
        type: "line",
        minzoom: ROAD_MINOR_DETAIL_MIN_ZOOM,
        filter: lineClassFilter(MAP_ROAD_MINOR_MID_CLASSES),
        paint: {
          "line-color": roadOutlineColor,
          "line-width": widthExpr(roadMinorMidCasingStops),
          "line-opacity": includeRoadOutline
            ? opacityExpr([
                [6, 0.42],
                [12, 0.56],
                [18, 0.66],
              ])
            : 0,
        },
        layout: {
          visibility: includeRoads ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },
      {
        id: "road-path-casing",
        source: SOURCE_ID,
        "source-layer": "transportation",
        type: "line",
        minzoom: ROAD_PATH_DETAIL_MIN_ZOOM,
        filter: lineClassFilter(MAP_ROAD_PATH_CLASSES),
        paint: {
          "line-color": roadOutlineColor,
          "line-width": widthExpr(roadPathCasingStops),
          "line-opacity": includeRoadOutline && includeRoadPath
            ? opacityExpr([
                [8, 0.62],
                [12, 0.72],
                [18, 0.85],
              ])
            : 0,
        },
        layout: {
          visibility: includeRoads ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },

      {
        id: "road-major",
        source: SOURCE_ID,
        "source-layer": "transportation",
        type: "line",
        filter: lineClassFilter(MAP_ROAD_MAJOR_CLASSES),
        paint: {
          "line-color": theme.map.roads.major,
          "line-width": widthExpr(roadMajorWidthStops),
        },
        layout: {
          visibility: includeRoads ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },
      {
        id: "road-minor-high",
        source: SOURCE_ID,
        "source-layer": "transportation",
        type: "line",
        minzoom: ROAD_MINOR_DETAIL_MIN_ZOOM,
        filter: lineClassFilter(MAP_ROAD_MINOR_HIGH_CLASSES),
        paint: {
          "line-color": roadMinorHighColor,
          "line-width": widthExpr(roadMinorDetailHighWidthStops),
          "line-opacity": opacityExpr([
            [6, 0.84],
            [10, 0.92],
            [18, 1],
          ]),
        },
        layout: {
          visibility: includeRoads ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },
      {
        id: "road-minor-mid",
        source: SOURCE_ID,
        "source-layer": "transportation",
        type: "line",
        minzoom: ROAD_MINOR_DETAIL_MIN_ZOOM,
        filter: lineClassFilter(MAP_ROAD_MINOR_MID_CLASSES),
        paint: {
          "line-color": roadMinorMidColor,
          "line-width": widthExpr(roadMinorDetailMidWidthStops),
          "line-opacity": opacityExpr([
            [6, 0.62],
            [10, 0.74],
            [18, 0.86],
          ]),
        },
        layout: {
          visibility: includeRoads ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },
      {
        id: "road-minor-low",
        source: SOURCE_ID,
        "source-layer": "transportation",
        type: "line",
        minzoom: ROAD_MINOR_DETAIL_MIN_ZOOM,
        filter: lineClassFilter(MAP_ROAD_MINOR_LOW_CLASSES),
        paint: {
          "line-color": roadMinorLowColor,
          "line-width": widthExpr(roadMinorDetailLowWidthStops),
          "line-opacity": includeRoadMinorLow
            ? opacityExpr([
                [6, 0.34],
                [10, 0.46],
                [18, 0.58],
              ])
            : 0,
        },
        layout: {
          visibility: includeRoads ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },
      {
        id: "road-path",
        source: SOURCE_ID,
        "source-layer": "transportation",
        type: "line",
        minzoom: ROAD_PATH_DETAIL_MIN_ZOOM,
        filter: lineClassFilter(MAP_ROAD_PATH_CLASSES),
        paint: {
          "line-color": roadPathColor,
          "line-width": widthExpr(roadPathDetailWidthStops),
          "line-opacity": includeRoadPath
            ? opacityExpr([
                [8, 0.7],
                [12, 0.82],
                [18, 0.95],
              ])
            : 0,
        },
        layout: {
          visibility: includeRoads ? ("visible" as const) : ("none" as const),
          "line-cap": "round" as const,
          "line-join": "round" as const,
        },
      },

      // ── Labels ────────────────────────────────────────────────────────────
      // Always present in the layer list so incremental style updates can diff
      // visibility changes without a full setStyle call.

      // Water body names (oceans, lakes, rivers).
      {
        id: "label-water",
        source: SOURCE_ID,
        "source-layer": "water_name",
        type: "symbol" as const,
        minzoom: 4,
        layout: {
          visibility: includeLabels ? ("visible" as const) : ("none" as const),
          "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
          "text-font": ["Noto Sans Italic"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 4, 9, 10, 13, 16, 16],
          "text-max-width": 8,
          "symbol-placement": "point" as const,
        },
        paint: {
          "text-color": waterLabelColor,
          "text-halo-color": waterLabelHaloColor,
          "text-halo-width": 1.5,
          "text-opacity": 0.85,
        },
      },

      // City / town / village names.
      {
        id: "label-place-city",
        source: SOURCE_ID,
        "source-layer": "place",
        type: "symbol" as const,
        minzoom: 4,
        filter: ["match", ["get", "class"], ["city", "capital"], true, false],
        layout: {
          visibility: includeLabels ? ("visible" as const) : ("none" as const),
          "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
          "text-font": ["Noto Sans Bold"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 4, 10, 8, 14, 12, 18],
          "text-max-width": 10,
        },
        paint: {
          "text-color": labelColor,
          "text-halo-color": labelHaloColor,
          "text-halo-width": 1.5,
        },
      },
      {
        id: "label-place-town",
        source: SOURCE_ID,
        "source-layer": "place",
        type: "symbol" as const,
        minzoom: 8,
        filter: ["match", ["get", "class"], ["town", "village", "hamlet"], true, false],
        layout: {
          visibility: includeLabels ? ("visible" as const) : ("none" as const),
          "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 8, 9, 12, 13, 16, 15],
          "text-max-width": 8,
        },
        paint: {
          "text-color": labelColor,
          "text-halo-color": labelHaloColor,
          "text-halo-width": 1.2,
          "text-opacity": 0.9,
        },
      },

      // Suburb / neighbourhood names — most useful for borough-scale prints.
      {
        id: "label-place-suburb",
        source: SOURCE_ID,
        "source-layer": "place",
        type: "symbol" as const,
        minzoom: 11,
        filter: ["match", ["get", "class"], ["suburb", "neighbourhood", "quarter"], true, false],
        layout: {
          visibility: includeLabels ? ("visible" as const) : ("none" as const),
          "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 11, 9, 14, 12, 18, 14],
          "text-max-width": 8,
          "text-letter-spacing": 0.05,
          "text-transform": "uppercase" as const,
        },
        paint: {
          "text-color": labelColor,
          "text-halo-color": labelHaloColor,
          "text-halo-width": 1,
          "text-opacity": 0.75,
        },
      },

      // Street name labels — on-line placement along road geometry.
      {
        id: "label-road-major",
        source: SOURCE_ID,
        "source-layer": "transportation_name",
        type: "symbol" as const,
        minzoom: 10,
        filter: ["match", ["get", "class"], ["motorway", "primary", "trunk"], true, false],
        layout: {
          visibility: includeLabels ? ("visible" as const) : ("none" as const),
          "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
          "text-font": ["Noto Sans Regular"],
          "symbol-placement": "line" as const,
          "text-size": ["interpolate", ["linear"], ["zoom"], 10, 9, 16, 13],
          "text-max-angle": 30,
          "symbol-spacing": 400,
        },
        paint: {
          "text-color": labelColor,
          "text-halo-color": labelHaloColor,
          "text-halo-width": 1.2,
          "text-opacity": 0.8,
        },
      },
      {
        id: "label-road-minor",
        source: SOURCE_ID,
        "source-layer": "transportation_name",
        type: "symbol" as const,
        minzoom: 13,
        filter: [
          "match",
          ["get", "class"],
          ["secondary", "tertiary", "minor", "residential", "living_street", "unclassified"],
          true,
          false,
        ],
        layout: {
          visibility: includeLabels ? ("visible" as const) : ("none" as const),
          "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
          "text-font": ["Noto Sans Regular"],
          "symbol-placement": "line" as const,
          "text-size": ["interpolate", ["linear"], ["zoom"], 13, 8, 17, 12],
          "text-max-angle": 30,
          "symbol-spacing": 350,
        },
        paint: {
          "text-color": labelColor,
          "text-halo-color": labelHaloColor,
          "text-halo-width": 1,
          "text-opacity": 0.7,
        },
      },

      // POI labels — key landmarks, stations, and attractions.
      {
        id: "label-poi",
        source: SOURCE_ID,
        "source-layer": "poi",
        type: "symbol" as const,
        minzoom: 14,
        filter: [
          "match",
          ["get", "class"],
          [
            "rail",
            "subway",
            "airport",
            "museum",
            "attraction",
            "landmark",
            "place_of_worship",
            "hospital",
            "stadium",
            "park",
          ],
          true,
          false,
        ],
        layout: {
          visibility: includeLabels ? ("visible" as const) : ("none" as const),
          "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 14, 9, 18, 12],
          "text-max-width": 8,
          "text-anchor": "top" as const,
          "text-offset": [0, 0.5],
        },
        paint: {
          "text-color": labelColor,
          "text-halo-color": labelHaloColor,
          "text-halo-width": 1,
          "text-opacity": 0.85,
        },
      },
    ],
  };
}
