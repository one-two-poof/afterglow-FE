# 상태 페이지

백엔드가 살아 있는지, E2E가 깨졌는지를 한 화면에서 보기 위한 장치.
기획 배경과 전체 로드맵은 별도 기획서 참고 — 이 문서는 운영 방법만 적는다.

## 구조

```
health.yml (30분 cron)  ──┐
e2e.yml    (야간 + main)  ──┤→  status-data 브랜치  →  status-page.yml  →  GitHub Pages
sentry.yml (매시)        ──┘      (기록 전용)           (정적 HTML 빌드)
```

- **status-data**: 코드가 없는 기록 전용 브랜치. 워크플로가 자동으로 만든다(수동 생성 불필요).
  - `health/YYYY-MM.jsonl` — 프로브 결과 한 줄에 하나. 두 달치만 보관하고 나머지는 자동 삭제.
  - `e2e/latest.json` — 마지막 E2E 실행 요약.
  - `sentry/latest.json` — 24시간 이벤트 수와 상위 미해결 이슈. 없으면 "준비 중" 카드로 표시된다.
  - 두 워크플로가 같은 브랜치에 푸시하므로 커밋은 `.github/actions/status-data-*` 공용
    액션을 쓴다. 푸시가 겹치면 리베이스 후 재시도한다(서로 다른 파일이라 충돌 없음).
- 페이지는 **빌드 타임에 값이 박히는 정적 HTML**이다. 런타임에 API를 부르지 않으므로 토큰이 페이지에 실리지 않고, 백엔드가 죽어도 페이지 자체는 뜬다.

## 화면 구성

사이드바 탭 4개 — **개요 / 백엔드 / E2E / 앱 에러**. 탭 옆의 점이 그 영역의 상태이고,
**개요의 점은 셋 중 가장 나쁜 상태**를 그대로 올린다(백엔드만 보고 초록을 띄우면 E2E가
깨져 있어도 사이드바가 조용해진다). 보던 탭은 `localStorage`에 기억한다 — 페이지가 5분마다
자동 새로고침되기 때문이다.

색·타이포는 `packages/tokens`의 시맨틱 토큰을 그대로 CSS 변수로 옮겼다(`--text-secondary`,
`--surface-muted`, `--ok/--warn/--bad` 등). 본문 글꼴은 디자인 시스템과 같은 **Pretendard**를
CDN에서 받고, 실패하면 `-apple-system`으로 폴백한다 — 글꼴은 소프트 의존이라 못 받아도
페이지는 그대로 뜬다.

## 최초 1회 설정

저장소 **Settings → Pages → Source**를 `GitHub Actions`로 바꾼다. 이걸 안 하면
`status-page.yml`의 배포 스텝이 실패한다. 그 외 수동 설정은 없다.

## 프로브가 보는 것

| 프로브 | 요청 | 정상 | 실패가 뜻하는 것 |
| --- | --- | --- | --- |
| `main-api` | `GET /api/auth/me` (토큰 없이) | **401** | 5xx·타임아웃이면 서버 이상. 200이면 인증이 뚫린 것 |
| `ml-api` | `GET /api/course-selection` | 5xx 아님, 404 아님 | 5xx는 앱 다운, 404는 라우트 소멸 |
| `buildings-pmtiles` | `GET /data/buildings.pmtiles` `Range: bytes=0-16` | **206** + 캐시 가능 헤더 | Range 중단이면 지도 건물·그림자가 죽는다 |

`buildings-pmtiles`는 상태코드뿐 아니라 **`Cache-Control`에 `no-store`가 돌아왔는지**도 본다.
과거 이 헤더 때문에 MapLibre Native의 PMTilesFileSource가 SIGSEGV로 죽어 앱이 실행 즉시
종료됐다(2026-09-04 서버 수정으로 해결). 서버 재배포로 헤더가 되돌아가는 회귀를 잡는 장치다.

