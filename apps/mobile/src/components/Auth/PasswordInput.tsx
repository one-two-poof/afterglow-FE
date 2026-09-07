import { colors } from "@afterglow/tokens";
import { Input, type InputProps } from "@afterglow/ui-native";
import { Eye, EyeOff, Lock } from "lucide-react-native";
import { useState } from "react";
import { Pressable } from "react-native";

import { useI18n } from "@/i18n/i18n-provider";

/**
 * 비밀번호 입력 필드. ui-native Input을 감싸 자물쇠 아이콘 + 표시/숨김 토글을 더한다.
 * 로그인·회원가입 화면이 공유한다(비밀번호, 비밀번호 확인).
 */
export function PasswordInput(props: InputProps) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  return (
    <Input
      leftIcon={<Lock size={18} color={colors["text-muted"]} />}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      textContentType="password"
      rightIcon={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            visible ? t("login.hidePassword") : t("login.showPassword")
          }
          onPress={() => setVisible((prev) => !prev)}
          hitSlop={8}
        >
          {visible ? (
            <EyeOff size={18} color={colors["text-muted"]} />
          ) : (
            <Eye size={18} color={colors["text-muted"]} />
          )}
        </Pressable>
      }
      {...props}
    />
  );
}
