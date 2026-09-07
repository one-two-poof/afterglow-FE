import { colors } from "@afterglow/tokens";
import { ChevronDown, Mail } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ScreenHeader } from "@/components/ScreenHeader";
import { useI18n } from "@/i18n/i18n-provider";

import { type FaqItem, getFaqItems, SUPPORT_EMAIL } from "./support-content";

/** 접었다 펼치는 FAQ 한 항목. 질문을 누르면 답변이 열린다. */
function FaqRow({ item, isLast }: { item: FaqItem; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <View className={isLast ? undefined : "border-b border-border"}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={item.q}
        onPress={() => setOpen((prev) => !prev)}
        className="flex-row items-center gap-3 px-4 py-4 active:bg-surface-muted"
      >
        <Text className="flex-1 text-label-md text-text">{item.q}</Text>
        {/* 회전은 조건부 className(rotate-*) 대신 인라인 style로 처리한다.
            transform 유틸을 상태 변화로 넣었다 빼면 css-interop이 크래시나기 때문. */}
        <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
          <ChevronDown size={20} color={colors["text-muted"]} />
        </View>
      </Pressable>
      {open ? (
        <View className="px-4 pb-4">
          <Text className="text-body-sm text-text-secondary">{item.a}</Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * 고객센터 화면. 1:1 문의 이메일 + 자주 묻는 질문 아코디언.
 * 설정 목록의 "고객센터"에서 진입한다.
 */
export function Support() {
  const { t, locale } = useI18n();
  const faqItems = getFaqItems(locale);
  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title={t("support.title")} />
      <ScrollView contentContainerClassName="gap-6 px-5 py-6 pb-10">
        {/* 1:1 문의 채널 */}
        <View className="gap-4 rounded-[16px] border border-border bg-surface p-5">
          <View className="flex-row items-center gap-3">
            <View className="size-11 items-center justify-center rounded-full bg-surface-accent">
              <Mail size={20} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-label-lg text-text">
                {t("support.contact")}
              </Text>
              <Text className="mt-0.5 text-body-sm text-text-muted">
                {t("support.contactHint")}
              </Text>
            </View>
          </View>

          <View className="gap-2 border-t border-border pt-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-body-sm text-text-muted">
                {t("support.email")}
              </Text>
              <Text className="text-body-sm text-text">{SUPPORT_EMAIL}</Text>
            </View>
          </View>
        </View>

        {/* 자주 묻는 질문 */}
        <View className="gap-3">
          <Text className="text-label-lg text-text">{t("support.faq")}</Text>
          <View className="overflow-hidden rounded-[16px] border border-border bg-surface">
            {faqItems.map((item, i) => (
              <FaqRow
                key={item.q}
                item={item}
                isLast={i === faqItems.length - 1}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
