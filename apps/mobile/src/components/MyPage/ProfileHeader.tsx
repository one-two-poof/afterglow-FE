import { colors } from "@afterglow/tokens";
import { User } from "lucide-react-native";
import { Text, View } from "react-native";

import { Image } from "@/components/Image";
import { useI18n } from "@/i18n/i18n-provider";
import { type AuthUser } from "@/lib/auth";

/** 이름에서 이니셜 한 글자 추출 (프로필 이미지가 없을 때 폴백 아바타용) */
const getInitial = (name: string) => {
  const first = Array.from(name.trim())[0];
  return first ? first.toUpperCase() : "?";
};

function Avatar({ name, src }: { name: string; src?: string }) {
  if (src) {
    return (
      <Image
        source={{ uri: src }}
        accessibilityIgnoresInvertColors
        cachePolicy="memory-disk"
        recyclingKey={src}
        transition={100}
        className="size-20 rounded-full border border-border"
      />
    );
  }

  return (
    <View className="size-20 items-center justify-center rounded-full bg-surface-muted">
      <Text className="text-heading-md text-text-secondary">
        {getInitial(name)}
      </Text>
    </View>
  );
}

/** 미로그인 상태의 프로필 헤더(사람 아이콘 + 안내 문구). */
function GuestHeader() {
  const { t } = useI18n();
  return (
    <View className="flex-row items-center gap-4 bg-surface px-5 py-6">
      <View className="size-20 items-center justify-center rounded-full bg-surface-muted">
        <User size={32} color={colors["text-muted"]} />
      </View>
      <View className="flex-1">
        <Text numberOfLines={1} className="text-heading-sm text-text">
          {t("profile.guestName")}
        </Text>
        <Text numberOfLines={2} className="text-body-md text-text-muted">
          {t("profile.guestDescription")}
        </Text>
      </View>
    </View>
  );
}

/**
 * 프로필 헤더(아바타 + 이름/이메일).
 * user가 없으면 미로그인 안내 헤더를 렌더한다.
 */
export function ProfileHeader({ user }: { user?: AuthUser }) {
  if (!user) {
    return <GuestHeader />;
  }
  return (
    <View className="flex-row items-center gap-4 bg-surface px-5 py-6">
      <Avatar name={user.name} src={user.profileImageUrl} />
      <View className="flex-1">
        <Text numberOfLines={1} className="text-heading-sm text-text">
          {user.name}
        </Text>
        <Text numberOfLines={1} className="text-body-md text-text-muted">
          {user.email}
        </Text>
      </View>
    </View>
  );
}
