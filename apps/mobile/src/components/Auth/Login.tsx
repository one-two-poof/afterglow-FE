import { useToastStore } from "@afterglow/stores";
import { Input } from "@afterglow/ui-native";
import { colors } from "@afterglow/tokens";
import { useRouter } from "expo-router";
import { Mail } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { loginWithEmail, startAppleLogin, startGoogleLogin } from "@/lib/auth";
import { useI18n } from "@/i18n/i18n-provider";

import { AuthScreen } from "./AuthScreen";
import { PasswordInput } from "./PasswordInput";
import { SocialAuthButtons, type SocialProvider } from "./SocialAuthButtons";
import { SubmitButton } from "./SubmitButton";
import { isValidEmail } from "./validation";

/**
 * 로그인 화면(/login).
 * 이메일·비밀번호 로그인 + Google·Apple 소셜 로그인. 성공 시 홈(/)으로 이동한다.
 * 회원가입이 필요하면 하단 링크로 /sign-up으로 전환한다.
 */
export function Login() {
  const { t } = useI18n();
  const router = useRouter();
  const showToast = useToastStore((s) => s.show);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(
    null,
  );

  const busy = isSubmitting || loadingProvider !== null;

  const validate = () => {
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = t("login.errorEmailRequired");
    else if (!isValidEmail(email)) next.email = t("login.errorEmailInvalid");
    if (!password) next.password = t("login.errorPasswordRequired");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleEmailLogin = async () => {
    if (busy || !validate()) return;
    setIsSubmitting(true);
    try {
      await loginWithEmail({ email: email.trim(), password });
      router.replace("/");
    } catch {
      showToast(t("login.failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocial = (provider: SocialProvider) => async () => {
    if (busy) return;
    setLoadingProvider(provider);
    try {
      const start = provider === "google" ? startGoogleLogin : startAppleLogin;
      const loggedIn = await start();
      if (loggedIn) router.replace("/");
    } catch (error) {
      // 실제 실패 원인은 개발 중 Metro 콘솔에서 확인한다.
      console.warn(`[social-login:${provider}] failed`, error);
      showToast(t("login.socialFailed"));
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <AuthScreen
      title={t("login.title")}
      subtitle={t("login.subtitle")}
      footer={
        <>
          <Text className="text-body-sm text-text-secondary">
            {t("login.noAccount")}{" "}
          </Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.replace("/sign-up")}
            hitSlop={8}
          >
            <Text className="text-label-md text-action-primary">
              {t("login.goSignUp")}
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
            if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
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
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (errors.password)
              setErrors((e) => ({ ...e, password: undefined }));
          }}
          error={errors.password}
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={handleEmailLogin}
        />
      </View>

      <SubmitButton
        label={t("login.submit")}
        onPress={handleEmailLogin}
        loading={isSubmitting}
        disabled={loadingProvider !== null}
      />

      <SocialAuthButtons
        onGoogle={handleSocial("google")}
        onApple={handleSocial("apple")}
        loadingProvider={loadingProvider}
        disabled={isSubmitting}
      />
    </AuthScreen>
  );
}
