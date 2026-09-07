/**
 * 고객센터 화면에 들어갈 콘텐츠(연락 채널 · 자주 묻는 질문). (ko / en / ja / zh)
 * 문안/연락처는 프로덕션 값으로 교체하기 쉽게 여기 한곳에 모아둔다.
 * 현재 언어(useI18n의 locale)에 맞는 FAQ는 getFaqItems(locale)로 가져온다.
 */

import type { Locale } from "@/i18n/config";

/** 1:1 문의 이메일. (terms-content.ts의 CONTACT_EMAIL과 동일하게 유지) */
export const SUPPORT_EMAIL = "dunaduneo@gmail.com";

export interface FaqItem {
  q: string;
  a: string;
}

/** 자주 묻는 질문. afterglow(시술 일정 기반 여행 코스 추천) 도메인에 맞춘 실제 문안. */
const FAQ_KO: FaqItem[] = [
  {
    q: "코스는 어떤 기준으로 추천되나요?",
    a: "입력한 여행 기간과 시술 일정, 이동 동선을 바탕으로 회복 부담이 적고 동선이 효율적인 순서로 하루 일정을 구성해 추천 순위대로 제안해요. 마음에 드는 코스를 채택하면 '내 코스'에 저장됩니다.",
  },
  {
    q: "시술 일정은 코스에 어떻게 반영되나요?",
    a: "시술 예정일이 있는 날은 일정에 '시술 예정'으로 표시되고, 그날은 회복을 고려해 이동과 실외 활동을 줄인 동선으로 구성돼요. 시술 전후 컨디션에 맞춰 코스를 골라보세요.",
  },
  {
    q: "저장한 코스는 어디서 볼 수 있나요?",
    a: "하단 '내 코스' 탭에서 저장한 코스를 모두 볼 수 있어요. 코스를 누르면 날짜별 상세 일정(방문지·이동 거리·시술 일정)을 확인할 수 있습니다.",
  },
  {
    q: "지도에서 코스가 보이지 않아요.",
    a: "홈 지도 하단의 코스 태그를 눌러 해당 코스의 지점을 지도에 표시할 수 있어요. 위치가 표시되지 않으면 기기 설정에서 앱의 위치 권한이 허용되어 있는지 확인해 주세요.",
  },
  {
    q: "위치 권한은 왜 필요한가요?",
    a: "현재 위치를 기준으로 지도를 표시하고 경로를 안내하며, 주변 장소를 추천하기 위해 위치 정보를 이용해요. 위치 권한은 선택 사항이라 허용하지 않아도 대부분의 기능을 쓸 수 있고, 언제든 기기 설정에서 다시 변경할 수 있어요. 자세한 내용은 이용약관과 개인정보처리방침을 참고해 주세요.",
  },
  {
    q: "내 개인정보는 안전하게 관리되나요?",
    a: "수집하는 정보와 이용 목적, 보관 기간, 안전성 확보 조치는 개인정보처리방침에 모두 안내되어 있어요. 서비스 제공자는 관련 법령에 따라 접근 권한 관리와 전송 구간 암호화 등 보호조치를 적용하고 있습니다.",
  },
  {
    q: "로그인이 되지 않아요.",
    a: "네트워크 상태를 확인한 뒤 앱을 재실행해 주세요. 계속 로그인에 실패하면 사용 중인 소셜 계정 정보와 함께 고객센터 이메일로 문의해 주시면 빠르게 도와드릴게요.",
  },
  {
    q: "회원 탈퇴와 데이터 삭제는 어떻게 하나요?",
    a: "'마이페이지 > 회원 탈퇴'에서 직접 탈퇴할 수 있어요. 탈퇴하면 계정과 저장된 코스 등 개인정보가 관련 법령이 정한 보존 기간을 제외하고 지체 없이 파기됩니다. 진행이 어렵거나 추가 삭제 요청이 있으면 고객센터 이메일로 문의해 주세요. 자세한 내용은 개인정보처리방침을 참고해 주세요.",
  },
];

const FAQ_EN: FaqItem[] = [
  {
    q: "How are courses recommended?",
    a: "Based on your travel period, treatment schedule, and travel route, we build each day's itinerary in an order that eases recovery and keeps travel efficient, then present them in recommended order. When you adopt a course you like, it is saved to \"My Courses.\"",
  },
  {
    q: "How is my treatment schedule reflected in a course?",
    a: "Days with a scheduled treatment are marked \"Treatment planned,\" and those days are arranged with less travel and outdoor activity to support recovery. Choose a course that suits your condition before and after treatment.",
  },
  {
    q: "Where can I see my saved courses?",
    a: "You can see all saved courses on the \"My Courses\" tab at the bottom. Tap a course to view the day-by-day details (places, travel distance, treatment schedule).",
  },
  {
    q: "I can't see the course on the map.",
    a: "Tap the course tag at the bottom of the home map to show that course's points on the map. If locations don't appear, check that the app's location permission is allowed in your device settings.",
  },
  {
    q: "Why is location permission needed?",
    a: "We use location to show the map based on your current position, guide routes, and recommend nearby places. Location permission is optional—you can use most features without it—and you can change it anytime in device settings. See the Terms of Service and Privacy Policy for details.",
  },
  {
    q: "Is my personal information kept safe?",
    a: "The information we collect, our purposes, retention periods, and security measures are all explained in the Privacy Policy. In accordance with applicable law, we apply safeguards such as access rights management and encryption of transmission channels.",
  },
  {
    q: "I can't log in.",
    a: "Check your network and restart the app. If login keeps failing, please email customer support with the social account you're using and we'll help you quickly.",
  },
  {
    q: "How do I delete my account and data?",
    a: "You can delete your account directly at \"My Page > Delete Account.\" Once you withdraw, your account and personal data such as saved courses are destroyed without delay, except for the retention period required by law. If you have trouble or need additional deletion, please email customer support. See the Privacy Policy for details.",
  },
];

