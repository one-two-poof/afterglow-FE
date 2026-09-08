import { colors } from "@afterglow/tokens";
import { ActivityIndicator, Pressable, Text } from "react-native";

interface SubmitButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** E2E 선택자용. 제목과 버튼 텍스트가 겹칠 수 있어 id로 특정한다. */
  testID?: string;
}

/**
 * 폼 제출용 기본(primary) 버튼. ui-native Button은 children을 Text로 감싸 스피너를
 * 넣을 수 없어서, 같은 primary 토큰 스타일을 유지하되 로딩 스피너를 지원하도록 별도 구성.
 * 로그인·회원가입 화면이 공유한다.
 */
export function SubmitButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  testID,
}: SubmitButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      className={
        isDisabled
          ? "bg-action-disabled h-[48px] w-full flex-row items-center justify-center rounded-[8px]"
          : "bg-action-primary active:bg-action-primary-hover h-[48px] w-full flex-row items-center justify-center rounded-[8px]"
      }
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors["on-action-primary"]} />
      ) : (
        <Text
          className={
            isDisabled
              ? "text-label-lg text-on-action-disabled"
              : "text-label-lg text-on-action-primary"
          }
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
