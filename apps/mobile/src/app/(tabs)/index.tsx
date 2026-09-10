import { useToastStore } from "@afterglow/stores";
import { colors } from "@afterglow/tokens";
import { Input, TagList } from "@afterglow/ui-native";
import { toLatLng } from "@afterglow/utils";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  Crosshair,
  Flag,
  LocateFixed,
  MapPin,
  Navigation,
  Plus,
  Search,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  type ColorValue,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { MapLibreMap } from "@/components/MapLibreMap";
import { PlaceDefaultIcon } from "@/components/PlaceDefaultIcon";
import { PlaceDetailSheet } from "@/components/PlaceDetailSheet";
import { PlaceThumbnail } from "@/components/PlaceThumbnail";
import { TopScrim } from "@/components/TopScrim";
import {
  type MapBounds,
  type MapLibreMapRef,
  type MapMarker,
  type MarkerDetail,
  type RoutePin,
} from "@/components/MapLibreMap/types";
import { getCurrentLocation } from "@/lib/location";
import {
  buildMapUrl,
  copyPlaceToClipboard,
  type MapProvider,
} from "@/lib/place-actions";
import { findClosestPlace, findClosestPlaceAddress } from "@/lib/place-match";
import { fetchPlaces } from "@/lib/places";
import { fetchRouteLines, ROUTE_COLORS, type RouteLine } from "@/lib/route";
import { TripPlanPanel } from "@/components/TripPlanPanel";
import { useAccessToken } from "@/hooks/use-access-token";
import { useCategoryPlaces } from "@/hooks/use-category-places";
import { useDebounce } from "@/hooks/use-debounce";
import { usePlaces } from "@/hooks/use-places";
import { useRecommendations } from "@/hooks/use-recommendations";
import { useI18n } from "@/i18n/i18n-provider";
import { type PlaceCategory } from "@/lib/places";
import { type Place } from "@/types/place";
import {
  type CourseMarker,
  type RecommendedCourse,
  courseTitle,
  recommendedCourseToMapDecoration,
  savedCourseToMapDecoration,
} from "@/types/recommendation";

// 필터 해제(기본) 값. "전체" = 모든 마커 해제. 저장 코스 태그는 selectionId 문자열,
// 카테고리 태그는 PlaceCategory 문자열을 값으로 쓴다.
const FILTER_ALL = "all";

// 지도 카테고리 필터 태그. "전체"는 필터 해제.
const PLACE_CATEGORIES: PlaceCategory[] = [
  "hospital",
  "attraction",
  "accommodation",
];

const EMPTY_PLACES: Place[] = [];
const CATEGORY_MIN_ZOOM = 14;
const SAVED_COURSE_MAP_PADDING = {
  top: 150,
  right: 48,
  bottom: 180,
  left: 48,
} as const;

const formatLegendDate = (iso: string, locale: string) => {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat(locale, {
    month: "numeric",
    day: "numeric",
  }).format(new Date(year, month - 1, day, 12));
};