인증이 필요한 엔드포인트(`/api/places` 등)는 아직 프로브에 없다. 전용 테스트 계정이
생기면 토큰을 Secrets로 주입해 200 프로브를 추가한다.

## 오탐 방지

네트워크 계층 실패(DNS·연결 실패, `status: 0`)는 3초 뒤 **한 번 더 시도**하고, 두 번 다
실패해야 실패로 센다. duckdns의 A 레코드 TTL이 60초라 갱신 순간 리졸버에 따라 짧게
이름이 안 풀린다(실측: 같은 시각 `8.8.8.8` 실패 / `1.1.1.1` 성공). 서버가 실제로 응답한
5xx는 재시도하지 않는다 — 감추면 안 되는 신호다.

## 알림

프로브가 하나라도 실패하면 `health.yml` 잡이 실패한다. **스케줄 워크플로가 실패하면
GitHub이 저장소 소유자에게 메일을 보낸다** — 지금은 이게 유일한 경보다.
Slack/Discord webhook이나 Issue 자동 생성이 필요해지면 마지막 스텝에 붙이면 된다.

## E2E (`e2e.yml`)

야간 03:00 KST + `main` 푸시(앱·패키지 변경 시) + 수동 실행. 잡 1회 20~40분이라 매 PR에는 안 건다.

**러너 이미지**: `macos-26`이어야 한다. `macos-15`(Xcode 16.4 / Swift 6.1)에서는
Expo 57/RN 0.86의 prebuilt 의존성이 요구하는 Swift tools 6.2를 만족하지 못해
`ExpoModulesJSI` xcframework 빌드가 실패한다. 워크플로가 시작 직후 Swift 버전을 검사해
조건이 안 맞으면 20분짜리 빌드를 돌리기 전에 끊는다.

**로컬과 CI가 다른 점**: `.maestro/run.sh`는 Expo dev-client + Metro가 떠 있는 걸 전제하지만
CI에는 그 상태가 없다. 그래서 CI는 **Release 시뮬레이터 빌드**를 만든다 — Release여야 JS 번들이
앱에 embed되고 Metro 없이 실행된다. `ios/`는 gitignore 대상(CNG)이라 매 실행마다 `expo prebuild`로
생성하고, Pods만 캐시한다.

결과는 JUnit XML → `scripts/e2e-report.mjs` → `e2e/latest.json`으로 요약해 상태 페이지가 읽는다.
스크린샷·화면계층은 Actions 아티팩트로 14일 보관한다(실패했을 때 이게 제일 쓸모 있다).

**플로우를 추가할 때**: `.maestro/`에 `.yaml`을 놓으면 워크플로 수정 없이 자동으로 포함된다
(디렉터리를 통째로 훑는다). 단 공용 **서브플로우는 `tags: [subflow]`를 반드시 붙여야 한다** —
제외 기준이 경로가 아니라 태그라서, 빠뜨리면 단독 실행 대상이 돼 실패한다. CI(`ci.yml`)가
매 PR에서 이걸 검사한다.

플로우가 8~10개를 넘어가면 잡 `timeout-minutes: 60`이 빠듯해진다(빌드에만 25~30분).
그때는 타임아웃을 올리거나 빌드를 아티팩트로 공유하고 플로우를 매트릭스 잡으로 나눠야 한다.

`run.sh`도 같은 JUnit 리포트를 `artifacts/<타임스탬프>/report.xml`에 남기므로 로컬에서도
같은 요약을 만들어 볼 수 있다.

## Sentry (`sentry.yml`)

앱은 `@sentry/react-native`로 에러를 보내고, 워크플로가 매시 Issues API를 읽어
`sentry/latest.json`으로 요약한다. 페이지가 브라우저에서 Sentry를 직접 부르지 않는 이유는
정적 HTML에 토큰을 실을 수 없어서다.

**DSN이 없으면 리포팅은 통째로 꺼진다**(`src/lib/monitoring.ts`). SDK를 초기화하지 않고
리포트 호출도 무시하므로, Sentry 계정 없이도 앱과 워크플로가 그대로 돈다.