const FAQ_JA: FaqItem[] = [
  {
    q: "コースはどのような基準で推薦されますか？",
    a: "入力した旅行期間と施術スケジュール、移動動線をもとに、回復の負担が少なく動線が効率的な順序で1日の日程を構成し、推薦順に提案します。気に入ったコースを採用すると「マイコース」に保存されます。",
  },
  {
    q: "施術スケジュールはコースにどのように反映されますか？",
    a: "施術予定のある日は日程に「施術予定」と表示され、その日は回復を考慮して移動や屋外活動を抑えた動線で構成されます。施術前後の体調に合わせてコースをお選びください。",
  },
  {
    q: "保存したコースはどこで見られますか？",
    a: "下部の「マイコース」タブで保存したコースをすべて確認できます。コースをタップすると、日付別の詳細日程（訪問地・移動距離・施術スケジュール）を確認できます。",
  },
  {
    q: "地図にコースが表示されません。",
    a: "ホーム地図下部のコースタグをタップすると、そのコースの地点を地図に表示できます。位置が表示されない場合は、端末設定でアプリの位置権限が許可されているかご確認ください。",
  },
  {
    q: "位置権限はなぜ必要ですか？",
    a: "現在地を基準に地図を表示し、経路を案内し、周辺の場所を推薦するために位置情報を利用します。位置権限は任意のため、許可しなくてもほとんどの機能をご利用いただけ、いつでも端末設定で変更できます。詳しくは利用規約とプライバシーポリシーをご覧ください。",
  },
  {
    q: "個人情報は安全に管理されますか？",
    a: "収集する情報や利用目的、保管期間、安全性確保の措置はすべてプライバシーポリシーに記載しています。関係法令に従い、アクセス権限の管理や伝送区間の暗号化などの保護措置を適用しています。",
  },
  {
    q: "ログインできません。",
    a: "ネットワークの状態を確認のうえ、アプリを再起動してください。ログインに繰り返し失敗する場合は、ご利用中のソーシャルアカウント情報を添えてカスタマーサポートのメールへお問い合わせください。速やかにサポートします。",
  },
  {
    q: "退会とデータの削除はどうすればよいですか？",
    a: "「マイページ＞退会」から直接退会できます。退会すると、アカウントや保存したコース等の個人情報は、関係法令が定める保存期間を除き遅滞なく破棄されます。手続きが難しい場合や追加の削除をご希望の場合は、カスタマーサポートのメールへお問い合わせください。詳しくはプライバシーポリシーをご覧ください。",
  },
];

const FAQ_ZH: FaqItem[] = [
  {
    q: "路线是按什么标准推荐的？",
    a: "根据您输入的旅行期间、诊疗日程和移动动线，按恢复负担小、动线高效的顺序编排每日行程，并按推荐顺序呈现。采用您满意的路线后，会保存到“我的路线”。",
  },
  {
    q: "诊疗日程如何体现在路线中？",
    a: "有诊疗安排的当天会在行程中标注“诊疗预定”，并考虑恢复，减少移动和户外活动来编排动线。请根据诊疗前后的身体状况选择合适的路线。",
  },
  {
    q: "在哪里可以查看已保存的路线？",
    a: "在底部“我的路线”标签中可查看全部已保存路线。点按某条路线，即可查看按日期的详细行程（访问地点、移动距离、诊疗日程）。",
  },
  {
    q: "地图上看不到路线。",
    a: "点按主页地图底部的路线标签，即可在地图上显示该路线的地点。若位置未显示，请在设备设置中确认已允许应用的位置权限。",
  },
  {
    q: "为什么需要位置权限？",
    a: "我们使用位置信息以根据当前位置显示地图、引导路径并推荐周边地点。位置权限为可选项，即使不授予也可使用大部分功能，且可随时在设备设置中更改。详情请参阅服务条款与隐私政策。",
  },
  {
    q: "我的个人信息会被安全管理吗？",
    a: "我们收集的信息、使用目的、保管期限及安全保障措施均在隐私政策中说明。我们依据相关法律，采取访问权限管理、传输区间加密等保护措施。",
  },
  {
    q: "无法登录。",
    a: "请检查网络状态后重启应用。若持续登录失败，请附上您正在使用的社交账户信息，通过客户服务邮箱与我们联系，我们会尽快协助。",
  },
  {
    q: "如何注销账户并删除数据？",
    a: "您可在“我的页面＞注销会员”直接注销。注销后，除法律规定的保存期限外，账户及已保存路线等个人信息将不迟延地予以销毁。如操作遇到困难或需要额外删除，请通过客户服务邮箱联系我们。详情请参阅隐私政策。",
  },
];

const FAQ_BY_LOCALE: Record<Locale, FaqItem[]> = {
  ko: FAQ_KO,
  en: FAQ_EN,
  ja: FAQ_JA,
  zh: FAQ_ZH,
};

/** 현재 언어에 맞는 FAQ 목록을 반환한다. 미지원 로케일은 한국어로 폴백. */
export function getFaqItems(locale: Locale): FaqItem[] {
  return FAQ_BY_LOCALE[locale] ?? FAQ_BY_LOCALE.ko;
}
