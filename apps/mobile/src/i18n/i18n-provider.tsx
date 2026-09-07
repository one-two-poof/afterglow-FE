import AsyncStorage from "@react-native-async-storage/async-storage";
import type { TOptions } from "i18next";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";

import {
  getDeviceLocale,
  i18n,
  initializeI18n,
  isLocale,
  type Locale,
  type TranslationKey,
} from "./config";

const LOCALE_STORAGE_KEY = "afterglow.locale";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(i18n.isInitialized);

  useEffect(() => {
    // AsyncStorage 네이티브 모듈이 없는(예: 재빌드 전 dev client) 환경에서는
    // getItem이 동기적으로 throw 하므로, async/try-catch로 감싸 앱 전체 크래시를
    // 막고 기기 로케일로 폴백한다.
    const restoreLocale = async () => {
      try {
        const storedLocale = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
        await initializeI18n(
          isLocale(storedLocale) ? storedLocale : getDeviceLocale(),
        );
      } catch {
        await initializeI18n(getDeviceLocale());
      } finally {
        setIsReady(true);
      }
    };

    void restoreLocale();
  }, []);

  if (!isReady) return null;

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export function useI18n() {
  const { t: translate, i18n: instance } = useTranslation("common");
  const locale = isLocale(instance.resolvedLanguage)
    ? instance.resolvedLanguage
    : getDeviceLocale();

  const setLocale = useCallback(
    (nextLocale: Locale) => {
      void instance.changeLanguage(nextLocale);
      // setItem이 동기적으로 throw 할 수 있어(네이티브 모듈 부재) try-catch로 감싼다.
      // 저장 실패 시에도 현재 앱 세션에서는 선택한 언어를 유지한다.
      try {
        void AsyncStorage.setItem(LOCALE_STORAGE_KEY, nextLocale).catch(() => {});
      } catch {
        // 무시: 이번 세션 동안만 선택 언어가 유지된다.
      }
    },
    [instance],
  );

  const t = useCallback(
    (key: TranslationKey, options?: TOptions) => translate(key, options),
    [translate],
  );

  return { locale, setLocale, t };
}
