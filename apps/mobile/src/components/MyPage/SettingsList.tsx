import { colors } from "@afterglow/tokens";
import { cn } from "@afterglow/utils";
import { type Href, useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { useI18n } from "@/i18n/i18n-provider";

interface SettingsItem {
  key: string;
  title: string;
  description: string;
  /** 이동할 라우트 (있으면 탭 시 push) */
  href?: Href;
  onPress?: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

function SettingsRow({
  item,
  isLast,
}: {
  item: SettingsItem;
  isLast: boolean;
}) {
  const router = useRouter();
  const handlePress = item.href ? () => router.push(item.href!) : item.onPress;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: item.disabled || !handlePress }}
      disabled={item.disabled || !handlePress}
      onPress={handlePress}
      className={cn(
        "flex-row items-center gap-3 px-5 py-4 active:bg-surface-muted",
        !isLast && "border-b border-border",
        item.disabled && "opacity-50",
      )}
    >
      <View className="flex-1">
        <Text
          className={cn(
            "text-label-lg",
            item.destructive ? "text-error" : "text-text",
          )}
        >
          {item.title}
        </Text>
        <Text className="mt-0.5 text-body-sm text-text-muted">
          {item.description}
        </Text>
      </View>
      <ChevronRight
        size={20}
        color={item.destructive ? colors.error : colors["text-muted"]}
      />
    </Pressable>
  );
}

function Group({ items }: { items: SettingsItem[] }) {
  return (
    <View className="bg-surface">
      {items.map((item, i) => (
        <SettingsRow
          key={item.key}
          item={item}
          isLast={i === items.length - 1}
        />
      ))}
    </View>
  );
}

/** 설정 목록 + 로그아웃/회원 탈퇴. */
export function SettingsList({
  onLogout,
  onDeleteAccount,
  isDeletingAccount,
}: {
  onLogout: () => void;
  onDeleteAccount: () => void;
  isDeletingAccount: boolean;
}) {
  const { t } = useI18n();
  const menuGroups: SettingsItem[][] = [
    [
      {
        key: "language",
        title: t("language.title"),
        description: t("language.description"),
        href: "/language",
      },
      {
        key: "support",
        title: t("settings.support"),
        description: t("settings.supportDescription"),
        href: "/support",
      },
      {
        key: "terms",
        title: t("settings.terms"),
        description: t("settings.termsDescription"),
        href: "/terms",
      },
    ],
  ];

  return (
    <View className="gap-2 bg-bg pb-8">
      {menuGroups.map((group, i) => (
        <Group key={i} items={group} />
      ))}
      <Group
        items={[
          {
            key: "logout",
            title: t("settings.logout"),
            description: t("settings.logoutDescription"),
            onPress: onLogout,
            destructive: true,
          },
          {
            key: "delete-account",
            title: t("settings.deleteAccount"),
            description: isDeletingAccount
              ? t("settings.deletingAccount")
              : t("settings.deleteAccountDescription"),
            onPress: onDeleteAccount,
            destructive: true,
            disabled: isDeletingAccount,
          },
        ]}
      />
    </View>
  );
}