function CourseDayLegend({
  days,
  locale,
}: {
  days: { date: string; color: string }[];
  locale: string;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="items-center gap-2"
      accessibilityRole="summary"
    >
      {days.map((day, index) => (
        <View
          key={`${day.date}-${index}`}
          className="h-8 gap-2 border-border bg-neutral-0 px-3 shadow-sm flex-row items-center rounded-full border"
        >
          <View
            className="size-2.5 rounded-full"
            style={{ backgroundColor: day.color }}
          />
          <Text className="text-label-sm text-text">
            DAY {index + 1} · {formatLegendDate(day.date, locale)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

function MapRouteIcon({ color }: { color: ColorValue }) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M3 7l6 -3l6 3l6 -3v13l-6 3l-6 -3l-6 3v-13" />
      <Path d="M9 12v.01" />
      <Path d="M6 13v.01" />
      <Path d="M17 15l-4 -4" />
      <Path d="M13 15l4 -4" />
    </Svg>
  );
}

/** 경로 시작/도착 지점 좌표 */
type LatLngPoint = { lat: number; lng: number };

/** 장소(Place) → 마커 상세 카드 정보. */
const placeToDetail = (place: Place): MarkerDetail => ({
  id: place.id,
  title: place.placeName,
  subtitle: place.categoryName || place.categoryGroupName || undefined,
  address: place.roadAddressName || place.addressName || undefined,
  image: place.image || undefined,
  phone: place.phone || undefined,
  placeType: place.placeType,
  primaryTypeName: place.primaryTypeName,
});

const resolveMarkerAddress = async (marker: MapMarker) => {
  if (!marker.detail || marker.detail.address) {
    return marker.detail?.address;
  }

  const places = await fetchPlaces(marker.detail.title);
  return findClosestPlaceAddress(places, {
    name: marker.detail.title,
    lat: marker.lat,
    lng: marker.lng,
  });
};

/**
 * 홈 = 전체화면 지도 + 상단 검색 오버레이 + 하단 카테고리/코스 태그 + 여행 계획(+)
 * 버튼.
 *
 * 검색: 입력을 300ms 디바운스해 /api/places 조회, 결과를 지도 위 드롭다운으로.
 * 태그: 카테고리(병원/관광명소/숙소) 또는 저장 코스를 고르면 해당 지점들을 마커로.
 * "전체"는 모든 마커를 해제한다.
 */
export default function HomeScreen() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const {
    savedCourseId,
    markerLat,
    markerLng,
    markerLabel,
    tourismPlaceId,
    tourismPlaceType,
    tourismPlaceName,
    tourismPlaceCategory,
    tourismPlaceAddress,
    tourismPlaceLat,
    tourismPlaceLng,
    tourismPlaceImage,
    tourismPlacePhone,
    tourismPlacePrimaryTypeName,
  } = useLocalSearchParams<{
    savedCourseId?: string;
    markerLat?: string;
    markerLng?: string;
    markerLabel?: string;
    tourismPlaceId?: string;
    tourismPlaceType?: string;
    tourismPlaceName?: string;
    tourismPlaceCategory?: string;
    tourismPlaceAddress?: string;
    tourismPlaceLat?: string;
    tourismPlaceLng?: string;
    tourismPlaceImage?: string;
    tourismPlacePhone?: string;
    tourismPlacePrimaryTypeName?: string;
  }>();
  const insets = useSafeAreaInsets();
  const showToast = useToastStore((s) => s.show);
  const [planOpen, setPlanOpen] = useState(false);
  const [previewCourse, setPreviewCourse] = useState<RecommendedCourse>();
  // 추천 코스에서 탭한 장소의 마커(지도에 찍고 카메라 이동 + 상세 카드 표시).
  // null이 아니면 "패널에서 열린 상세"라는 뜻 → 상세 카드 X를 누르면 패널로 복귀한다.
  const [coursePlaceMarker, setCoursePlaceMarker] = useState<MapMarker | null>(
    null,
  );
  // 내 코스 상세에서 특정 장소를 열었을 때만 사용하는 마커. 추천 결과 패널의
  // coursePlaceMarker와 분리해 상세를 닫을 때 여행 계획 패널이 열리지 않게 한다.
  const [savedCoursePlaceMarker, setSavedCoursePlaceMarker] =
    useState<MapMarker | null>(null);

  const [search, setSearch] = useState("");
  // 드롭다운 열림 여부. 결과 선택 시 닫아 재요청을 막는다.
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  // 선택된 저장 코스 태그(selectionId 문자열) 또는 FILTER_ALL(해제).
  const [filter, setFilter] = useState(FILTER_ALL);
  // 마커 클릭 시 하단에 띄울 상세. 마커 셋을 바꾸는 동작(검색/코스/카테고리 전환)에서 닫는다.
  const [detail, setDetail] = useState<MapMarker | null>(null);
  const [detailExpanded, setDetailExpanded] = useState(false);
  // 줌 14 이상일 때만 현재 뷰포트 경계를 유지해 카테고리 장소를 조회한다.
  const [viewport, setViewport] = useState<MapBounds | null>(null);
  const [mapZoom, setMapZoom] = useState<number | null>(null);

  const updateViewport = useCallback((bounds: MapBounds, zoom: number) => {
    setMapZoom(zoom);
    setViewport(zoom >= CATEGORY_MIN_ZOOM ? bounds : null);
  }, []);
  // 경로 안내로 그린 경로(최단·그늘). 상세/마커가 바뀌면 지운다.
  const [routeLines, setRouteLines] = useState<RouteLine[]>([]);
  const [routing, setRouting] = useState(false);
  // 진행 중인 경로 요청 취소용. 카드 닫기·다른 대상 선택 시 abort한다.
  const routeAbortRef = useRef<AbortController | null>(null);
  // 지도 중앙 좌표를 읽기 위한 핸들(지점 선택 십자선 확정용).
  const mapRef = useRef<MapLibreMapRef>(null);

  // 경로 설정 패널: "경로 안내"를 누르면 열려 시작지·도착지를 정한 뒤 경로를 찾는다.
  const [routePlanOpen, setRoutePlanOpen] = useState(false);
  // 시작지. null이면 "현위치"(요청 시점에 위치 조회), 좌표면 지도에서 고른 지점.
  const [startPoint, setStartPoint] = useState<LatLngPoint | null>(null);
  // 도착지. 기본은 클릭한 장소, 지도로 변경 가능. label은 표시용(없으면 "지도에서 선택한 지점").
  const [endPoint, setEndPoint] = useState<
    (LatLngPoint & { label?: string }) | null
  >(null);
  // 중앙 십자선으로 지정 중인 지점. null이면 지정 모드 아님.
  const [picking, setPicking] = useState<"start" | "end" | null>(null);

  // 진행 중인 경로 요청이 있으면 취소하고 로딩 상태를 내린다.
  const cancelRoute = useCallback(() => {
    routeAbortRef.current?.abort();
    routeAbortRef.current = null;
    setRouting(false);
  }, []);

  const debouncedSearch = useDebounce(search, 300);
  const searchEnabled = searchOpen && debouncedSearch.trim() !== "";
  const { data: results = [], isFetching } = usePlaces(debouncedSearch, {
    enabled: searchEnabled,
  });

  // 저장된 내 코스 — 로그인 상태에서만 조회 (하단 태그로 표시).
  const token = useAccessToken();
  const isAuthed = typeof token === "string";
  const { data: courses = [], refetch: refetchCourses } =
    useRecommendations(isAuthed);

  // 비활성 탭은 freeze되어 blur 중 토큰 변경(로그인)을 놓칠 수 있다. 홈이 다시
  // 포커스될 때(예: 로그인 직후 replace("/"))마다 저장 코스를 재조회해, 별도 탭을
  // 거치지 않아도 태그리스트가 바로 뜨도록 한다.
  useFocusEffect(
    useCallback(() => {
      if (isAuthed) void refetchCourses();
    }, [isAuthed, refetchCourses]),
  );
  const selectedCourse = courses.find(
    (course) => String(course.selectionId) === filter,
  );
  const selectedCourseMap = useMemo(
    () => (selectedCourse ? savedCourseToMapDecoration(selectedCourse) : null),
    [selectedCourse],
  );
  const previewCourseMap = useMemo(
    () =>
      previewCourse ? recommendedCourseToMapDecoration(previewCourse) : null,
    [previewCourse],
  );

  useEffect(() => {
    if (!detail?.detail || detail.detail.address) return;

    let active = true;
    void resolveMarkerAddress(detail)
      .then((address) => {
        if (!active || !address) return;
        setDetail((current) => {
          if (
            !current?.detail ||
            current.lat !== detail.lat ||
            current.lng !== detail.lng ||
            current.detail.title !== detail.detail?.title
          ) {
            return current;
          }
          return {
            ...current,
            detail: { ...current.detail, address },
          };
        });
      })
      .catch(() => {
        // Address enrichment is optional; keep the course detail usable.
      });

    return () => {
      active = false;
    };
  }, [detail]);

  // 카테고리 태그(병원/관광명소/숙소) 선택 시 현재 뷰포트의 장소를 조회.
  // "전체"·코스 선택 시엔 null이라 요청하지 않는다. 뷰포트가 바뀌면 그 영역으로 재조회.
  const category = (PLACE_CATEGORIES as string[]).includes(filter)
    ? (filter as PlaceCategory)
    : null;
  const { data: categoryPlacesData } = useCategoryPlaces(category, viewport);
  const categoryPlaces = categoryPlacesData ?? EMPTY_PLACES;

  const showResults = searchOpen && search.trim() !== "";

  const handleChange = (value: string) => {
    setSearch(value);
    setSearchOpen(true);
  };

  const clearSearch = () => {
    setSearch("");
    setSearchOpen(false);
  };

  // 여행 계획(코스 추천)은 로그인 필요. 비로그인 시 안내 후 로그인 화면으로 유도.
  // 패널은 닫아도 상태가 보존되므로, 열면 이전 진행(폼/추천/rank)을 그대로 이어간다.
  // 패널로 들어갈 땐 코스 장소 상세 보기는 정리한다.
  const openPlan = () => {
    if (!isAuthed) {
      showToast(t("home.plan.loginRequired"));
      router.push("/my-page");
      return;
    }
    setCoursePlaceMarker(null);
    setSavedCoursePlaceMarker(null);
    setDetail(null);
    setPlanOpen(true);
  };

  // 경로 설정 패널·그린 경로·진행 중 요청을 모두 정리한다(대상이 바뀔 때 호출).
  const resetRoutePlan = useCallback(() => {
    cancelRoute();
    setRoutePlanOpen(false);
    setPicking(null);
    setStartPoint(null);
    setEndPoint(null);
    setRouteLines([]);
  }, [cancelRoute]);

  // 추천 코스에서 장소 탭: 패널을 잠시 내리고(상태 보존) 지도에서 해당 지점으로 이동 +
  // 상세 카드를 연다. 이 상세는 coursePlaceMarker로 표시되어, X를 누르면 패널로 복귀한다.
  // (resetRoutePlan 정의 이후에 둔다 — React Compiler 메모 보존을 위해 forward-ref 회피)
  const viewCoursePlace = (marker: CourseMarker) => {
    resetRoutePlan();
    setSearch("");
    setSearchOpen(false);
    setSelectedPlace(null);
    setFilter(FILTER_ALL);
    setCoursePlaceMarker(marker);
    setDetail(marker);
    setDetailExpanded(false);
    setPlanOpen(false);
  };

  const selectPlace = (place: Place) => {
    setSearch(place.placeName);
    setSearchOpen(false);
    setSelectedPlace(place);
    // 검색 장소를 고르면 코스 선택은 해제한다(마커 대상은 하나만).
    setFilter(FILTER_ALL);
    setCoursePlaceMarker(null);
    setSavedCoursePlaceMarker(null);
    resetRoutePlan();
    // 선택한 장소의 마커 상세를 바로 띄운다(마커를 탭한 것과 동일한 카드).
    setDetail({
      ...toLatLng(place),
      label: place.placeName,
      detail: placeToDetail(place),
    });
    setDetailExpanded(false);
  };

  const selectMarker = (marker: MapMarker) => {
    if (planOpen && previewCourseMap) {
      viewCoursePlace(marker as CourseMarker);
      return;
    }
    setDetail(marker);
    setDetailExpanded(false);

    if (!marker.detail || marker.detail.id !== undefined) {
      return;
    }

    void fetchPlaces(marker.detail.title)
      .then((places) => {
        const place = findClosestPlace(places, {
          name: marker.detail!.title,
          lat: marker.lat,
          lng: marker.lng,
        });
        if (!place) return;

        setDetail((current) => {
          if (
            !current?.detail ||
            current.lat !== marker.lat ||
            current.lng !== marker.lng ||
            current.detail.title !== marker.detail!.title
          ) {
            return current;
          }

          const tourismDetail = placeToDetail(place);
          return {
            ...current,
            detail: {
              ...current.detail,
              ...tourismDetail,
              subtitle: current.detail.subtitle ?? tourismDetail.subtitle,
            },
          };
        });
      })
      .catch(() => {
        // Keep the saved-course summary visible when no tourism match is available.
      });
  };

  const setPlaceDetailExpanded = (nextExpanded: boolean) => {
    if (detailExpanded && !nextExpanded && detail) {
      mapRef.current?.focusLocation(detail);
    }
    setDetailExpanded(nextExpanded);
  };

  // 엔터(검색 확정): 결과 최상단을 선택해 마커+상세 카드를 띄운다.
  // 아직 결과가 없으면 드롭다운을 열어 검색이 돌게 한다.
  const submitSearch = () => {
    if (results.length > 0) {
      selectPlace(results[0]!);
      return;
    }
    if (search.trim() !== "") {
      setSearchOpen(true);
    }
  };

  // 코스 태그 선택 시: 검색 마커를 지우고 그 코스로 전환. FILTER_ALL이면 해제.
  const selectFilter = (value: string) => {
    if (
      mapZoom !== null &&
      mapZoom < CATEGORY_MIN_ZOOM &&
      (PLACE_CATEGORIES as string[]).includes(value)
    ) {
      showToast(t("home.map.zoomIn"));
    }
    setFilter(value);
    setSelectedPlace(null);
    setDetail(null);
    setCoursePlaceMarker(null);
    setSavedCoursePlaceMarker(null);
    resetRoutePlan();
  };

  // 내 코스 상세에서 전달된 딥링크를 한 번 소비한다. 코스 전체 보기라면 전체
  // 마커/연결선을, 개별 장소 보기라면 해당 마커와 상세 시트를 바로 보여준다.
  useEffect(() => {
    if (!savedCourseId) return;

    const course = courses.find(
      (item) => String(item.selectionId) === savedCourseId,
    );
    if (!course) return;

    const lat = Number(markerLat);
    const lng = Number(markerLng);
    const requestedMarker =
      Number.isFinite(lat) && Number.isFinite(lng)
        ? savedCourseToMapDecoration(course).markers.find(
            (marker) =>
              marker.lat === lat &&
              marker.lng === lng &&
              (!markerLabel || marker.label === markerLabel),
          )
        : undefined;

    const frame = requestAnimationFrame(() => {
      resetRoutePlan();
      setSearch("");
      setSearchOpen(false);
      setSelectedPlace(null);
      setCoursePlaceMarker(null);
      setFilter(savedCourseId);
      setSavedCoursePlaceMarker(requestedMarker ?? null);
      setDetail(requestedMarker ?? null);
      setDetailExpanded(false);
      router.setParams({
        savedCourseId: undefined,
        markerLat: undefined,
        markerLng: undefined,
        markerLabel: undefined,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [
    courses,
    markerLabel,
    markerLat,
    markerLng,
    resetRoutePlan,
    router,
    savedCourseId,
  ]);

  useEffect(() => {
    const id = Number(tourismPlaceId);
    const lat = Number(tourismPlaceLat);
    const lng = Number(tourismPlaceLng);
    if (
      !Number.isInteger(id) ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      !tourismPlaceName
    ) {
      return;
    }

    const marker: MapMarker = {
      lat,
      lng,
      label: tourismPlaceName,
      detail: {
        id,
        title: tourismPlaceName,
        subtitle: tourismPlaceCategory || undefined,
        address: tourismPlaceAddress || undefined,
        image: tourismPlaceImage || undefined,
        phone: tourismPlacePhone || undefined,
        placeType: tourismPlaceType || undefined,
        primaryTypeName: tourismPlacePrimaryTypeName || undefined,
      },
    };
    const frame = requestAnimationFrame(() => {
      resetRoutePlan();
      setSearch("");
      setSearchOpen(false);
      setSelectedPlace(null);
      setFilter(FILTER_ALL);
      setCoursePlaceMarker(marker);
      setSavedCoursePlaceMarker(null);
      setDetail(marker);
      setDetailExpanded(false);
      router.setParams({
        tourismPlaceId: undefined,
        tourismPlaceType: undefined,
        tourismPlaceName: undefined,
        tourismPlaceCategory: undefined,
        tourismPlaceAddress: undefined,
        tourismPlaceLat: undefined,
        tourismPlaceLng: undefined,
        tourismPlaceImage: undefined,
        tourismPlacePhone: undefined,
        tourismPlacePrimaryTypeName: undefined,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [
    resetRoutePlan,
    router,
    tourismPlaceAddress,
    tourismPlaceCategory,
    tourismPlaceId,
    tourismPlaceImage,
    tourismPlaceLat,
    tourismPlaceLng,
    tourismPlaceName,
    tourismPlacePhone,
    tourismPlacePrimaryTypeName,
    tourismPlaceType,
  ]);

  // 상세 카드 닫기(X). 패널에서 열린 상세(coursePlaceMarker)면 닫는 대신 패널로 복귀한다.
  // 일반 상세(검색/마커/카테고리)는 그냥 닫는다. 어느 쪽이든 그린 경로는 정리한다.
  const closeDetail = () => {
    const fromPanel = coursePlaceMarker !== null;
    setDetailExpanded(false);
    setDetail(null);
    setCoursePlaceMarker(null);
    setSavedCoursePlaceMarker(null);
    resetRoutePlan();
    if (fromPanel) {
      setPlanOpen(true);
    }
  };

  // "경로 안내": 경로 설정 패널을 연다. 시작지=현위치(기본), 도착지=클릭한 장소(기본).
  const openRoutePlan = () => {
    if (!detail) {
      return;
    }
    cancelRoute();
    setStartPoint(null);
    setEndPoint({
      lat: detail.lat,
      lng: detail.lng,
      label: detail.detail?.title,
    });
    setPicking(null);
    setRouteLines([]);
    setRoutePlanOpen(true);
  };

  const copySelectedPlace = async () => {
    if (!detail?.detail) return;

    try {
      const address =
        detail.detail.address ?? (await resolveMarkerAddress(detail));
      await copyPlaceToClipboard(detail.detail.title, address);
      showToast(t("home.detail.copySuccess"));
    } catch {
      showToast(t("home.detail.copyFailed"));
    }
  };

  const openSelectedPlaceInExternalMap = async () => {
    if (!detail?.detail) return;

    const address =
      detail.detail.address ??
      (await resolveMarkerAddress(detail).catch(() => undefined));
    const destination = {
      latitude: detail.lat,
      longitude: detail.lng,
      label: detail.detail.title,
      address,
    };
    const openProvider = async (provider: MapProvider) => {
      try {
        await Linking.openURL(buildMapUrl(provider, destination));
      } catch {
        showToast(t("home.detail.externalMapFailed"));
      }
    };

    if (Platform.OS === "web") {
      await openProvider("google");
      return;
    }

    const nativeProviders = await Promise.all(
      (["naver", "kakao"] as const).map(async (provider) => ({
        provider,
        installed: await Linking.canOpenURL(
          provider === "naver" ? "nmap://" : "kakaomap://",
        ).catch(() => false),
      })),
    );
    const providers: MapProvider[] = [
      ...nativeProviders
        .filter(({ installed }) => installed)
        .map(({ provider }) => provider),
      "google",
      ...(Platform.OS === "ios" ? (["apple"] as const) : []),
    ];
    const labels = providers.map((provider) =>
      t(`home.detail.mapProvider.${provider}`),
    );

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: t("home.detail.mapPickerTitle"),
          options: [...labels, t("common.cancel")],
          cancelButtonIndex: labels.length,
        },
        (index) => {
          const provider = providers[index];
          if (provider) void openProvider(provider);
        },
      );
      return;
    }

    Alert.alert(t("home.detail.mapPickerTitle"), undefined, [
      ...providers.map((provider, index) => ({
        text: labels[index],
        onPress: () => void openProvider(provider),
      })),
    ]);
  };

  // 설정 패널 닫기(경로 안내 취소). 상세 카드는 그대로 두어 다시 열 수 있게 한다.
  const closeRoutePlan = () => {
    cancelRoute();
    setRoutePlanOpen(false);
    setPicking(null);
    setStartPoint(null);
    setEndPoint(null);
    setRouteLines([]);
  };

  // 중앙 십자선 확정 → 현재 지도 중앙 좌표를 지정 중인 지점(시작/도착)에 넣고 종료.
  const confirmPick = async () => {
    const center = await mapRef.current?.getCenter();
    if (!center) {
      return;
    }
    if (picking === "start") {
      setStartPoint(center);
    } else if (picking === "end") {
      setEndPoint(center);
    }
    setPicking(null);
  };

  // 경로 찾기: 시작지(현위치 or 지정) → 도착지 경로(최단·그늘)를 조회해 지도에 그린다.
  // 진행 중에 취소되면 결과는 무시한다.
  const confirmRoute = async () => {
    if (!endPoint || routing) {
      return;
    }
    const controller = new AbortController();
    routeAbortRef.current = controller;
    setRouting(true);
    try {
      let from: LatLngPoint;
      if (startPoint) {
        from = startPoint;
      } else {
        // 시작지가 "현위치"면 이 시점에 위치를 조회한다.
        const loc = await getCurrentLocation();
        if (controller.signal.aborted) {
          return;
        }
        if (!loc) {
          showToast(t("route.locationPermission"));
          return;
        }
        from = { lat: loc[1], lng: loc[0] };
      }
      const lines = await fetchRouteLines(
        from,
        { lat: endPoint.lat, lng: endPoint.lng },
        controller.signal,
      );
      if (controller.signal.aborted) {
        return;
      }
      if (lines.length === 0) {
        showToast(t("route.notFound"));
        return;
      }
      setRouteLines(lines);
    } catch {
      // 취소로 인한 에러는 사용자가 의도한 것이므로 알리지 않는다.
      if (!controller.signal.aborted) {
        showToast(t("route.loadFailed"));
      }
    } finally {
      // 취소(cancelRoute)로 이미 다른 요청이 시작됐다면 그쪽 상태를 건드리지 않는다.
      if (routeAbortRef.current === controller) {
        routeAbortRef.current = null;
        setRouting(false);
      }
    }
  };

  // 경로 설정 중 시작/도착 핀. 시작은 지도에서 고른 경우에만(현위치는 요청 시 조회).
  const routePins = useMemo<RoutePin[]>(() => {
    if (!routePlanOpen) {
      return [];
    }
    const pins: RoutePin[] = [];
    if (startPoint) {
      pins.push({ ...startPoint, kind: "start" });
    }
    if (endPoint) {
      pins.push({ lat: endPoint.lat, lng: endPoint.lng, kind: "end" });
    }
    return pins;
  }, [routePlanOpen, startPoint, endPoint]);

  // 마커 우선순위: 추천 코스 장소 → 검색 장소 → 선택 코스 → 선택 카테고리.
  // 추천 코스에서 장소를 탭하면 그 한 지점만 찍어 카메라가 이동한다(단일 마커 flyTo).
  const markers = useMemo<MapMarker[]>(() => {
    if (savedCoursePlaceMarker) {
      return [savedCoursePlaceMarker];
    }
    if (coursePlaceMarker) {
      return [coursePlaceMarker];
    }
    if (previewCourseMap) {
      return previewCourseMap.markers;
    }
    if (selectedPlace) {
      return [
        {
          ...toLatLng(selectedPlace),
          label: selectedPlace.placeName,
          detail: placeToDetail(selectedPlace),
        },
      ];
    }
    if (selectedCourse) {
      return selectedCourseMap?.markers ?? [];
    }
    return categoryPlaces.map((place) => ({
      ...toLatLng(place),
      label: place.placeName,
      detail: placeToDetail(place),
    }));
  }, [
    coursePlaceMarker,
    previewCourseMap,
    savedCoursePlaceMarker,
    selectedPlace,
    selectedCourse,
    selectedCourseMap,
    categoryPlaces,
  ]);

  return (
    <View className="bg-bg flex-1">
      <MapLibreMap
        ref={mapRef}
        markers={markers}
        connectionLines={
          savedCoursePlaceMarker
            ? undefined
            : (previewCourseMap?.connectionLines ??
              selectedCourseMap?.connectionLines)
        }
        markerFitPadding={
          previewCourseMap || selectedCourseMap
            ? SAVED_COURSE_MAP_PADDING
            : undefined
        }
        onMarkerPress={selectMarker}
        onMapPress={() => {
          Keyboard.dismiss();
          setPlaceDetailExpanded(false);
        }}
        onRegionChange={updateViewport}
        // 카테고리는 뷰포트 기반 조회라 카메라 자동 이동 OFF(재조회 루프 방지).
        // 검색/코스/코스장소 마커는 해당 지점으로 이동해야 하므로 ON.
        autoFitMarkers={category === null}
        routeLines={routeLines}
        routePins={routePins}
      />

      {/* 상태바(시계·배터리 등) 가독성용 상단 스크림. 지도는 풀블리드 유지. */}
      <TopScrim height={insets.top + 12} />

      {/* 지점 지정 중: 지도 중앙 고정 십자선. 지도를 움직여 원하는 곳에 맞춘다.
          touch를 막지 않도록 pointerEvents=none. */}
      {routePlanOpen && picking && (
        <View
          pointerEvents="none"
          className="inset-0 absolute items-center justify-center"
        >
          <Crosshair
            size={40}
            color={picking === "start" ? "#7c3aed" : "#ef4444"}
            strokeWidth={2.5}
          />
        </View>
      )}

      {/* 상단 검색 오버레이 (map은 빈 영역에서 계속 조작 가능하도록 box-none) */}
      <SafeAreaView
        edges={["top"]}
        pointerEvents="box-none"
        className="inset-x-0 top-0 absolute"
      >
        <View pointerEvents="box-none" className="px-4 pt-2">
          <Input
            size="lg"
            placeholder={t("home.search.placeholder")}
            accessibilityLabel={t("home.search.label")}
            value={search}
            onChangeText={handleChange}
            returnKeyType="search"
            onSubmitEditing={submitSearch}
            leftIcon={<Search size={18} color={colors["text-muted"]} />}
            rightIcon={
              search ? (
                <Pressable
                  accessibilityLabel={t("home.search.clear")}
                  onPress={clearSearch}
                >
                  <X size={18} color={colors["text-muted"]} />
                </Pressable>
              ) : undefined
            }
          />

          {showResults && (
            <View className="mt-2 max-h-64 border-border bg-neutral-0 shadow-md overflow-hidden rounded-[8px] border">
              <ScrollView keyboardShouldPersistTaps="handled">
                {results.length > 0 ? (
                  results.map((place) => (
                    <Pressable
                      key={place.id}
                      onPress={() => selectPlace(place)}
                      className="gap-3 border-border px-4 py-3 active:bg-surface-muted flex-row items-center border-b"
                    >
                      <PlaceThumbnail
                        imageUrl={place.image}
                        placeType={place.placeType}
                        primaryTypeName={place.primaryTypeName}
                        className="size-12"
                      />
                      <Text
                        numberOfLines={1}
                        className="text-body-sm text-text flex-1"
                      >
                        {place.placeName}
                      </Text>
                    </Pressable>
                  ))
                ) : (
                  <View className="px-4 py-3">
                    <Text className="text-body-sm text-text-muted">
                      {isFetching
                        ? t("home.search.loading")
                        : t("home.search.empty")}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* 하단 태그: 카테고리(전체/병원/관광명소/숙소) + 저장 코스(로그인 시).
          카테고리를 고르면 그 카테고리 장소를, 코스를 고르면 코스 지점들을 마커로
          찍는다. "전체"는 모든 마커 해제. 지도 맨 하단에 둔다. */}
      <View
        pointerEvents="box-none"
        className="inset-x-0 bottom-0 gap-3 absolute"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("home.plan.open")}
          onPress={openPlan}
          className={`mr-4 size-14 bg-primary shadow-md active:bg-action-primary-hover items-center justify-center self-end rounded-full ${
            selectedCourseMap && !showResults ? "" : "mb-7"
          }`}
        >
          <Plus size={28} color={colors["on-action-primary"]} />
        </Pressable>

        {selectedCourseMap && !showResults ? (
          <View pointerEvents="box-none" className="px-4">
            <CourseDayLegend days={selectedCourseMap.days} locale={locale} />
          </View>
        ) : null}

        <TagList
          value={filter}
          onChange={selectFilter}
          aria-label={t("home.map.filters")}
          className="px-4 pb-4"
        >
          {[
            { value: FILTER_ALL, name: t("home.filter.all") },
            { value: "hospital", name: t("home.filter.hospital") },
            { value: "attraction", name: t("home.filter.attraction") },
            {
              value: "accommodation",
              name: t("home.filter.accommodation"),
            },
          ].map((item) => (
            <TagList.Item
              key={item.value}
              value={item.value}
              className="h-10"
              icon={
                item.value === FILTER_ALL ? undefined : (
                  <PlaceDefaultIcon
                    placeType={item.value}
                    color={
                      filter === item.value ? colors["neutral-0"] : undefined
                    }
                  />
                )
              }
            >
              {item.name}
            </TagList.Item>
          ))}
          {courses.map((course) => (
            <TagList.Item
              key={course.selectionId}
              value={String(course.selectionId)}
              className="h-10"
              icon={
                <MapRouteIcon
                  color={
                    filter === String(course.selectionId)
                      ? colors["neutral-0"]
                      : colors.primary
                  }
                />
              }
            >
              {courseTitle(course)}
            </TagList.Item>
          ))}
        </TagList>
      </View>

      <TripPlanPanel
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        onViewPlace={viewCoursePlace}
        onCourseChange={setPreviewCourse}
      />

      {/* 마커 클릭 상세 카드 — 하단 오버레이(태그리스트 위). 경로 설정 중엔 패널로 대체. */}
      {detail?.detail && !routePlanOpen && (
        <PlaceDetailSheet
          detail={detail.detail}
          expanded={detailExpanded}
          onExpandedChange={setPlaceDetailExpanded}
          onClose={closeDetail}
          onRoutePress={openRoutePlan}
          onCopyPress={() => void copySelectedPlace()}
          onExternalMapPress={() => void openSelectedPlaceInExternalMap()}
        />
      )}

      {/* 지점 지정 안내 바 — 지도가 대부분 보이도록 하단에 얇게. 지도를 움직여 중앙
          십자선에 맞춘 뒤 "이 위치로 지정"으로 좌표를 확정한다. */}
      {routePlanOpen && picking && (
        <View pointerEvents="box-none" className="inset-x-0 bottom-0 absolute">
          <SafeAreaView
            edges={["bottom"]}
            className="bg-neutral-0 shadow-md rounded-t-[16px]"
          >
            <View className="gap-2 px-5 pt-4 pb-1 flex-row items-center">
              <MapPin size={16} color={colors.primary} />
              <Text className="text-body-md text-text flex-1">
                {t("route.pickPrompt", {
                  point:
                    picking === "start" ? t("route.start") : t("route.end"),
                })}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("route.pickCancel")}
                onPress={() => setPicking(null)}
                hitSlop={8}
              >
                <Text className="text-label-lg text-text-muted">
                  {t("common.cancel")}
                </Text>
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("route.confirmLocation")}
              onPress={() => void confirmPick()}
              className="mx-5 mt-2 mb-2 h-11 gap-2 bg-primary active:bg-action-primary-hover flex-row items-center justify-center rounded-[8px]"
            >
              <Crosshair size={16} color={colors["on-action-primary"]} />
              <Text className="text-label-lg text-on-action-primary">
                {t("route.confirmLocation")}
              </Text>
            </Pressable>
          </SafeAreaView>
        </View>
      )}

      {/* 경로 설정 패널 — 시작지(현위치/지도)·도착지(장소 기본, 지도 변경) 설정 후 경로 찾기. */}
      {routePlanOpen && !picking && (
        <View pointerEvents="box-none" className="inset-x-0 bottom-0 absolute">
          <SafeAreaView
            edges={["bottom"]}
            className="bg-neutral-0 shadow-md rounded-t-[16px]"
          >
            <View className="gap-2 px-5 pt-4 pb-1 flex-row items-center">
              <Text className="text-heading-sm text-text flex-1">
                {t("route.settings")}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("route.closeSettings")}
                onPress={closeRoutePlan}
                hitSlop={8}
              >
                <X size={20} color={colors["text-muted"]} />
              </Pressable>
            </View>

            {/* 시작지: 현위치 / 지도에서 선택 (택1) */}
            <View className="px-5 pt-2">
              <Text className="mb-1 text-label-sm text-text-muted">
                {t("route.start")}
              </Text>
              <View className="gap-2 flex-row">
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: startPoint === null }}
                  onPress={() => setStartPoint(null)}
                  style={{
                    backgroundColor:
                      startPoint === null
                        ? colors.primary
                        : colors["surface-muted"],
                  }}
                  className="h-9 gap-1.5 flex-1 flex-row items-center justify-center rounded-[8px]"
                >
                  <LocateFixed
                    size={15}
                    color={
                      startPoint === null
                        ? colors["on-action-primary"]
                        : colors.text
                    }
                  />
                  <Text
                    className="text-label-md"
                    style={{
                      color:
                        startPoint === null
                          ? colors["on-action-primary"]
                          : colors.text,
                    }}
                  >
                    {t("route.currentLocation")}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: startPoint !== null }}
                  onPress={() => setPicking("start")}
                  style={{
                    backgroundColor:
                      startPoint !== null
                        ? colors.primary
                        : colors["surface-muted"],
                  }}
                  className="h-9 gap-1.5 flex-1 flex-row items-center justify-center rounded-[8px]"
                >
                  <MapPin
                    size={15}
                    color={
                      startPoint !== null
                        ? colors["on-action-primary"]
                        : colors.text
                    }
                  />
                  <Text
                    className="text-label-md"
                    style={{
                      color:
                        startPoint !== null
                          ? colors["on-action-primary"]
                          : colors.text,
                    }}
                  >
                    {t("route.selectOnMap")}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* 도착지: 클릭한 장소가 기본, 지도에서 변경 가능 */}
            <View className="px-5 pt-3">
              <Text className="mb-1 text-label-sm text-text-muted">
                {t("route.end")}
              </Text>
              <View className="gap-2 flex-row items-center">
                <View className="gap-1.5 flex-1 flex-row items-center">
                  <Flag size={15} color={colors.text} />
                  <Text
                    numberOfLines={1}
                    className="text-body-md text-text flex-1"
                  >
                    {endPoint?.label ?? t("route.mapPoint")}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("route.changeEnd")}
                  onPress={() => setPicking("end")}
                  className="h-9 gap-1.5 border-border px-3 active:bg-surface-muted flex-row items-center justify-center rounded-[8px] border"
                >
                  <MapPin size={14} color={colors.text} />
                  <Text className="text-label-md text-text">
                    {t("route.change")}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* 경로가 그려졌을 때 색 범례 (최단=파랑, 그늘길=초록) */}
            {routeLines.length > 0 && (
              <View className="gap-4 px-5 pt-3 flex-row items-center">
                <View className="gap-1.5 flex-row items-center">
                  <View
                    className="h-1 w-5 rounded-full"
                    style={{ backgroundColor: ROUTE_COLORS.shortest }}
                  />
                  <Text className="text-body-sm text-text-secondary">
                    {t("route.shortest")}
                  </Text>
                </View>
                <View className="gap-1.5 flex-row items-center">
                  <View
                    className="h-1 w-5 rounded-full"
                    style={{ backgroundColor: ROUTE_COLORS.shady }}
                  />
                  <Text className="text-body-sm text-text-secondary">
                    {t("route.shady")}
                  </Text>
                </View>
              </View>
            )}

            {/* 경로 찾기: 시작지→도착지 경로(최단·그늘)를 지도에 그린다. 진행 중엔
                disabled 색+스피너. 조건부 배경색은 style로 처리해 css-interop 크래시 회피. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("route.find")}
              accessibilityState={{ disabled: routing, busy: routing }}
              disabled={routing}
              onPress={confirmRoute}
              style={
                routing
                  ? { backgroundColor: colors["action-disabled"] }
                  : undefined
              }
              className="mx-5 mt-4 mb-2 h-11 gap-2 bg-primary active:bg-action-primary-hover flex-row items-center justify-center rounded-[8px]"
            >
              {routing ? (
                <ActivityIndicator
                  size="small"
                  color={colors["on-action-disabled"]}
                />
              ) : (
                <Navigation size={16} color={colors["on-action-primary"]} />
              )}
              <Text
                className="text-label-lg"
                style={{
                  color: routing
                    ? colors["on-action-disabled"]
                    : colors["on-action-primary"],
                }}
              >
                {routing
                  ? t("route.finding")
                  : routeLines.length > 0
                    ? t("route.findAgain")
                    : t("route.find")}
              </Text>
            </Pressable>
          </SafeAreaView>
        </View>
      )}
    </View>
  );
}
