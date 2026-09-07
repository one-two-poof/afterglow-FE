import type { PlaceDetail } from "@/types/place";

export type PlaceDetailFactKey =
  | "skinTreatmentSignals"
  | "isIndoor"
  | "isHeatSource"
  | "popularity"
  | "mainSubject"
  | "specialProcedure"
  | "serviceLanguage"
  | "homepage"
  | "history"
  | "onlineReservation"
  | "specialFacility"
  | "checkinTime"
  | "checkoutTime"
  | "roomCount"
  | "parking"
  | "cooking"
  | "pickup"
  | "scale"
  | "useTime"
  | "restDate"
  | "expGuide"
  | "infoCenter";

export type PlaceDetailFactFormat =
  "text" | "boolean" | "availability" | "link";

export interface PlaceDetailFact {
  key: PlaceDetailFactKey;
  value: string | number | boolean;
  format: PlaceDetailFactFormat;
}

export function buildPlaceDetailRequest(id: number, placeType: string) {
  return {
    url: `/api/places/${id}`,
    params: { placeType: placeType.toUpperCase() },
  };
}

type DetailLike = Partial<PlaceDetail> & {
  placeType?: string | null;
  extraInfo?: PlaceDetail["extraInfo"];
};

type FactDefinition = {
  key: PlaceDetailFactKey;
  format?: PlaceDetailFactFormat;
  source?: "detail" | "extraInfo";
};

const FACTS_BY_PLACE_TYPE: Record<string, FactDefinition[]> = {
  HOSPITAL: [
    { key: "skinTreatmentSignals" },
    { key: "mainSubject", source: "extraInfo" },
    { key: "specialProcedure", source: "extraInfo" },
    { key: "serviceLanguage", source: "extraInfo" },
    { key: "homepage", source: "extraInfo", format: "link" },
    { key: "history", source: "extraInfo" },
    {
      key: "onlineReservation",
      source: "extraInfo",
      format: "availability",
    },
    { key: "specialFacility", source: "extraInfo" },
  ],
  ACCOMMODATION: [
    { key: "checkinTime", source: "extraInfo" },
    { key: "checkoutTime", source: "extraInfo" },
    { key: "roomCount", source: "extraInfo" },
    { key: "parking", source: "extraInfo" },
    { key: "cooking", source: "extraInfo" },
    { key: "pickup", source: "extraInfo" },
    { key: "scale", source: "extraInfo" },
  ],
  ATTRACTION: [
    { key: "isIndoor", format: "boolean" },
    { key: "isHeatSource", format: "boolean" },
    { key: "popularity" },
    { key: "useTime", source: "extraInfo" },
    { key: "restDate", source: "extraInfo" },
    { key: "parking", source: "extraInfo" },
    { key: "expGuide", source: "extraInfo" },
    { key: "infoCenter", source: "extraInfo" },
  ],
};

const isPresent = (value: unknown): value is string | number | boolean =>
  typeof value === "boolean" ||
  typeof value === "number" ||
  (typeof value === "string" && value.trim().length > 0);

const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

/** 관광 API의 간단한 HTML을 React Native Text에 맞는 평문으로 바꾼다. */
export function normalizePlaceDetailText(value: string): string {
  return value
    .replace(/<!--[^]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
      if (code[0] !== "#") {
        return NAMED_HTML_ENTITIES[code.toLowerCase()] ?? entity;
      }
      const radix = code[1]?.toLowerCase() === "x" ? 16 : 10;
      const digits = radix === 16 ? code.slice(2) : code.slice(1);
      const point = Number.parseInt(digits, radix);
      return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
    })
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildPlaceDetailFacts(detail: DetailLike): PlaceDetailFact[] {
  const definitions =
    FACTS_BY_PLACE_TYPE[detail.placeType?.toUpperCase() ?? ""] ?? [];

  return definitions.flatMap((definition) => {
    const rawValue =
      definition.source === "extraInfo"
        ? detail.extraInfo?.[definition.key]
        : detail[definition.key as keyof DetailLike];
    const value =
      typeof rawValue === "string"
        ? normalizePlaceDetailText(rawValue)
        : rawValue;
    if (!isPresent(value)) return [];

    return [
      {
        key: definition.key,
        value,
        format: definition.format ?? "text",
      },
    ];
  });
}

export function getPlaceDetailImages({
  image,
  images,
}: {
  image?: string | null;
  images?: string[] | null;
}): string[] {
  const candidates = [image, ...(Array.isArray(images) ? images : [])];
  return [
    ...new Set(
      candidates.flatMap((candidate) => {
        const safeUrl = normalizePlaceImageUrl(candidate);
        return safeUrl ? [safeUrl] : [];
      }),
    ),
  ];
}

/** iOS에서 차단되는 관광공사 HTTP 이미지 주소를 HTTPS로 승격한다. */
export function normalizePlaceImageUrl(value: unknown): string | undefined {
  const safeUrl = getSafeWebUrl(value);
  if (!safeUrl) return undefined;

  const url = new URL(safeUrl);
  if (
    url.protocol === "http:" &&
    url.hostname.toLowerCase() === "tong.visitkorea.or.kr"
  ) {
    url.protocol = "https:";
  }
  return url.toString();
}

export function getSafeWebUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}
