import { colors } from "@afterglow/tokens";
import {
  buildShadows,
  MIN_SHADOW_ZOOM,
  normalizeMapBounds,
  shouldBuildShadows,
} from "@afterglow/utils";
import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  type LngLatBounds,
  Map,
  Marker as MapMarkerView,
  type MapRef,
  VectorSource,
} from "@maplibre/maplibre-react-native";
import { LocateFixed } from "lucide-react-native";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { env } from "@/lib/env";
import { getCurrentLocation } from "@/lib/location";
import { ROUTE_COLORS } from "@/lib/route";
import { useI18n } from "@/i18n/i18n-provider";

import {
  type MapBounds,
  type MapLibreMapProps,
  type MapLibreMapRef,
} from "./types";

// OpenFreeMap: 무료 OSM 벡터 배경지도. 등록·API 키 불필요.
const BASEMAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

// buildings.pmtiles: PMTiles v3 / MVT / zoom 0~14 / 단일 레이어 "buildings".
// ⚠️ 기본 fallback을 두지 않는다. EC2 원본(http://ec2-.../data/buildings.pmtiles)은
//    Cache-Control: no-store 라 MapLibre Native의 PMTilesFileSource가 SIGSEGV로
//    죽는다(백엔드 캐시헤더 수정 대기). 유효한 URL이 env로 주어질 때만 건물 레이어를
//    렌더하고, 없으면 basemap만 띄운다(크래시·404 에러 회피).
const BUILDINGS_PMTILES_URL = env.buildingsPmtilesUrl;
const BUILDINGS_SOURCE_LAYER = "buildings";

// 그림자(그늘) 색 — 디자인 토큰 secondary-900. 반투명으로 지면에 깔린다.
const SHADOW_COLOR = "#1c2b45";
const SHADOW_UPDATE_DELAY_MS = 200;
const MAP_PERFORMANCE_LOG_MARKER = "[map-perf]";

type ShadowPerformanceSample = {
  startedAt: number;
  zoom: number;
  sourceFeatureCount: number;
  shadowFeatureCount: number;
  queryMs: number;
  buildMs: number;
};

// 경로 지점 핀 색: 시작=보라, 도착=빨강 (경로 라인 파랑/초록과 겹치지 않게).
const ROUTE_PIN_START = "#7c3aed";
const ROUTE_PIN_END = "#ef4444";
const EMPTY_SHADOWS: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

// [lng, lat] 서울시청 (기본값). MapLibre는 [lng, lat] 순서.
const SEOUL: [number, number] = [126.978, 37.5665];

function SunHighIcon({ color }: { color: string }) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path
        d="M14.828 14.828a4 4 0 1 0 -5.656 -5.656a4 4 0 0 0 5.656 5.656"
        fill={color}
      />
      <Path d="M6.343 17.657l-1.414 1.414" />
      <Path d="M6.343 6.343l-1.414 -1.414" />
      <Path d="M17.657 6.343l1.414 -1.414" />
      <Path d="M17.657 17.657l1.414 1.414" />
      <Path d="M4 12h-2" />
      <Path d="M12 4v-2" />
      <Path d="M20 12h2" />
      <Path d="M12 20v2" />
    </Svg>
  );
}

function CloudIcon({ color }: { color: string }) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path
        d="M6.657 18c-2.572 0 -4.657 -2.007 -4.657 -4.483c0 -2.475 2.085 -4.482 4.657 -4.482c.393 -1.762 1.794 -3.2 3.675 -3.773c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.913 0 3.464 1.56 3.464 3.486c0 1.927 -1.551 3.487 -3.465 3.487h-11.878"
        fill={colors["neutral-0"]}
      />
    </Svg>
  );
}

/**
 * 지도 렌더 (RN). 배경지도 + 건물 PMTiles + 마커.
 * markers가 주어지면 그 지점들이 보이도록 카메라를 이동한다.
 *
 * ⚠️ 네이티브 전용(웹은 MapLibreMap.web.tsx). 건물 PMTiles 렌더 크래시(서버 no-store
 *    이슈)는 [[pmtiles-tile-caching]] 참고 — 백엔드 캐시헤더 수정 대기.
 */
