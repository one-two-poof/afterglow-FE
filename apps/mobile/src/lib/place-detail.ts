import type { PlaceDetail } from "@/types/place";

export type PlaceDetailFactKey =
  | "skinTreatmentConfidence"
  | "skinTreatmentSignals"
  | "isIndoor"
  | "isHeatSource"
  | "isMassageSpot"
  | "walkHard"
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
  "text" | "boolean" | "availability" | "confidence" | "difficulty" | "link";

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
    { key: "skinTreatmentConfidence", format: "confidence" },
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
    { key: "isMassageSpot", format: "boolean" },
    { key: "walkHard", format: "difficulty" },
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

export function buildPlaceDetailFacts(detail: DetailLike): PlaceDetailFact[] {
  const definitions =
    FACTS_BY_PLACE_TYPE[detail.placeType?.toUpperCase() ?? ""] ?? [];

  return definitions.flatMap((definition) => {
    const source =
      definition.source === "extraInfo" ? detail.extraInfo : detail;
    const value = source?.[definition.key];
    if (!isPresent(value)) return [];

    return [
      {
        key: definition.key,
        value: typeof value === "string" ? value.trim() : value,
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
        const safeUrl = getSafeWebUrl(candidate);
        return safeUrl ? [safeUrl] : [];
      }),
    ),
  ];
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
