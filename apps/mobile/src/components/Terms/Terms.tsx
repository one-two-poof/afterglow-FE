import { colors } from "@afterglow/tokens";
import { Info } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ScreenHeader } from "@/components/ScreenHeader";
import { useI18n } from "@/i18n/i18n-provider";

import { getTermsDocs, type TermsDoc } from "./terms-content";

/** 문서 전환 세그먼트 컨트롤 (이용약관 / 개인정보처리방침). */
function Segmented({
  docs,
  activeKey,
  onChange,
}: {
  docs: TermsDoc[];
  activeKey: TermsDoc["key"];
  onChange: (key: TermsDoc["key"]) => void;
}) {
  return (
    <View
      accessibilityRole="tablist"
      className="flex-row gap-1 rounded-full bg-surface-muted p-1"
    >
      {docs.map((doc) => {
        const active = doc.key === activeKey;
        return (
          <Pressable
            key={doc.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(doc.key)}
            // 배경/글자색은 조건부 className(변수 기반 유틸) 대신 인라인 style로 처리한다.
            // 상태 변화로 bg-surface 등을 넣었다 빼면 css-interop이 크래시나기 때문.
            style={{ backgroundColor: active ? colors.surface : "transparent" }}
            className="flex-1 items-center rounded-full py-2"
          >
            <Text
              style={{ color: active ? colors.primary : colors["text-muted"] }}
              className="text-label-md"
            >
              {doc.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * 이용약관 · 개인정보처리방침 화면. 상단 세그먼트로 두 문서를 전환하고,
 * 조항별 섹션과 시행일을 보여준다. 설정 목록의 "이용약관 및 개인정보처리방침"에서 진입.
 */
export function Terms() {
  const { t, locale } = useI18n();
  const docs = getTermsDocs(locale);
  const [activeKey, setActiveKey] = useState<TermsDoc["key"]>("terms");
  const doc = docs.find((d) => d.key === activeKey) ?? docs[0]!;

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title={t("terms.title")} />
      <ScrollView contentContainerClassName="gap-5 px-5 py-5 pb-12">
        <Segmented docs={docs} activeKey={activeKey} onChange={setActiveKey} />

        <Text className="text-caption text-text-muted">
          {t("terms.effectiveDate", { date: doc.effectiveDate })}
        </Text>

        <View className="gap-5">
          {doc.sections.map((section) => (
            <View key={section.heading} className="gap-1.5">
              <Text className="text-label-lg text-text">{section.heading}</Text>
              <Text className="text-body-sm text-text-secondary">
                {section.body}
              </Text>
            </View>
          ))}
        </View>

        <View className="mt-2 flex-row items-start gap-2 rounded-[12px] bg-surface-muted px-4 py-3">
          <Info size={16} color={colors["text-muted"]} />
          <Text className="flex-1 text-caption text-text-muted">
            {t("terms.notice")}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
