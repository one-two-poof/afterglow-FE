/**
 * 장소 API(GET /api/places) 응답 아이템 (백엔드 계약).
 * 숙소·병원·관광지 등 코스에 사용할 수 있는 장소 엔티티.
 *
 * 웹 apps/web/src/types/place.ts와 동일. 향후 공유가 늘면 packages/types로 승격 고려.
 */
export interface Place {
  id: number;
  /** 외부(카카오 등) 장소 식별자 */
  placeId: string;
  /** 관광공사 콘텐츠 ID */
  tourismContentId: string;
  placeName: string;
  categoryName: string;
  categoryGroupName: string;
  addressName: string;
  roadAddressName: string;
  /** 좌표 X */
  mapX: number;
  /** 좌표 Y */
  mapY: number;
  image: string;
  phone: string;
  placeUrl: string;
  source: string;
  /** 이미지가 수동 지정(오버라이드)되었는지 */
  imageOverridden: boolean;
  /** 동기화 시각 (ISO 8601) */
  syncedAt: string;
  /** 장소 유형 (예: "HOSPITAL"). 값 확정 시 union으로 좁힐 것 */
  placeType: string;
  primaryType: string;
  primaryTypeName: string;
  collectionTypes: string;
  skinTreatmentConfidence: string;
  skinTreatmentSignals: string;
  /** 실내 여부 */
  isIndoor: boolean;
  /** 열원(더위 유발) 여부 */
  isHeatSource: boolean;
  isMassageSpot: boolean;
  /** 도보 난이도 */
  walkHard: number;
  /** 데이터 결측(N/A) 여부 */
  isNa: boolean;
}

export type PlaceExtraInfo = Record<string, string | number | boolean | null>;

/** GET /api/places/:id 상세 응답. 장소 유형에 따라 extraInfo 키가 달라진다. */
export interface PlaceDetail {
  id: number;
  placeId: string | null;
  tourismContentId: string | null;
  placeName: string;
  categoryName: string;
  addressName: string;
  mapX: number;
  mapY: number;
  image: string | null;
  phone: string | null;
  placeUrl: string | null;
  source: string;
  placeType: string;
  primaryTypeName: string | null;
  skinTreatmentConfidence: string | null;
  skinTreatmentSignals: string | null;
  isIndoor: boolean | null;
  isHeatSource: boolean | null;
  isMassageSpot: boolean | null;
  walkHard: number | null;
  overview: string | null;
  images: string[] | null;
  extraInfo: PlaceExtraInfo | null;
  popularity: number | null;
}