### 무엇을 보내나

`lib/axios.ts`의 응답 인터셉터에서 실패를 리포트한다 — 이 지점을 고른 이유는 여기서
에러가 사용자 문구로 정규화되며 **원래 정보가 사라지기 때문**이다. 태그는
`client`(main/ai) · `endpoint` · `status`. 응답 자체가 없던 실패는 `status: 0`이다.

**401/403은 보내지 않는다.** 토큰 만료로 늘 발생하는 정상 흐름이라 무료 티어(월 5천 이벤트)를
의미 없이 태운다.

### 개인정보

**쿼리스트링은 항상 잘라낸다.** `/api/places`는 뷰포트 `bbox`(= 사용자 위치)를 쿼리로 보내므로
URL을 그대로 올리면 위치 이력이 Sentry에 쌓인다. `scrubEvent`가 전송 직전에 쿼리스트링·요청
본문·`Authorization`/`Cookie` 헤더·`user` 필드를 모두 제거하고, `sendDefaultPii: false`로
이중 방어한다. `docs/performance`의 "정확한 위치 좌표는 수집하지 않는다" 기준과 같은 선이다.

### 설정 (계정 만든 뒤)

1. Sentry에서 React Native 프로젝트 생성 → DSN 복사
2. `apps/mobile/.env`와 `eas.json`의 `env`에 `EXPO_PUBLIC_SENTRY_DSN` 추가
   (DSN은 공개돼도 되는 값이다 — 쓰기 전용 엔드포인트)
3. 저장소 Secrets에 `SENTRY_AUTH_TOKEN`(Issues 읽기 권한) · `SENTRY_ORG` · `SENTRY_PROJECT` 추가
4. 앱 재빌드 (`EXPO_PUBLIC_`은 번들 타임에 인라인된다)

### 아직 안 한 것 — 소스맵

Expo config plugin(`@sentry/react-native/expo`)은 **일부러 넣지 않았다.** 이 플러그인은
소스맵 업로드 빌드 단계를 추가하는데, org/project/토큰이 없으면 설정할 게 없고, pnpm이
`@sentry/cli`의 빌드 스크립트를 막아둔 상태라 CI 빌드가 깨질 위험이 있다.
그동안 Release 빌드의 JS 스택 트레이스는 minify된 채로 올라간다.

계정을 만든 뒤 플러그인을 추가하려면 `.npmrc`나 `pnpm approve-builds`로 `@sentry/cli`
빌드 스크립트를 허용해야 하고, E2E CI 빌드가 통과하는지 확인해야 한다.

## 로컬에서 돌리기

```bash
pnpm health:check                                   # 프로브만 실행 (기록 안 남김)
pnpm health:check -- --out /tmp/status-data         # JSONL까지 기록
pnpm status:build -- --data /tmp/status-data --out /tmp/site/index.html
open /tmp/site/index.html
pnpm test:scripts                                   # 집계·렌더 단위 테스트

apps/mobile/.maestro/run.sh                         # E2E (Metro가 떠 있어야 함)
node scripts/e2e-report.mjs \
  --input apps/mobile/.maestro/artifacts/<타임스탬프>/report.xml --out /tmp/status-data
```

## 알아둘 것

- **cron은 정시를 보장하지 않는다.** GitHub 스케줄은 부하에 따라 지연·누락되므로
  가용률은 정확한 SLA가 아니라 추세로 읽어야 한다.
- **스케줄 워크플로는 저장소가 60일간 조용하면 자동 비활성화된다.** 그래서 페이지 상단에
  갱신 시각을 박아뒀다 — 시각이 멈춰 있으면 서버가 아니라 워크플로가 멈춘 것이다.
- `workflow_run` 트리거는 기본 브랜치에 있는 워크플로 정의만 본다. main에 머지되기 전에는
  `workflow_dispatch`로 수동 실행해서 확인할 것.
