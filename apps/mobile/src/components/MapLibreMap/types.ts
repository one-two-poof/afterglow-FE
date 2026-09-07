import type { RouteLine } from "@/lib/route";

/** 마커 클릭 시 하단 카드에 표시할 상세 정보. */
export interface MarkerDetail {
  /** Backend place identifier used to load the full detail payload. */
  id?: number;
  title: string;
  /** 카테고리·방문순서 등 보조 라인 */
  subtitle?: string;
  /** 주소·거리·실내여부 등 설명 라인 */
  description?: string;
  /** Postal address shown and copied separately from itinerary metadata. */
  address?: string;
  /** 썸네일 이미지 URL */
  image?: string;
  /** Phone number shown in the expanded place sheet. */
  phone?: string;
  /** 기본 썸네일을 고르는 상위 장소 유형 */
  placeType?: string;
  /** 관광지 기본 썸네일을 고르는 세부 분류명 */
  primaryTypeName?: string;
}

/** 지도에 찍을 마커 (웹 MapMarker와 동일 개념). */
export interface MapMarker {
  lat: number;
  lng: number;
  label?: string;
  /** Optional visual treatment used by ordered course markers. */
  color?: string;
  /** Text rendered inside the marker (for example, a visit order). */
  sequenceLabel?: string;
  /** 마커 클릭 시 보여줄 상세(없으면 카드 미표시) */
  detail?: MarkerDetail;
}

/** A lightweight decorative line connecting related map markers. */
export interface MapConnectionLine {
  coordinates: number[][];
  color: string;
}

export interface MapCameraPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * 지도 뷰포트(현재 화면에 보이는 영역)의 남서/북동 경계. 장소 API의
 * swLat/neLat/swLng/neLng 뷰포트 필터 파라미터에 그대로 대응한다.
 */
export interface MapBounds {
  swLat: number;
  neLat: number;
  swLng: number;
  neLng: number;
}

/** 경로 시작/도착 지점 핀. 색으로 시작(start)·도착(end)을 구분한다. */
export interface RoutePin {
  lat: number;
  lng: number;
  kind: "start" | "end";
}

/** MapLibreMap 임퍼러티브 핸들. 지점 선택(중앙 십자선) 확정 등에 사용. */
export interface MapLibreMapRef {
  /** 현재 지도 중앙 좌표(없으면 null). */
  getCenter: () => Promise<{ lat: number; lng: number } | null>;
  /** 선택한 장소로 카메라를 다시 이동한다. */
  focusLocation: (point: { lat: number; lng: number }) => void;
}

export interface MapLibreMapProps {
  /** 지도에 표시할 마커들. 바뀌면 그 마커들이 보이도록 카메라가 이동한다. */
  markers?: MapMarker[];
  /** Straight decorative connections between markers, rendered below them. */
  connectionLines?: MapConnectionLine[];
  /** Padding used when fitting all markers into view. */
  markerFitPadding?: MapCameraPadding;
  /**
   * markers가 바뀔 때 그 지점들로 카메라를 이동할지. 기본 true.
   * 뷰포트 기반 조회(카테고리)처럼 사용자가 직접 지도를 움직여 마커가 갱신되는
   * 경우엔 false로 주어 카메라 자동 이동(→ 재조회 루프)을 막는다.
   */
  autoFitMarkers?: boolean;
  /** 마커 클릭 시 호출(상세 카드는 호출부에서 렌더). */
  onMarkerPress?: (marker: MapMarker) => void;
  /** Called when the map background is tapped. */
  onMapPress?: () => void;
  /** 그릴 경로들(최단·그늘). 색은 shady 여부로 구분. 바뀌면 경로가 보이도록 카메라 이동. */
  routeLines?: RouteLine[];
  /** 경로 시작·도착 지점 핀(경로 설정 중 표시). */
  routePins?: RoutePin[];
  /**
   * 지도 이동이 끝나(정착) 뷰포트가 바뀔 때, 그리고 최초 렌더 완료 시 호출.
   * 현재 보이는 영역 경계와 줌을 넘겨 뷰포트 기반 장소 조회에 쓴다.
   */
  onRegionChange?: (bounds: MapBounds, zoom: number) => void;
}
