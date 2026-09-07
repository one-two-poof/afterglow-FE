/**
 * 경로(그늘 경로) API 클라이언트.
 * 두 지점(from→to)을 받아 실제 경로(GeoJSON LineString)를 돌려준다.
 * 응답 routes[]에는 최단(shortest)·그늘(shady) 두 경로가 함께 온다.
 * at은 항상 현재 시각(그림자/그늘 계산 기준).
 */
import type { LatLng } from "@afterglow/utils";

import { apiClient } from "@/lib/axios";

/** 경로 API 요청 좌표 — 위경도(lat/lon) */
export interface RoutePoint {
  lat: number;
  lon: number;
}

export interface RouteRequest {
  from: RoutePoint;
  to: RoutePoint;
  /** ISO 8601. 항상 현재 시각 */
  at: string;
}

export interface RouteResult {
  lambda: number;
  /** "shortest" | "shady" */
  label: string;
  distanceM: number;
  avgShadeRatio: number;
  /** GeoJSON LineString (coordinates: [lng, lat][]) */
  geometry: {
    type: string;
    coordinates: number[][];
  };
}

export interface RouteResponse {
  at: string;
  routes: RouteResult[];
}

/** 지도에 그릴 한 경로 (좌표 + 그늘 정보) */
export interface RouteLine {
  /** LineString 좌표 ([lng, lat][]) */
  coordinates: number[][];
  /** 경로 라벨 (예: "shortest", "shady") */
  label: string;
  /** 평균 그늘 비율 (0~1). 높을수록 그늘짐 */
  shadeRatio: number;
  /** 그늘 우선(shady) 경로인지. 최단(shortest)은 false */
  shady: boolean;
}

/** 경로 색: 최단=파랑, 그늘길=초록. 지도 라인·범례에서 공용. */
export const ROUTE_COLORS = {
  shortest: "#2563eb",
  shady: "#16a34a",
} as const;

/** label에 "shad" 포함 → 그늘 경로로 판정 (백엔드: "shortest" / "shady") */
const isShady = (label: string): boolean => /shad/i.test(label);

/** 한 구간(from→to) 경로 조회. signal로 진행 중 요청을 취소할 수 있다. */
export async function fetchRoute(
  req: RouteRequest,
  signal?: AbortSignal,
): Promise<RouteResponse> {
  const { data } = await apiClient.post<RouteResponse>("/api/route", req, {
    signal,
  });
  return data;
}

/**
 * 내 위치 → 장소 경로를 조회해 지도에 그릴 라인들로 변환한다.
 * @param from   출발(내 위치) 위경도
 * @param to     도착(장소) 위경도
 * @param signal 진행 중 요청 취소용 AbortSignal
 */
export async function fetchRouteLines(
  from: LatLng,
  to: LatLng,
  signal?: AbortSignal,
): Promise<RouteLine[]> {
  const res = await fetchRoute(
    {
      from: { lat: from.lat, lon: from.lng },
      to: { lat: to.lat, lon: to.lng },
      at: new Date().toISOString(),
    },
    signal,
  );

  return res.routes
    .filter((route) => route.geometry?.coordinates?.length)
    .map((route) => ({
      coordinates: route.geometry.coordinates,
      label: route.label,
      shadeRatio: route.avgShadeRatio,
      shady: isShady(route.label),
    }));
}
