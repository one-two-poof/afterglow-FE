import { useToastStore } from "@afterglow/stores";
import { Input } from "@afterglow/ui-native";
import { colors } from "@afterglow/tokens";
import { useRouter } from "expo-router";
import { Mail } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { signUpWithEmail } from "@/lib/auth";
import { useI18n } from "@/i18n/i18n-provider";

import { AuthScreen } from "./AuthScreen";
import { PasswordInput } from "./PasswordInput";
import { SubmitButton } from "./SubmitButton";
import { isValidEmail, MIN_PASSWORD_LENGTH } from "./validation";

interface FormErrors {
  email?: string;
  password?: string;
  passwordConfirm?: string;
}

/**
 * 회원가입 화면(/sign-up).
 * 이메일·비밀번호 자체 회원가입. 성공 시 바로 로그인 상태가 되어 홈(/)으로 이동한다.
 * 소셜 가입은 로그인 화면의 소셜 버튼으로 동일하게 처리되므로 여기선 이메일 폼만 둔다.
 */
export function SignUp() {
  const { t } = useI18n();
  const router = useRouter();
  const showToast = useToastStore((s) => s.show);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearError = (field: keyof FormErrors) => {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const validate = () => {
    const next: FormErrors = {};
    if (!email.trim()) next.email = t("login.errorEmailRequired");
    else if (!isValidEmail(email)) next.email = t("login.errorEmailInvalid");
    if (!password) next.password = t("login.errorPasswordRequired");
    else if (password.length < MIN_PASSWORD_LENGTH)
      next.password = t("signup.errorPasswordTooShort");
    if (passwordConfirm !== password)
      next.passwordConfirm = t("signup.errorPasswordMismatch");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSignUp = async () => {
    if (isSubmitting || !validate()) return;
    setIsSubmitting(true);
    try {
      await signUpWithEmail({
        email: email.trim(),
        password,
        passwordConfirm,
      });
      router.replace("/");
    } catch {
      showToast(t("signup.failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreen
      title={t("signup.title")}
      subtitle={t("signup.subtitle")}
      footer={
        <>
          <Text className="text-body-sm text-text-secondary">
            {t("signup.haveAccount")}{" "}
          </Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.replace("/login")}
            hitSlop={8}
          >
            <Text className="text-label-md text-action-primary">
              {t("signup.goLogin")}
            </Text>
          </Pressable>
        </>
      }
    >
      <View className="gap-4">
        <Input
          label={t("login.emailLabel")}
          placeholder={t("login.emailPlaceholder")}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            clearError("email");
          }}
          error={errors.email}
          leftIcon={<Mail size={18} color={colors["text-muted"]} />}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <PasswordInput
          label={t("login.passwordLabel")}
          placeholder={t("login.passwordPlaceholder")}
          helperText={errors.password ? undefined : t("signup.passwordHint")}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            clearError("password");
          }}
          error={errors.password}
          textContentType="oneTimeCode"
          autoComplete="off"
          returnKeyType="next"
        />
        <PasswordInput
          label={t("signup.passwordConfirmLabel")}
          placeholder={t("signup.passwordConfirmPlaceholder")}
          value={passwordConfirm}
          onChangeText={(text) => {
            setPasswordConfirm(text);
            clearError("passwordConfirm");
          }}
          error={errors.passwordConfirm}
          textContentType="oneTimeCode"
          autoComplete="off"
          returnKeyType="done"
          onSubmitEditing={handleSignUp}
        />
      </View>

      <SubmitButton
        label={t("signup.submit")}
        onPress={handleSignUp}
        loading={isSubmitting}
      />
    </AuthScreen>
  );
}