export const MapLibreMap = forwardRef<MapLibreMapRef, MapLibreMapProps>(
  function MapLibreMap(
    {
      markers = [],
      connectionLines = [],
      markerFitPadding,
      autoFitMarkers = true,
      onMarkerPress,
      onMapPress,
      routeLines = [],
      routePins = [],
      onRegionChange,
    },
    ref,
  ) {
    const { t } = useI18n();
    const insets = useSafeAreaInsets();
    const cameraRef = useRef<CameraRef>(null);
    const mapRef = useRef<MapRef>(null);
    // 그림자 오버레이는 계산·브리지 비용이 크므로 사용자가 필요할 때만 켠다.
    const [shadowsEnabled, setShadowsEnabled] = useState(false);
    const [shadowControlProgress] = useState(() => new Animated.Value(0));
    const shadowControlTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );
    const shadowOverlayActive = Boolean(
      BUILDINGS_PMTILES_URL && shadowsEnabled,
    );

    const toggleShadows = useCallback(() => {
      setShadowsEnabled((enabled) => !enabled);
      if (shadowControlTimerRef.current) {
        clearTimeout(shadowControlTimerRef.current);
      }
      shadowControlProgress.stopAnimation();
      Animated.timing(shadowControlProgress, {
        toValue: 1,
        duration: 220,
        useNativeDriver: false,
      }).start();
      shadowControlTimerRef.current = setTimeout(() => {
        Animated.timing(shadowControlProgress, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start();
        shadowControlTimerRef.current = null;
      }, 1200);
    }, [shadowControlProgress]);

    useEffect(
      () => () => {
        if (shadowControlTimerRef.current) {
          clearTimeout(shadowControlTimerRef.current);
        }
      },
      [],
    );

    // 지도 중앙 좌표를 호출부에 노출(지점 선택 십자선 확정용). getCenter는 [lng,lat].
    useImperativeHandle(
      ref,
      () => ({
        getCenter: async () => {
          const map = mapRef.current;
          if (!map) {
            return null;
          }
          try {
            const c = await map.getCenter();
            return { lng: c[0], lat: c[1] };
          } catch {
            return null;
          }
        },
        focusLocation: (point) => {
          cameraRef.current?.flyTo({
            center: [point.lng, point.lat],
            zoom: 16,
            duration: 600,
          });
        },
      }),
      [],
    );

    // 프론트에서 계산하는 건물 그림자(항상 "지금" 태양 기준). 뷰포트 이동마다 갱신.
    const [shadows, setShadows] =
      useState<GeoJSON.FeatureCollection>(EMPTY_SHADOWS);
    // 초기 1회(타일 최초 렌더 완료) 그림자를 계산했는지.
    const didInitialShadowRef = useRef(false);
    const lastZoomRef = useRef(15);
    const shadowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const shadowGenerationRef = useRef(0);
    const lastReportedRegionRef = useRef<
      (MapBounds & { zoomBucket: number }) | null
    >(null);

    // 뷰포트의 건물을 조회해 그림자 폴리곤을 계산한다.
    const updateShadows = useCallback(
      async (zoom: number) => {
        // 건물 레이어가 없으면(건물 pmtiles 미설정) 그림자도 없다.
        if (!shouldBuildShadows(shadowOverlayActive, zoom)) {
          setShadows(EMPTY_SHADOWS);
          return;
        }
        const map = mapRef.current;
        if (!map) {
          return;
        }
        const generation = ++shadowGenerationRef.current;
        const startedAt = performance.now();
        try {
          const [features, center] = await Promise.all([
            map.queryRenderedFeatures({ layers: ["buildings-fill"] }),
            map.getCenter(),
          ]);
          const queriedAt = performance.now();
          if (generation !== shadowGenerationRef.current) {
            return;
          }
          const nextShadows = buildShadows(
            features,
            { lng: center[0], lat: center[1] },
            new Date(),
            {
              enabled: shadowOverlayActive,
            },
          );
          const builtAt = performance.now();
          setShadows(nextShadows);
          if (__DEV__) {
            const sample: ShadowPerformanceSample = {
              startedAt,
              zoom,
              sourceFeatureCount: features.length,
              shadowFeatureCount: nextShadows.features.length,
              queryMs: queriedAt - startedAt,
              buildMs: builtAt - queriedAt,
            };
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                if (generation !== shadowGenerationRef.current) {
                  return;
                }
                console.info(
                  `${MAP_PERFORMANCE_LOG_MARKER} ${JSON.stringify({
                    schemaVersion: 1,
                    event: "building_shadows_measured",
                    recordedAt: new Date().toISOString(),
                    zoom: Number(sample.zoom.toFixed(1)),
                    sourceFeatures: sample.sourceFeatureCount,
                    shadowFeatures: sample.shadowFeatureCount,
                    queryMs: Number(sample.queryMs.toFixed(1)),
                    buildMs: Number(sample.buildMs.toFixed(1)),
                    totalUntilNextFrameMs: Number(
                      (performance.now() - sample.startedAt).toFixed(1),
                    ),
                  })}`,
                );
              });
            });
          }
        } catch {
          // 쿼리 실패(스타일 미로드 등)는 다음 이동에서 다시 시도되므로 무시.
        }
      },
      [shadowOverlayActive],
    );

    const scheduleShadowUpdate = useCallback(
      (zoom: number) => {
        lastZoomRef.current = zoom;
        if (shadowTimerRef.current) {
          clearTimeout(shadowTimerRef.current);
        }
        if (!shouldBuildShadows(shadowOverlayActive, zoom)) {
          shadowGenerationRef.current += 1;
          setShadows(EMPTY_SHADOWS);
          return;
        }
        shadowTimerRef.current = setTimeout(() => {
          shadowTimerRef.current = null;
          void updateShadows(zoom);
        }, SHADOW_UPDATE_DELAY_MS);
      },
      [shadowOverlayActive, updateShadows],
    );

    useEffect(() => {
      if (!shadowOverlayActive) {
        didInitialShadowRef.current = false;
        shadowGenerationRef.current += 1;
      }
      scheduleShadowUpdate(lastZoomRef.current);
    }, [shadowOverlayActive, scheduleShadowUpdate]);

    useEffect(
      () => () => {
        if (shadowTimerRef.current) {
          clearTimeout(shadowTimerRef.current);
        }
      },
      [],
    );

    // 현재 뷰포트 경계를 호출부에 보고한다(뷰포트 기반 장소 조회용).
    // getBounds는 LngLatBounds = [west, south, east, north] 형태를 준다.
    const reportRegion = useCallback(
      async (bounds?: LngLatBounds, zoom?: number) => {
        if (!onRegionChange) {
          return;
        }
        try {
          const [nextBounds, nextZoom] = await Promise.all([
            bounds ?? mapRef.current?.getBounds(),
            zoom ?? mapRef.current?.getZoom(),
          ]);
          if (!nextBounds || nextZoom == null) {
            return;
          }
          const [west, south, east, north] = nextBounds;
          const normalized = normalizeMapBounds({
            swLng: west,
            swLat: south,
            neLng: east,
            neLat: north,
          });
          const zoomBucket = Math.floor(nextZoom);
          const previous = lastReportedRegionRef.current;
          if (
            previous?.swLng === normalized.swLng &&
            previous.swLat === normalized.swLat &&
            previous.neLng === normalized.neLng &&
            previous.neLat === normalized.neLat &&
            previous.zoomBucket === zoomBucket
          ) {
            return;
          }
          lastReportedRegionRef.current = { ...normalized, zoomBucket };
          onRegionChange(normalized, nextZoom);
        } catch {
          // 스타일 미로드 등 실패는 다음 이동에서 다시 시도되므로 무시.
        }
      },
      [onRegionChange],
    );

    // 마커를 개별 <Marker> 뷰 오버레이로 그리면 지점 수만큼 네이티브 View가 생기고
    // 지도를 움직일 때마다 전부 재배치돼 느리다(카테고리는 전체를 받아 수십~수백 건).
    // 하나의 GeoJSON 소스 + circle 레이어로 GPU에서 렌더해 지점이 많아도 매끄럽게 한다.
    const markersGeoJSON = useMemo<GeoJSON.FeatureCollection>(
      () => ({
        type: "FeatureCollection",
        features: markers.flatMap((m, i) =>
          m.color
            ? []
            : [
                {
                  type: "Feature",
                  // 클릭 시 원본 markers 배열에서 찾을 수 있도록 인덱스를 유지한다.
                  properties: { index: i },
                  geometry: {
                    type: "Point",
                    coordinates: [m.lng, m.lat],
                  },
                },
              ],
        ),
      }),
      [markers],
    );

    const connectionLinesGeoJSON = useMemo<GeoJSON.FeatureCollection>(
      () => ({
        type: "FeatureCollection",
        features: connectionLines.map((line) => ({
          type: "Feature",
          properties: { color: line.color },
          geometry: { type: "LineString", coordinates: line.coordinates },
        })),
      }),
      [connectionLines],
    );

    // 경로(최단·그늘)를 LineString FeatureCollection으로. shady 여부를 실어 색을 구분.
    const routesGeoJSON = useMemo<GeoJSON.FeatureCollection>(
      () => ({
        type: "FeatureCollection",
        features: routeLines.map((line) => ({
          type: "Feature",
          properties: { shady: line.shady },
          geometry: { type: "LineString", coordinates: line.coordinates },
        })),
      }),
      [routeLines],
    );

    // 경로 시작/도착 핀 — 시작(start) 여부를 실어 색을 구분.
    const routePinsGeoJSON = useMemo<GeoJSON.FeatureCollection>(
      () => ({
        type: "FeatureCollection",
        features: routePins.map((pin) => ({
          type: "Feature",
          properties: { start: pin.kind === "start" },
          geometry: { type: "Point", coordinates: [pin.lng, pin.lat] },
        })),
      }),
      [routePins],
    );

    // 사용자가 요청해 확보한 현위치([lng, lat]). 나침반 버튼에서 재사용한다.
    const userLocationRef = useRef<[number, number] | null>(null);

    // 마커(circle) 탭 → 인덱스로 원본 마커를 되찾아 상세를 호출부에 알린다.
    const handleMarkerPress = (
      e: NativeSyntheticEvent<{ features: GeoJSON.Feature[] }>,
    ) => {
      const index = e.nativeEvent.features?.[0]?.properties?.index;
      if (typeof index === "number" && markers[index]) {
        onMarkerPress?.(markers[index]!);
      }
    };

    // 나침반 버튼: 현위치로 이동 (없으면 다시 요청, 거부/실패 시 기본값 유지).
    const recenter = async () => {
      const loc = userLocationRef.current ?? (await getCurrentLocation());
      if (loc) {
        userLocationRef.current = loc;
      }
      cameraRef.current?.flyTo({
        center: loc ?? SEOUL,
        zoom: 15,
        duration: 600,
      });
    };

    // markers가 바뀌면 그 지점들로 카메라 이동 (autoFitMarkers=false면 이동 안 함:
    // 뷰포트 기반 카테고리 조회에서 카메라 자동 이동 → 재조회 루프를 막는다)
    useEffect(() => {
      if (markers.length === 0 || !autoFitMarkers) {
        return;
      }
      if (markers.length === 1) {
        const m = markers[0]!;
        cameraRef.current?.flyTo({
          center: [m.lng, m.lat],
          zoom: 16,
          duration: 600,
        });
        return;
      }
      const lngs = markers.map((m) => m.lng);
      const lats = markers.map((m) => m.lat);
      cameraRef.current?.fitBounds(
        [
          Math.min(...lngs),
          Math.min(...lats),
          Math.max(...lngs),
          Math.max(...lats),
        ],
        { padding: markerFitPadding, duration: 600 },
      );
    }, [markers, autoFitMarkers, markerFitPadding]);

    // 경로가 그려지면 전체 경로가 보이도록 카메라 이동(패딩 줘서 잘리지 않게).
    useEffect(() => {
      if (routeLines.length === 0) {
        return;
      }
      const coords = routeLines.flatMap((line) => line.coordinates);
      if (coords.length === 0) {
        return;
      }
      const lngs = coords.map((c) => c[0]!);
      const lats = coords.map((c) => c[1]!);
      cameraRef.current?.fitBounds(
        [
          Math.min(...lngs),
          Math.min(...lats),
          Math.max(...lngs),
          Math.max(...lats),
        ],
        // 하단 상세 카드/범례에 가리지 않도록 아래쪽 패딩을 크게 준다.
        {
          padding: { top: 80, right: 60, bottom: 220, left: 60 },
          duration: 600,
        },
      );
    }, [routeLines]);

    return (
      <View style={StyleSheet.absoluteFill}>
        <Map
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          mapStyle={BASEMAP_STYLE_URL}
          // attributionControl:false — 정보(ⓘ) 버튼·로고 숨김
          attribution={false}
          logo={false}
          onPress={onMapPress}
          // 이동/줌 종료 시 그림자 재계산 + 뷰포트 경계 보고
          onRegionDidChange={(event) => {
            scheduleShadowUpdate(event.nativeEvent.zoom);
            void reportRegion(
              event.nativeEvent.bounds,
              event.nativeEvent.zoom,
            );
          }}
          // 최초 타일 렌더 완료 시 1회 계산(정지 상태에서도 그림자가 뜨도록) + 초기 뷰포트 보고
          onDidFinishRenderingMapFully={() => {
            void reportRegion();
            if (!shadowOverlayActive || didInitialShadowRef.current) {
              return;
            }
            didInitialShadowRef.current = true;
            scheduleShadowUpdate(lastZoomRef.current);
          }}
        >
          <Camera
            ref={cameraRef}
            initialViewState={{ center: SEOUL, zoom: 15 }}
          />

          {/* 그림자를 건물보다 먼저 선언 → 건물이 그림자 위에 그려진다. */}
          {shadowOverlayActive ? (
            <GeoJSONSource id="shadows" data={shadows}>
              <Layer
                id="buildings-shadow"
                type="fill"
                minzoom={MIN_SHADOW_ZOOM}
                paint={{
                  "fill-color": SHADOW_COLOR,
                  "fill-opacity": 0.35,
                }}
              />
            </GeoJSONSource>
          ) : null}

          {shadowOverlayActive ? (
            <VectorSource
              id="buildings"
              url={`pmtiles://${BUILDINGS_PMTILES_URL}`}
              minzoom={MIN_SHADOW_ZOOM}
            >
              <Layer
                id="buildings-fill"
                type="fill"
                minzoom={MIN_SHADOW_ZOOM}
                source-layer={BUILDINGS_SOURCE_LAYER}
                paint={{
                  "fill-color": colors["neutral-600"],
                  "fill-opacity": 0.55,
                  "fill-outline-color": colors["neutral-700"],
                }}
              />
            </VectorSource>
          ) : null}

          {routeLines.length > 0 && (
            <GeoJSONSource id="routes" data={routesGeoJSON}>
              <Layer
                id="routes-line"
                type="line"
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{
                  // shady=초록(그늘길), 그 외=파랑(최단)
                  "line-color": [
                    "case",
                    ["get", "shady"],
                    ROUTE_COLORS.shady,
                    ROUTE_COLORS.shortest,
                  ],
                  "line-width": 5,
                  "line-opacity": 0.85,
                }}
              />
            </GeoJSONSource>
          )}

          {connectionLines.length > 0 && (
            <GeoJSONSource
              id="marker-connections"
              data={connectionLinesGeoJSON}
            >
              <Layer
                id="marker-connections-line"
                type="line"
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{
                  "line-color": ["get", "color"],
                  "line-width": 2,
                  "line-opacity": 0.62,
                  "line-dasharray": [0.35, 1.15],
                }}
              />
            </GeoJSONSource>
          )}

          {markersGeoJSON.features.length > 0 && (
            <GeoJSONSource
              id="place-markers"
              data={markersGeoJSON}
              onPress={handleMarkerPress}
            >
              <Layer
                id="place-markers-circle"
                type="circle"
                minzoom={0}
                paint={{
                  "circle-radius": 6,
                  "circle-color": colors.primary,
                  "circle-stroke-width": 2,
                  "circle-stroke-color": colors["neutral-0"],
                }}
              />
            </GeoJSONSource>
          )}

          {markers.map((marker, index) =>
            marker.color ? (
              <MapMarkerView
                key={`course-marker-${index}-${marker.lat}-${marker.lng}`}
                id={`course-marker-${index}`}
                lngLat={[marker.lng, marker.lat]}
                anchor="center"
                onPress={() => onMarkerPress?.(marker)}
              >
                {marker.sequenceLabel ? (
                  <View
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={marker.label}
                    className="size-7 items-center justify-center rounded-full border-2 border-neutral-0"
                    style={{ backgroundColor: marker.color }}
                  >
                    <Text className="text-label-sm text-neutral-0">
                      {marker.sequenceLabel}
                    </Text>
                  </View>
                ) : (
                  <View
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={marker.label}
                    className="size-5 items-center justify-center rounded-full border-2 border-neutral-0"
                    style={{ backgroundColor: marker.color }}
                  >
                    <View className="size-2 rounded-full bg-neutral-0" />
                  </View>
                )}
              </MapMarkerView>
            ) : null,
          )}

          {/* 경로 시작/도착 핀 — 마커 위에 올려 잘 보이게. 시작=보라, 도착=빨강 */}
          {routePins.length > 0 && (
            <GeoJSONSource id="route-pins" data={routePinsGeoJSON}>
              <Layer
                id="route-pins-circle"
                type="circle"
                paint={{
                  "circle-radius": 9,
                  "circle-color": [
                    "case",
                    ["get", "start"],
                    ROUTE_PIN_START,
                    ROUTE_PIN_END,
                  ],
                  "circle-stroke-width": 3,
                  "circle-stroke-color": colors["neutral-0"],
                }}
              />
            </GeoJSONSource>
          )}
        </Map>

        <View
          pointerEvents="box-none"
          className="absolute right-4 items-end gap-2"
          style={{ top: insets.top + 64 }}
        >
          {BUILDINGS_PMTILES_URL ? (
            <Animated.View
              className="shadow-md"
              style={{
                height: 44,
                borderRadius: 22,
                width: shadowControlProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [44, 116],
                }),
              }}
            >
              <Pressable
                accessibilityRole="switch"
                accessibilityLabel={t("map.shadows.toggle")}
                accessibilityState={{ checked: shadowsEnabled }}
                onPress={toggleShadows}
                className={
                  shadowsEnabled
                    ? "h-full w-full flex-row items-center overflow-hidden rounded-full bg-secondary px-3 active:bg-secondary-700"
                    : "h-full w-full flex-row items-center overflow-hidden rounded-full bg-neutral-0 px-3 active:bg-surface-muted"
                }
              >
                {shadowsEnabled ? (
                  <CloudIcon color={colors["neutral-0"]} />
                ) : (
                  <SunHighIcon color={colors["text-secondary"]} />
                )}
                <Animated.View
                  className="ml-2"
                  style={{ opacity: shadowControlProgress }}
                >
                  <Text
                    numberOfLines={1}
                    className={
                      shadowsEnabled
                        ? "text-label-sm text-neutral-0"
                        : "text-label-sm text-text-secondary"
                    }
                  >
                    {t(shadowsEnabled ? "map.shadows.on" : "map.shadows.off")}
                  </Text>
                </Animated.View>
              </Pressable>
            </Animated.View>
          ) : null}

          <View
            pointerEvents="box-none"
            className="shadow-md"
            style={{ width: 44, height: 44, borderRadius: 22 }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("map.recenter")}
              onPress={() => void recenter()}
              className="h-full w-full items-center justify-center overflow-hidden rounded-full bg-neutral-0 active:bg-surface-muted"
            >
              <LocateFixed size={24} color={colors.text} />
            </Pressable>
          </View>
        </View>
      </View>
    );
  },
);
