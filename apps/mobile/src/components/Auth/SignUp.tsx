import { useToastStore } from "@afterglow/stores";
import { colors } from "@afterglow/tokens";
import { Input } from "@afterglow/ui-native";
import { cn } from "@afterglow/utils";
import { useRouter } from "expo-router";
import { Check, Mail } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import {
  sendSignUpVerificationCode,
  signUpWithEmail,
  verifySignUpCode,
} from "@/lib/auth";
import { useI18n } from "@/i18n/i18n-provider";

import { AuthScreen } from "./AuthScreen";
import { PasswordInput } from "./PasswordInput";
import { SubmitButton } from "./SubmitButton";
import { isValidEmail, MIN_PASSWORD_LENGTH } from "./validation";

interface FormErrors {
  email?: string;
  code?: string;
  password?: string;
  passwordConfirm?: string;
}

/**
 * 회원가입 화면(/sign-up).
 * 이메일·비밀번호 자체 회원가입. 가입 전에 이메일 인증을 거친다:
 *   이메일 입력 → "인증" 버튼으로 코드 발송 → 하단 코드 입력창에서 검증 → 인증 완료.
 * 인증 완료 후에만 "가입하기"가 진행되며, 성공 시 바로 로그인 상태가 되어 홈(/)으로 이동한다.
 * 소셜 가입은 로그인 화면의 소셜 버튼으로 동일하게 처리되므로 여기선 이메일 폼만 둔다.
 */
export function SignUp() {
  const { t } = useI18n();
  const router = useRouter();
  const showToast = useToastStore((s) => s.show);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  // 코드 발송됨(코드 입력창 노출) / 인증 완료 여부와 각 액션의 로딩 상태.
  const [codeSent, setCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearError = (field: keyof FormErrors) => {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  /** "인증" 버튼: 이메일을 검증한 뒤 인증 코드를 발송하고 코드 입력창을 연다. */
  const handleSendCode = async () => {
    if (isSendingCode || isVerified) return;
    const trimmed = email.trim();
    if (!trimmed) {
      setErrors((prev) => ({ ...prev, email: t("login.errorEmailRequired") }));
      return;
    }
    if (!isValidEmail(trimmed)) {
      setErrors((prev) => ({ ...prev, email: t("login.errorEmailInvalid") }));
      return;
    }
    setIsSendingCode(true);
    try {
      await sendSignUpVerificationCode(trimmed);
      setCodeSent(true);
    } catch {
      showToast(t("signup.sendCodeFailed"));
    } finally {
      setIsSendingCode(false);
    }
  };

  /** "확인" 버튼: 입력한 코드를 검증한다. 성공 시 인증 완료 플래그만 세운다(토큰 무시). */
  const handleVerifyCode = async () => {
    if (isVerifyingCode || isVerified) return;
    if (!code.trim()) {
      setErrors((prev) => ({ ...prev, code: t("signup.errorCodeRequired") }));
      return;
    }
    setIsVerifyingCode(true);
    try {
      await verifySignUpCode(email.trim(), code.trim());
      setIsVerified(true);
    } catch {
      showToast(t("signup.verifyFailed"));
    } finally {
      setIsVerifyingCode(false);
    }
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
    if (!isVerified) {
      showToast(t("signup.errorEmailNotVerified"));
      return;
    }
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
          disabled={isVerified}
          leftIcon={<Mail size={18} color={colors["text-muted"]} />}
          rightIcon={
            isVerified ? (
              <View className="flex-row items-center gap-1">
                <Check size={16} color={colors.success} />
                <Text className="text-label-sm text-success">
                  {t("signup.verified")}
                </Text>
              </View>
            ) : (
              <InlineActionButton
                label={
                  codeSent
                    ? t("signup.emailResendButton")
                    : t("signup.emailVerifyButton")
                }
                onPress={handleSendCode}
                loading={isSendingCode}
              />
            )
          }
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          returnKeyType="next"
        />

        {codeSent && !isVerified && (
          <Input
            size="md"
            label={t("signup.verificationCodeLabel")}
            placeholder={t("signup.verificationCodePlaceholder")}
            value={code}
            onChangeText={(text) => {
              setCode(text);
              clearError("code");
            }}
            error={errors.code}
            keyboardType="number-pad"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="oneTimeCode"
            returnKeyType="done"
            onSubmitEditing={handleVerifyCode}
            rightIcon={
              <InlineActionButton
                label={t("signup.verifyCodeButton")}
                onPress={handleVerifyCode}
                loading={isVerifyingCode}
                size="sm"
              />
            }
          />
        )}

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

interface InlineActionButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** sm: 코드 입력창(md 필드)용 소형, md: 이메일 필드(lg)용. */
  size?: "sm" | "md";
}

/**
 * Input의 rightIcon 슬롯에 얹는 알약형 액션 버튼(인증·재전송·확인).
 * 필드 안에서 세로 중앙 정렬되며, size로 필드 높이에 맞춰 크기를 살짝 다르게 준다.
 */
function InlineActionButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  size = "md",
}: InlineActionButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      hitSlop={6}
      className={cn(
        "flex-row items-center justify-center rounded-full",
        size === "sm" ? "h-7 min-w-[52px] px-2.5" : "h-8 min-w-[60px] px-3",
        isDisabled
          ? "bg-action-disabled"
          : "bg-action-primary active:bg-action-primary-hover",
      )}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors["on-action-primary"]} />
      ) : (
        <Text
          className={cn(
            "text-label-sm",
            isDisabled ? "text-on-action-disabled" : "text-on-action-primary",
          )}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
