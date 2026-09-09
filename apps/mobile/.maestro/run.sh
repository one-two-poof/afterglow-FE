#!/usr/bin/env bash
# Maestro E2E 러너 (iOS 시뮬레이터 / Expo dev-client)
#
# 사용법:
#   .maestro/run.sh                         # .maestro 안의 모든 플로우 실행
#   .maestro/run.sh login-validation.yaml   # 특정 플로우만 실행
#
# 동작:
#   - Java(keg-only openjdk)와 maestro를 PATH에 올린다.
#   - 스텝별 스크린샷/화면계층/로그를 .maestro/artifacts/<타임스탬프>/ 에 저장한다(사후 확인용).
#   - subflows/ 의 공용 서브플로우는 단독 실행 대상이 아니므로 tags:[subflow]로 제외한다
#     (디렉터리 실행은 하위 디렉터리까지 훑기 때문에 태그로 걸러야 한다).
#
# 사전조건:
#   1) 다른 터미널에서 `pnpm --filter mobile dev`(= expo start --dev-client)로 Metro가 떠 있어야 함.
#   2) dev-client가 한 번은 Metro에 연결돼 URL을 기억한 상태여야 함(그 뒤로는 launchApp이 자동 재연결).
#      최초 연결이 안 돼 dev 런처가 뜨면 아래 명령으로 한 번만 붙여준다:
#        xcrun simctl openurl <booted-udid> "exp+afterglow://expo-development-client/?url=http://localhost:8081"
set -euo pipefail

MOBILE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home}"
export PATH="$JAVA_HOME/bin:$HOME/.maestro/bin:$PATH"
export MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true

TS="$(date +%Y%m%d-%H%M%S)"
OUT="${MOBILE_DIR}/.maestro/artifacts/${TS}"
mkdir -p "${OUT}"

TARGET="${1:-${MOBILE_DIR}/.maestro}"
[[ "${TARGET}" != /* ]] && TARGET="${MOBILE_DIR}/.maestro/${TARGET}"

echo "▶ maestro test ${TARGET}"
echo "  artifacts → ${OUT}"
maestro test "${TARGET}" --exclude-tags=subflow --debug-output "${OUT}"
