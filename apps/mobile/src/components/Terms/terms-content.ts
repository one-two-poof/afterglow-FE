/**
 * 이용약관 · 개인정보처리방침 문서 콘텐츠. (ko / en / ja / zh)
 * ⚠️ 아래 문안은 서비스 성격과 앱스토어 심사 기준(개인정보 처리방침 필수 고지,
 *    위치정보 이용 고지, 계정·데이터 삭제, 의료 관련 면책 등)을 반영한 초안(예시)으로,
 *    정식 출시 전 반드시 법무 검토를 거쳐야 한다. 문구/시행일은 여기 한곳에서 관리한다.
 *    현재 언어(useI18n의 locale)에 맞는 문서는 getTermsDocs(locale)로 가져온다.
 */

import type { Locale } from "@/i18n/config";

/** 고객센터 문의 이메일과 동일하게 유지한다. (support-content.ts의 SUPPORT_EMAIL) */
const CONTACT_EMAIL = "dunaduneo@gmail.com";

export interface TermsSection {
  heading: string;
  body: string;
}

export interface TermsDoc {
  key: "terms" | "privacy";
  /** 세그먼트 탭에 표시할 짧은 라벨 */
  label: string;
  /** 시행일 (언어별 표기, 예: "2026년 9월 7일" / "September 7, 2026") */
  effectiveDate: string;
  sections: TermsSection[];
}

// ─────────────────────────────── 한국어 ───────────────────────────────

const TERMS_KO: TermsDoc = {
  key: "terms",
  label: "이용약관",
  effectiveDate: "2026년 9월 7일",
  sections: [
    {
      heading: "제1조 (목적)",
      body: "본 약관은 afterglow(이하 '서비스 제공자')가 모바일 애플리케이션을 통해 제공하는 여행 코스 추천 및 관련 서비스(이하 '서비스')의 이용과 관련하여 서비스 제공자와 회원 간의 권리·의무 및 책임사항, 이용조건 및 절차를 규정함을 목적으로 합니다.",
    },
    {
      heading: "제2조 (용어의 정의)",
      body: "'회원'이란 본 약관에 동의하고 서비스를 이용하는 자를 말합니다. '코스'란 서비스 제공자가 회원의 여행 기간과 시술 일정, 이동 동선 등을 바탕으로 제안하는 일자별 방문 일정을 말합니다. '콘텐츠'란 서비스 내에 게시된 장소 정보·이미지·텍스트 등 일체의 정보를 말합니다. 그 밖의 용어는 관계 법령 및 일반 관례에 따릅니다.",
    },
    {
      heading: "제3조 (약관의 게시와 개정)",
      body: "서비스 제공자는 본 약관을 회원이 쉽게 확인할 수 있도록 서비스 화면에 게시합니다. 서비스 제공자는 「약관의 규제에 관한 법률」 등 관련 법령을 위반하지 않는 범위에서 약관을 개정할 수 있으며, 개정 시 적용일자와 개정 사유를 명시하여 적용일 최소 7일(회원에게 불리하거나 중대한 변경은 30일) 전부터 서비스 내 공지합니다. 회원이 개정 약관에 동의하지 않는 경우 이용계약을 해지할 수 있습니다.",
    },
    {
      heading: "제4조 (서비스의 제공 및 변경)",
      body: "서비스 제공자는 코스 추천, 지도 및 경로 안내, 일정 관리, 코스 저장 등의 기능을 제공합니다. 서비스 제공자는 운영상·기술상 필요에 따라 서비스의 전부 또는 일부를 변경하거나 중단할 수 있으며, 이 경우 변경 내용과 사유를 사전에 공지합니다. 다만 긴급한 시스템 점검, 천재지변 등 부득이한 경우에는 사후에 공지할 수 있습니다.",
    },
    {
      heading: "제5조 (회원가입 및 계정)",
      body: "회원은 소셜 로그인 등 서비스 제공자가 정한 방법으로 가입할 수 있습니다. 회원은 계정 정보를 정확하게 유지·관리할 책임이 있으며, 자신의 계정을 제3자가 이용하도록 허용해서는 안 됩니다. 계정의 관리 소홀이나 부정 사용으로 발생한 문제에 대한 책임은 회원 본인에게 있습니다.",
    },
    {
      heading: "제6조 (계정의 해지 및 삭제)",
      body: "회원은 언제든지 앱 내 '마이페이지 > 회원 탈퇴' 또는 고객센터를 통해 이용계약 해지(회원 탈퇴)를 요청할 수 있습니다. 탈퇴 시 회원의 계정과 저장된 코스 등 개인정보는 개인정보처리방침에 따라 처리되며, 관계 법령상 보존 의무가 있는 정보를 제외하고 지체 없이 파기됩니다.",
    },
    {
      heading: "제7조 (회원의 의무 및 금지행위)",
      body: "회원은 관계 법령과 본 약관을 준수해야 하며, 다음 행위를 해서는 안 됩니다. 타인의 정보 도용 및 권리 침해, 서비스의 정상적 운영을 방해하는 행위, 자동화된 수단으로 콘텐츠를 무단 수집·복제하는 행위, 법령·공서양속에 반하거나 타인에게 불쾌감을 주는 정보의 게시, 서비스 제공자의 사전 동의 없는 영리 목적의 서비스 이용.",
    },
    {
      heading: "제8조 (위치기반서비스)",
      body: "서비스 제공자는 지도 표시, 경로 안내, 주변 장소 추천 등을 위하여 회원의 단말기 위치정보를 이용할 수 있습니다. 위치정보의 수집·이용은 회원의 사전 동의와 단말기 위치 권한 허용을 전제로 하며, 회원은 언제든지 단말기 설정 또는 서비스 내에서 위치정보 이용 동의를 철회할 수 있습니다. 위치기반서비스의 구체적인 내용은 「위치정보의 보호 및 이용 등에 관한 법률」 및 개인정보처리방침에 따릅니다.",
    },
    {
      heading: "제9조 (콘텐츠 및 지식재산권)",
      body: "서비스 및 서비스에 포함된 코스·장소 정보·디자인·상표 등 콘텐츠에 대한 저작권과 지식재산권은 서비스 제공자 또는 정당한 권리자에게 귀속됩니다. 회원은 서비스 제공자의 사전 동의 없이 이를 복제·배포·전송·출판하거나 상업적으로 이용할 수 없습니다.",
    },
    {
      heading: "제10조 (유료서비스 및 결제)",
      body: "현재 서비스의 주요 기능은 무료로 제공됩니다. 서비스 제공자가 향후 유료서비스를 도입하는 경우 애플 앱스토어·구글 플레이 등 앱 마켓의 결제 정책 및 관련 법령에 따라 이용요금, 청약철회·환불 조건을 사전에 고지합니다. 인앱 결제의 환불은 각 앱 마켓의 정책에 따릅니다.",
    },
    {
      heading: "제11조 (면책 및 의료 관련 고지)",
      body: "서비스 제공자가 제공하는 코스·장소·일정 정보는 참고용이며, 실제 이동·방문·예약 및 그 결과에 대한 최종 판단과 책임은 회원 본인에게 있습니다. 특히 시술·회복 등 건강·의료와 관련된 정보는 일반적 참고 자료일 뿐 의학적 조언이나 진단·치료를 대체하지 않으며, 관련 결정은 반드시 담당 의료진과 상담하시기 바랍니다. 서비스 제공자는 회원이 제3의 장소·업체를 방문하여 발생한 손해에 대하여 서비스 제공자의 고의 또는 중과실이 없는 한 책임을 지지 않습니다.",
    },
    {
      heading: "제12조 (책임의 한계)",
      body: "서비스 제공자는 천재지변, 통신장애, 회원의 귀책사유 등 서비스 제공자의 합리적 통제를 벗어난 사유로 인한 서비스 제공의 장애에 대하여 책임을 지지 않습니다. 무료로 제공되는 서비스와 관련하여는 관련 법령에 특별한 규정이 없는 한 서비스 제공자가 책임을 부담하지 않습니다.",
    },
    {
      heading: "제13조 (준거법 및 분쟁해결)",
      body: "본 약관은 대한민국 법령에 따라 해석되며, 서비스 이용과 관련하여 서비스 제공자와 회원 간 분쟁이 발생한 경우 상호 신의성실의 원칙에 따라 원만히 해결하기 위해 노력합니다. 협의가 이루어지지 않을 경우 관계 법령이 정한 절차와 관할 법원에 따릅니다.",
    },
  ],
};

const PRIVACY_KO: TermsDoc = {
  key: "privacy",
  label: "개인정보처리방침",
  effectiveDate: "2026년 9월 7일",
  sections: [
    {
      heading: "1. 총칙",
      body: "afterglow(이하 '서비스 제공자')는 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의 개인정보를 안전하게 보호하기 위해 최선을 다합니다. 본 방침은 서비스 제공자가 제공하는 모바일 서비스에서 이용자의 개인정보가 어떻게 수집·이용·보관·파기되는지를 설명합니다.",
    },
    {
      heading: "2. 수집하는 개인정보 항목",
      body: "서비스 제공자는 다음의 개인정보를 수집합니다. (필수) 소셜 로그인 계정 식별자, 프로필 정보(이름·이메일·프로필 이미지), 서비스 이용 과정에서 생성되는 여행 일정·저장 코스·시술 일정 정보. (선택) 단말기 위치정보. (자동 수집) 기기 정보(OS·기기 식별자·앱 버전), 서비스 이용 기록 및 오류 로그.",
    },
    {
      heading: "3. 개인정보의 수집 및 이용 목적",
      body: "수집한 개인정보는 회원 식별 및 로그인 유지, 여행 코스 추천과 지도·경로 안내, 저장 코스 관리, 고객 문의 응대 및 공지 전달, 서비스 안정성 확보와 오류 개선, 부정 이용 방지를 위해 이용됩니다. 서비스 제공자는 명시한 목적 외의 용도로 개인정보를 이용하지 않습니다.",
    },
    {
      heading: "4. 위치정보의 처리",
      body: "서비스 제공자는 지도 표시·경로 안내·주변 장소 추천을 위해 이용자가 동의하고 단말기 위치 권한을 허용한 경우에 한하여 위치정보를 이용합니다. 위치정보는 해당 기능 제공을 위해 일시적으로 이용되며, 서비스 제공 목적이 달성되면 지체 없이 파기합니다(관련 법령에 따라 보관이 필요한 경우 제외). 이용자는 단말기 설정에서 위치 권한을 변경하거나 동의를 철회할 수 있으며, 이 경우 위치 기반 기능의 이용이 제한될 수 있습니다.",
    },
    {
      heading: "5. 개인정보의 제3자 제공",
      body: "서비스 제공자는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 다만 이용자가 사전에 동의한 경우, 또는 법령에 근거가 있거나 수사기관이 적법한 절차에 따라 요청하는 경우에 한하여 제공할 수 있습니다.",
    },
    {
      heading: "6. 개인정보 처리의 위탁",
      body: "서비스 제공자는 원활한 서비스 제공을 위해 개인정보 처리 업무의 일부를 외부에 위탁할 수 있습니다. 위탁 대상에는 앱 실행 및 데이터 저장을 위한 클라우드 인프라 사업자, 소셜 로그인 인증 사업자, 지도·타일 데이터 제공 사업자, 서비스 품질 개선을 위한 분석 도구 사업자가 포함될 수 있습니다. 서비스 제공자는 위탁 시 관련 법령에 따라 개인정보가 안전하게 관리되도록 필요한 사항을 규정하고 감독합니다.",
    },
    {
      heading: "7. 개인정보의 보유 및 이용 기간",
      body: "서비스 제공자는 원칙적으로 개인정보 수집·이용 목적이 달성되거나 회원이 탈퇴하면 해당 정보를 지체 없이 파기합니다. 다만 「전자상거래 등에서의 소비자보호에 관한 법률」, 「통신비밀보호법」 등 관계 법령에서 일정 기간 보존을 요구하는 경우에는 해당 기간 동안 안전하게 분리 보관한 후 파기합니다.",
    },
    {
      heading: "8. 개인정보의 파기 절차 및 방법",
      body: "보유 기간이 경과하거나 처리 목적이 달성된 개인정보는 지체 없이 파기합니다. 전자적 파일 형태의 정보는 복구·재생이 불가능한 방법으로 영구 삭제하며, 종이에 출력된 정보는 분쇄하거나 소각하여 파기합니다.",
    },
    {
      heading: "9. 이용자의 권리와 행사 방법",
      body: "이용자는 언제든지 자신의 개인정보를 조회·수정하거나 처리 정지 및 삭제를 요청할 수 있으며, 수집·이용에 대한 동의를 철회할 수 있습니다. 회원 탈퇴 및 계정 삭제는 앱 내 '마이페이지 > 회원 탈퇴'에서 직접 진행할 수 있고, 그 밖의 권리 행사는 아래 고객센터를 통해 요청할 수 있습니다. 서비스 제공자는 요청을 받은 경우 지체 없이 필요한 조치를 취합니다.",
    },
    {
      heading: "10. 만 14세 미만 아동의 개인정보",
      body: "본 서비스는 원칙적으로 만 14세 이상을 대상으로 합니다. 서비스 제공자는 만 14세 미만 아동의 개인정보를 수집하지 않으며, 아동의 개인정보가 수집된 사실이 확인될 경우 법정대리인의 요청 또는 서비스 제공자의 확인에 따라 지체 없이 삭제합니다.",
    },
    {
      heading: "11. 개인정보의 안전성 확보 조치",
      body: "서비스 제공자는 개인정보의 안전한 처리를 위해 접근 권한 관리, 전송 구간 암호화, 접근 기록 보관, 보안 취약점 점검 등 관련 법령이 요구하는 관리적·기술적 보호조치를 시행합니다.",
    },
    {
      heading: "12. 개인정보 보호책임자 및 문의처",
      body: `서비스 제공자는 개인정보 처리에 관한 업무를 총괄하는 개인정보 보호책임자를 지정하여 운영하고 있습니다. 개인정보 관련 문의, 불만 처리 및 권리 행사는 고객센터 이메일(${CONTACT_EMAIL})로 접수할 수 있으며, 서비스 제공자는 신속하고 성실하게 답변·처리합니다. 그 밖의 개인정보 침해에 관한 상담은 개인정보분쟁조정위원회, 한국인터넷진흥원(KISA) 개인정보침해 신고센터 등에 문의할 수 있습니다.`,
    },
    {
      heading: "13. 방침의 변경",
      body: "본 개인정보처리방침은 법령·정책 또는 서비스 내용의 변경에 따라 개정될 수 있습니다. 방침을 개정하는 경우 변경 내용과 적용일자를 서비스 화면을 통해 사전에 공지합니다.",
    },
  ],
};

// ─────────────────────────────── English ───────────────────────────────

const TERMS_EN: TermsDoc = {
  key: "terms",
  label: "Terms of Service",
  effectiveDate: "September 7, 2026",
  sections: [
    {
      heading: "Article 1 (Purpose)",
      body: "These Terms govern the rights, obligations, responsibilities, and conditions of use between afterglow (the \"Service Provider\") and members in connection with the travel course recommendation and related services (the \"Service\") provided through the mobile application.",
    },
    {
      heading: "Article 2 (Definitions)",
      body: "\"Member\" means a person who agrees to these Terms and uses the Service. \"Course\" means a day-by-day visit itinerary proposed by the Service Provider based on the member's travel period, treatment schedule, and travel route. \"Content\" means all information posted within the Service, including place information, images, and text. Terms not defined here follow relevant laws and general practice.",
    },
    {
      heading: "Article 3 (Posting and Amendment of Terms)",
      body: "The Service Provider posts these Terms within the Service so that members can easily review them. The Service Provider may amend these Terms within the scope permitted by applicable law, and will announce any amendment within the Service, stating the effective date and reason, at least 7 days in advance (30 days for changes that are unfavorable or material to members). A member who does not agree to the amended Terms may terminate the use agreement.",
    },
    {
      heading: "Article 4 (Provision and Modification of the Service)",
      body: "The Service Provider offers features such as course recommendations, map and route guidance, itinerary management, and course saving. The Service Provider may modify or suspend all or part of the Service for operational or technical reasons and will give prior notice of such changes. In unavoidable cases such as urgent system maintenance or force majeure, notice may be given afterward.",
    },
    {
      heading: "Article 5 (Membership and Accounts)",
      body: "Members may sign up through methods designated by the Service Provider, such as social login. Members are responsible for keeping their account information accurate and must not allow third parties to use their account. Members are responsible for any issues arising from negligent management or unauthorized use of their account.",
    },
    {
      heading: "Article 6 (Termination and Deletion of Account)",
      body: "Members may request termination of the use agreement (account withdrawal) at any time through \"My Page > Delete Account\" in the app or via customer support. Upon withdrawal, the member's account and personal data such as saved courses are handled in accordance with the Privacy Policy and are destroyed without delay, except for information that must be retained under applicable law.",
    },
    {
      heading: "Article 7 (Member Obligations and Prohibited Acts)",
      body: "Members must comply with applicable laws and these Terms and must not: steal others' information or infringe their rights; interfere with the normal operation of the Service; collect or reproduce content by automated means without authorization; post information that violates laws or public morals or causes discomfort to others; or use the Service for commercial purposes without the Service Provider's prior consent.",
    },
    {
      heading: "Article 8 (Location-Based Services)",
      body: "The Service Provider may use the member's device location for map display, route guidance, and nearby place recommendations. Collection and use of location data are premised on the member's prior consent and the granting of device location permission, and members may withdraw consent to the use of location data at any time through device settings or within the Service. Details of the location-based service follow the Act on the Protection and Use of Location Information and the Privacy Policy.",
    },
    {
      heading: "Article 9 (Content and Intellectual Property)",
      body: "Copyright and intellectual property rights in the Service and its content—including courses, place information, designs, and trademarks—belong to the Service Provider or the rightful holders. Members may not reproduce, distribute, transmit, publish, or commercially exploit such content without the Service Provider's prior consent.",
    },
    {
      heading: "Article 10 (Paid Services and Payment)",
      body: "The core features of the Service are currently provided free of charge. If the Service Provider introduces paid services in the future, it will give prior notice of fees and conditions for withdrawal of subscription and refunds in accordance with the payment policies of app marketplaces such as the Apple App Store and Google Play and applicable law. Refunds for in-app purchases follow the policies of each app marketplace.",
    },
    {
      heading: "Article 11 (Disclaimer and Medical Notice)",
      body: "Course, place, and itinerary information provided by the Service Provider is for reference only, and the final judgment and responsibility for actual travel, visits, reservations, and their outcomes rest with the member. In particular, information related to procedures, recovery, and other health or medical matters is general reference material only, does not replace medical advice, diagnosis, or treatment, and related decisions must be made in consultation with your medical professional. The Service Provider is not liable for damages arising from a member's visit to a third-party place or business, except where caused by the Service Provider's intent or gross negligence.",
    },
    {
      heading: "Article 12 (Limitation of Liability)",
      body: "The Service Provider is not liable for failures in providing the Service due to causes beyond its reasonable control, such as force majeure, communication failures, or the member's fault. With respect to services provided free of charge, the Service Provider bears no liability unless otherwise specifically required by applicable law.",
    },
    {
      heading: "Article 13 (Governing Law and Dispute Resolution)",
      body: "These Terms are interpreted under the laws of the Republic of Korea. In the event of a dispute between the Service Provider and a member regarding use of the Service, both parties will endeavor to resolve it amicably in good faith. If no agreement is reached, the matter will be handled according to the procedures and competent court prescribed by applicable law.",
    },
  ],
};

const PRIVACY_EN: TermsDoc = {
  key: "privacy",
  label: "Privacy Policy",
  effectiveDate: "September 7, 2026",
  sections: [
    {
      heading: "1. General",
      body: "afterglow (the \"Service Provider\") complies with applicable laws including the Personal Information Protection Act and does its utmost to protect users' personal information safely. This Policy explains how users' personal information is collected, used, stored, and destroyed in the mobile service provided by the Service Provider.",
    },
    {
      heading: "2. Personal Information Collected",
      body: "The Service Provider collects the following. (Required) Social login account identifier; profile information (name, email, profile image); travel itineraries, saved courses, and treatment schedule information generated while using the Service. (Optional) Device location data. (Automatically collected) Device information (OS, device identifier, app version), service usage records, and error logs.",
    },
    {
      heading: "3. Purpose of Collection and Use",
      body: "Collected personal information is used to identify members and maintain login, recommend travel courses and provide map and route guidance, manage saved courses, respond to inquiries and deliver notices, ensure service stability and fix errors, and prevent misuse. The Service Provider does not use personal information for purposes other than those stated.",
    },
    {
      heading: "4. Processing of Location Data",
      body: "The Service Provider uses location data only when the user has consented and granted device location permission, for map display, route guidance, and nearby place recommendations. Location data is used temporarily to provide the relevant feature and is destroyed without delay once the purpose is achieved (except where retention is required by law). Users may change location permission or withdraw consent in device settings, in which case location-based features may be limited.",
    },
    {
      heading: "5. Provision to Third Parties",
      body: "The Service Provider does not provide personal information to third parties without the user's consent. It may do so only where the user has consented in advance, where there is a legal basis, or where an investigative agency requests it through lawful procedures.",
    },
    {
      heading: "6. Entrustment of Processing",
      body: "The Service Provider may entrust part of its personal information processing to external providers to operate the Service smoothly. Such providers may include cloud infrastructure providers for running the app and storing data, social login authentication providers, map and tile data providers, and analytics tool providers for improving service quality. When entrusting processing, the Service Provider establishes the necessary requirements and supervises the providers so that personal information is managed safely under applicable law.",
    },
    {
      heading: "7. Retention and Use Period",
      body: "In principle, the Service Provider destroys personal information without delay once the purpose of collection and use is achieved or the member withdraws. However, where laws such as the Act on Consumer Protection in Electronic Commerce or the Protection of Communications Secrets Act require retention for a certain period, the information is stored separately and securely for that period before being destroyed.",
    },
    {
      heading: "8. Destruction Procedure and Method",
      body: "Personal information whose retention period has elapsed or whose processing purpose has been achieved is destroyed without delay. Information in electronic file form is permanently deleted in a manner that prevents recovery or reproduction, and information printed on paper is shredded or incinerated.",
    },
    {
      heading: "9. Rights of Users and How to Exercise Them",
      body: "Users may at any time view or correct their personal information, request suspension of processing or deletion, and withdraw consent to collection and use. Account withdrawal and deletion can be done directly at \"My Page > Delete Account\" in the app; other rights may be exercised through customer support below. The Service Provider takes the necessary measures without delay upon receiving a request.",
    },
    {
      heading: "10. Personal Information of Children Under 14",
      body: "This Service is, in principle, intended for users aged 14 and over. The Service Provider does not collect the personal information of children under 14, and if such information is found to have been collected, it will be deleted without delay at the request of a legal representative or upon the Service Provider's confirmation.",
    },
    {
      heading: "11. Security Measures",
      body: "To process personal information safely, the Service Provider implements managerial and technical safeguards required by applicable law, including access rights management, encryption of transmission channels, retention of access logs, and security vulnerability inspections.",
    },
    {
      heading: "12. Privacy Officer and Contact",
      body: `The Service Provider designates and operates a privacy officer who oversees personal information processing. Inquiries, complaints, and requests to exercise rights regarding personal information may be submitted to the customer support email (${CONTACT_EMAIL}), and the Service Provider will respond and handle them promptly and in good faith. For other consultations regarding personal information infringement, you may contact the Personal Information Dispute Mediation Committee or the Korea Internet & Security Agency (KISA) Privacy Infringement Report Center.`,
    },
    {
      heading: "13. Changes to This Policy",
      body: "This Privacy Policy may be amended in accordance with changes in laws, policies, or the Service. When the Policy is amended, the changes and effective date will be announced in advance within the Service.",
    },
  ],
};

// ─────────────────────────────── 日本語 ───────────────────────────────

const TERMS_JA: TermsDoc = {
  key: "terms",
  label: "利用規約",
  effectiveDate: "2026年9月7日",
  sections: [
    {
      heading: "第1条（目的）",
      body: "本規約は、afterglow（以下「サービス提供者」）がモバイルアプリケーションを通じて提供する旅行コース推薦および関連サービス（以下「本サービス」）の利用に関して、サービス提供者と会員との間の権利・義務および責任事項、利用条件と手続きを定めることを目的とします。",
    },
    {
      heading: "第2条（用語の定義）",
      body: "「会員」とは、本規約に同意し本サービスを利用する者をいいます。「コース」とは、サービス提供者が会員の旅行期間や施術スケジュール、移動動線などをもとに提案する日程別の訪問予定をいいます。「コンテンツ」とは、本サービス内に掲載された場所情報・画像・テキスト等の一切の情報をいいます。その他の用語は関係法令および一般の慣例に従います。",
    },
    {
      heading: "第3条（規約の掲示と改定）",
      body: "サービス提供者は、会員が容易に確認できるよう本規約を本サービス画面に掲示します。サービス提供者は関係法令に反しない範囲で本規約を改定でき、改定の際は適用日と改定理由を明示し、適用日の少なくとも7日前（会員に不利または重大な変更は30日前）から本サービス内で告知します。会員が改定規約に同意しない場合、利用契約を解約できます。",
    },
    {
      heading: "第4条（サービスの提供および変更）",
      body: "サービス提供者は、コース推薦、地図および経路案内、日程管理、コース保存などの機能を提供します。サービス提供者は運営上・技術上の必要に応じて本サービスの全部または一部を変更・中断でき、その場合は変更内容と理由を事前に告知します。ただし緊急のシステム点検、天災地変等やむを得ない場合は事後に告知することがあります。",
    },
    {
      heading: "第5条（会員登録およびアカウント）",
      body: "会員はソーシャルログイン等、サービス提供者が定める方法で登録できます。会員はアカウント情報を正確に維持・管理する責任があり、自身のアカウントを第三者に利用させてはなりません。アカウントの管理不十分や不正使用により生じた問題の責任は会員本人にあります。",
    },
    {
      heading: "第6条（アカウントの解約および削除）",
      body: "会員はいつでもアプリ内「マイページ＞退会」またはカスタマーサポートを通じて利用契約の解約（退会）を請求できます。退会時、会員のアカウントおよび保存したコース等の個人情報はプライバシーポリシーに従って処理され、関係法令上の保存義務がある情報を除き遅滞なく破棄されます。",
    },
    {
      heading: "第7条（会員の義務および禁止行為）",
      body: "会員は関係法令および本規約を遵守しなければならず、次の行為をしてはなりません。他人の情報の盗用や権利侵害、本サービスの正常な運営を妨害する行為、自動化された手段でコンテンツを無断で収集・複製する行為、法令・公序良俗に反しまたは他人に不快感を与える情報の掲載、サービス提供者の事前同意のない営利目的の利用。",
    },
    {
      heading: "第8条（位置基盤サービス）",
      body: "サービス提供者は、地図表示、経路案内、周辺の場所推薦などのために会員の端末位置情報を利用することがあります。位置情報の収集・利用は会員の事前同意と端末の位置権限の許可を前提とし、会員はいつでも端末設定または本サービス内で位置情報利用への同意を撤回できます。位置基盤サービスの具体的内容は「位置情報の保護および利用等に関する法律」およびプライバシーポリシーに従います。",
    },
    {
      heading: "第9条（コンテンツおよび知的財産権）",
      body: "本サービスおよび本サービスに含まれるコース・場所情報・デザイン・商標等のコンテンツに関する著作権および知的財産権は、サービス提供者または正当な権利者に帰属します。会員はサービス提供者の事前同意なくこれらを複製・配布・送信・出版し、または商業的に利用することはできません。",
    },
    {
      heading: "第10条（有料サービスおよび決済）",
      body: "現在、本サービスの主要機能は無料で提供されます。サービス提供者が将来有料サービスを導入する場合、Apple App Store・Google Play等のアプリマーケットの決済ポリシーおよび関係法令に従い、利用料金、申込撤回・返金の条件を事前に告知します。アプリ内課金の返金は各アプリマーケットのポリシーに従います。",
    },
    {
      heading: "第11条（免責および医療に関する告知）",
      body: "サービス提供者が提供するコース・場所・日程情報は参考用であり、実際の移動・訪問・予約およびその結果に対する最終的な判断と責任は会員本人にあります。特に施術・回復など健康・医療に関する情報は一般的な参考資料にすぎず、医学的助言や診断・治療に代わるものではなく、関連する決定は必ず担当の医療者にご相談ください。サービス提供者は、会員が第三者の場所・業者を訪問して生じた損害について、サービス提供者の故意または重過失がない限り責任を負いません。",
    },
    {
      heading: "第12条（責任の制限）",
      body: "サービス提供者は、天災地変、通信障害、会員の帰責事由など、サービス提供者の合理的な支配を超える事由による本サービス提供の障害について責任を負いません。無料で提供されるサービスに関しては、関係法令に特別の定めがない限り、サービス提供者は責任を負いません。",
    },
    {
      heading: "第13条（準拠法および紛争解決）",
      body: "本規約は大韓民国の法令に従って解釈されます。本サービスの利用に関してサービス提供者と会員との間に紛争が生じた場合、双方は信義誠実の原則に従い円満な解決に努めます。協議が調わない場合は、関係法令が定める手続きおよび管轄裁判所に従います。",
    },
  ],
};

const PRIVACY_JA: TermsDoc = {
  key: "privacy",
  label: "プライバシーポリシー",
  effectiveDate: "2026年9月7日",
  sections: [
    {
      heading: "1. 総則",
      body: "afterglow（以下「サービス提供者」）は「個人情報保護法」等の関係法令を遵守し、利用者の個人情報を安全に保護するため最善を尽くします。本方針は、サービス提供者が提供するモバイルサービスにおいて利用者の個人情報がどのように収集・利用・保管・破棄されるかを説明します。",
    },
    {
      heading: "2. 収集する個人情報の項目",
      body: "サービス提供者は次の個人情報を収集します。（必須）ソーシャルログインのアカウント識別子、プロフィール情報（氏名・メール・プロフィール画像）、本サービス利用の過程で生成される旅行日程・保存コース・施術スケジュール情報。（任意）端末の位置情報。（自動収集）端末情報（OS・端末識別子・アプリバージョン）、サービス利用記録およびエラーログ。",
    },
    {
      heading: "3. 個人情報の収集および利用目的",
      body: "収集した個人情報は、会員の識別およびログイン維持、旅行コースの推薦と地図・経路案内、保存コースの管理、お問い合わせ対応および告知の伝達、サービスの安定性確保とエラー改善、不正利用の防止のために利用します。サービス提供者は明示した目的以外の用途で個人情報を利用しません。",
    },
    {
      heading: "4. 位置情報の処理",
      body: "サービス提供者は、利用者が同意し端末の位置権限を許可した場合に限り、地図表示・経路案内・周辺の場所推薦のために位置情報を利用します。位置情報は当該機能の提供のために一時的に利用され、目的が達成されると遅滞なく破棄します（関係法令により保管が必要な場合を除く）。利用者は端末設定で位置権限を変更し、または同意を撤回でき、その場合は位置基盤機能の利用が制限されることがあります。",
    },
    {
      heading: "5. 個人情報の第三者提供",
      body: "サービス提供者は利用者の同意なく個人情報を第三者に提供しません。ただし、利用者が事前に同意した場合、または法令に根拠がある場合や捜査機関が適法な手続きに従い要請する場合に限り提供することがあります。",
    },
    {
      heading: "6. 個人情報処理の委託",
      body: "サービス提供者は円滑なサービス提供のため、個人情報処理業務の一部を外部に委託することがあります。委託先には、アプリの実行およびデータ保存のためのクラウドインフラ事業者、ソーシャルログイン認証事業者、地図・タイルデータ提供事業者、サービス品質改善のための分析ツール事業者が含まれることがあります。サービス提供者は委託にあたり、関係法令に従って個人情報が安全に管理されるよう必要な事項を定め監督します。",
    },
    {
      heading: "7. 個人情報の保有および利用期間",
      body: "サービス提供者は原則として、個人情報の収集・利用目的が達成されるか会員が退会した場合、当該情報を遅滞なく破棄します。ただし「電子商取引等における消費者保護に関する法律」「通信秘密保護法」等の関係法令が一定期間の保存を求める場合は、当該期間中は安全に分離保管したうえで破棄します。",
    },
    {
      heading: "8. 個人情報の破棄手続きおよび方法",
      body: "保有期間が経過し、または処理目的が達成された個人情報は遅滞なく破棄します。電子ファイル形態の情報は復元・再生が不可能な方法で永久に削除し、紙に出力された情報は裁断または焼却して破棄します。",
    },
    {
      heading: "9. 利用者の権利と行使方法",
      body: "利用者はいつでも自身の個人情報の閲覧・訂正、処理の停止および削除を請求でき、収集・利用への同意を撤回できます。退会およびアカウント削除はアプリ内「マイページ＞退会」から直接行うことができ、その他の権利行使は下記カスタマーサポートを通じて請求できます。サービス提供者は請求を受けた場合、遅滞なく必要な措置を講じます。",
    },
    {
      heading: "10. 14歳未満の児童の個人情報",
      body: "本サービスは原則として14歳以上を対象とします。サービス提供者は14歳未満の児童の個人情報を収集せず、児童の個人情報が収集された事実が確認された場合、法定代理人の請求またはサービス提供者の確認により遅滞なく削除します。",
    },
    {
      heading: "11. 個人情報の安全性確保措置",
      body: "サービス提供者は、個人情報の安全な処理のため、アクセス権限の管理、伝送区間の暗号化、アクセス記録の保管、セキュリティ脆弱性の点検など、関係法令が求める管理的・技術的な保護措置を実施します。",
    },
    {
      heading: "12. 個人情報保護責任者およびお問い合わせ先",
      body: `サービス提供者は、個人情報処理に関する業務を総括する個人情報保護責任者を指定して運営しています。個人情報に関するお問い合わせ、苦情処理および権利行使は、カスタマーサポートのメール（${CONTACT_EMAIL}）で受け付けており、サービス提供者は迅速かつ誠実に回答・処理します。その他の個人情報侵害に関する相談は、個人情報紛争調停委員会、韓国インターネット振興院（KISA）個人情報侵害申告センター等にお問い合わせいただけます。`,
    },
    {
      heading: "13. 方針の変更",
      body: "本プライバシーポリシーは、法令・方針または本サービス内容の変更に応じて改定されることがあります。方針を改定する場合、変更内容と適用日をサービス画面を通じて事前に告知します。",
    },
  ],
};

// ─────────────────────────────── 中文 ───────────────────────────────

const TERMS_ZH: TermsDoc = {
  key: "terms",
  label: "服务条款",
  effectiveDate: "2026年9月7日",
  sections: [
    {
      heading: "第1条（目的）",
      body: "本条款旨在规定 afterglow（以下称“服务提供者”）通过移动应用程序提供的旅行路线推荐及相关服务（以下称“本服务”）的使用过程中，服务提供者与会员之间的权利、义务、责任事项以及使用条件与流程。",
    },
    {
      heading: "第2条（术语定义）",
      body: "“会员”指同意本条款并使用本服务的人。“路线”指服务提供者根据会员的旅行期间、诊疗日程和移动动线等提出的按日访问行程。“内容”指本服务内发布的地点信息、图片、文本等一切信息。其他术语依照相关法律及一般惯例。",
    },
    {
      heading: "第3条（条款的公示与修订）",
      body: "服务提供者将本条款公示于服务界面，便于会员查阅。服务提供者可在不违反相关法律的范围内修订本条款，修订时应载明适用日期和修订理由，并至少提前7日（对会员不利或重大变更时提前30日）在本服务内公告。会员如不同意修订后的条款，可解除使用合同。",
    },
    {
      heading: "第4条（服务的提供与变更）",
      body: "服务提供者提供路线推荐、地图及路径引导、行程管理、路线保存等功能。服务提供者可因运营或技术需要变更或中止全部或部分服务，并事先公告变更内容及理由。但在紧急系统检修、不可抗力等不得已情形下，可事后公告。",
    },
    {
      heading: "第5条（会员注册与账户）",
      body: "会员可通过社交登录等服务提供者指定的方式注册。会员有责任准确维护和管理账户信息，且不得允许第三方使用其账户。因账户管理疏忽或被非法使用而产生的问题，由会员本人承担责任。",
    },
    {
      heading: "第6条（账户的解除与删除）",
      body: "会员可随时通过应用内“我的页面＞注销会员”或客户服务请求解除使用合同（注销）。注销时，会员的账户及已保存的路线等个人信息将按照隐私政策处理，除依相关法律须保存的信息外，将不迟延地予以销毁。",
    },
    {
      heading: "第7条（会员的义务及禁止行为）",
      body: "会员应遵守相关法律及本条款，且不得实施下列行为：盗用他人信息或侵害他人权利；妨碍本服务正常运营；以自动化手段擅自收集或复制内容；发布违反法律、公序良俗或使他人不适的信息；未经服务提供者事先同意以营利为目的使用本服务。",
    },
    {
      heading: "第8条（基于位置的服务）",
      body: "服务提供者可为地图显示、路径引导、周边地点推荐等而使用会员的设备位置信息。位置信息的收集与使用以会员的事先同意及设备位置权限的授予为前提，会员可随时通过设备设置或本服务内撤回对位置信息使用的同意。基于位置的服务的具体内容依照《位置信息保护及利用等相关法律》及隐私政策。",
    },
    {
      heading: "第9条（内容及知识产权）",
      body: "本服务及其所含路线、地点信息、设计、商标等内容的著作权及知识产权归服务提供者或正当权利人所有。未经服务提供者事先同意，会员不得对上述内容进行复制、分发、传输、出版或商业性利用。",
    },
    {
      heading: "第10条（付费服务及支付）",
      body: "目前本服务的主要功能免费提供。服务提供者今后如引入付费服务，将依据 Apple App Store、Google Play 等应用市场的支付政策及相关法律，事先公告使用费用、撤销申请及退款条件。应用内购买的退款依照各应用市场的政策办理。",
    },
    {
      heading: "第11条（免责及医疗相关告知）",
      body: "服务提供者提供的路线、地点、行程信息仅供参考，实际的出行、访问、预约及其结果的最终判断与责任由会员本人承担。特别是与诊疗、恢复等健康、医疗相关的信息仅为一般参考资料，不能替代医学建议或诊断、治疗，相关决定务必咨询您的主治医疗人员。除服务提供者存在故意或重大过失外，服务提供者对会员访问第三方地点、商家而产生的损害不承担责任。",
    },
    {
      heading: "第12条（责任限制）",
      body: "对于因不可抗力、通信故障、会员自身原因等超出服务提供者合理控制范围的事由导致的服务提供障碍，服务提供者不承担责任。就免费提供的服务，除相关法律另有特别规定外，服务提供者不承担责任。",
    },
    {
      heading: "第13条（准据法及争议解决）",
      body: "本条款依大韩民国法律解释。就本服务的使用，服务提供者与会员之间发生争议时，双方应本着诚实信用原则努力友好解决。协商不成的，依照相关法律规定的程序及管辖法院处理。",
    },
  ],
};

const PRIVACY_ZH: TermsDoc = {
  key: "privacy",
  label: "隐私政策",
  effectiveDate: "2026年9月7日",
  sections: [
    {
      heading: "1. 总则",
      body: "afterglow（以下称“服务提供者”）遵守《个人信息保护法》等相关法律，竭力安全地保护用户的个人信息。本政策说明在服务提供者提供的移动服务中，用户的个人信息如何被收集、使用、保管和销毁。",
    },
    {
      heading: "2. 收集的个人信息项目",
      body: "服务提供者收集以下个人信息。（必需）社交登录账户标识、个人资料信息（姓名、电子邮件、头像）、使用本服务过程中生成的旅行行程、已保存路线、诊疗日程信息。（可选）设备位置信息。（自动收集）设备信息（操作系统、设备标识、应用版本）、服务使用记录及错误日志。",
    },
    {
      heading: "3. 个人信息的收集及使用目的",
      body: "所收集的个人信息用于识别会员并维持登录、推荐旅行路线并提供地图与路径引导、管理已保存路线、应答咨询及发送通知、确保服务稳定并改进错误、防止滥用。服务提供者不会将个人信息用于所述目的以外的用途。",
    },
    {
      heading: "4. 位置信息的处理",
      body: "服务提供者仅在用户同意并授予设备位置权限的情况下，为地图显示、路径引导、周边地点推荐而使用位置信息。位置信息仅为提供相应功能而临时使用，目的达成后即不迟延地予以销毁（依相关法律需保管的情形除外）。用户可在设备设置中变更位置权限或撤回同意，此时基于位置的功能可能受到限制。",
    },
    {
      heading: "5. 个人信息向第三方提供",
      body: "未经用户同意，服务提供者不会向第三方提供个人信息。但在用户事先同意、法律有依据，或侦查机关依合法程序请求的情形下，方可提供。",
    },
    {
      heading: "6. 个人信息处理的委托",
      body: "服务提供者为顺利提供服务，可将部分个人信息处理业务委托给外部。受托方可能包括用于运行应用及存储数据的云基础设施提供商、社交登录认证提供商、地图与瓦片数据提供商，以及用于改进服务质量的分析工具提供商。委托时，服务提供者依相关法律规定必要事项并进行监督，以确保个人信息得到安全管理。",
    },
    {
      heading: "7. 个人信息的保有及使用期限",
      body: "原则上，个人信息的收集、使用目的达成或会员注销后，服务提供者将不迟延地予以销毁。但《电子商务等消费者保护相关法律》《通信秘密保护法》等相关法律要求保存一定期限的，将在该期限内安全分离保管后予以销毁。",
    },
    {
      heading: "8. 个人信息的销毁程序及方法",
      body: "对于保有期限届满或处理目的已达成的个人信息，将不迟延地予以销毁。电子文件形式的信息以无法恢复、再生的方式永久删除，纸面打印的信息以粉碎或焚烧方式销毁。",
    },
    {
      heading: "9. 用户的权利及行使方法",
      body: "用户可随时查阅、更正其个人信息，请求停止处理及删除，并可撤回对收集、使用的同意。注销会员及删除账户可在应用内“我的页面＞注销会员”直接进行，其他权利可通过下方客户服务请求行使。服务提供者在收到请求后将不迟延地采取必要措施。",
    },
    {
      heading: "10. 未满14周岁儿童的个人信息",
      body: "本服务原则上面向14周岁以上用户。服务提供者不收集未满14周岁儿童的个人信息；如经确认已收集儿童个人信息，将依法定代理人的请求或服务提供者的确认不迟延地予以删除。",
    },
    {
      heading: "11. 个人信息的安全保障措施",
      body: "为安全处理个人信息，服务提供者实施相关法律所要求的管理性、技术性保护措施，包括访问权限管理、传输区间加密、访问记录保管、安全漏洞检查等。",
    },
    {
      heading: "12. 个人信息保护负责人及联系方式",
      body: `服务提供者指定并运营统筹个人信息处理业务的个人信息保护负责人。有关个人信息的咨询、投诉处理及权利行使，可通过客户服务邮箱（${CONTACT_EMAIL}）提交，服务提供者将迅速、诚实地答复与处理。其他有关个人信息侵害的咨询，可向个人信息纠纷调解委员会、韩国互联网振兴院（KISA）个人信息侵害举报中心等咨询。`,
    },
    {
      heading: "13. 政策的变更",
      body: "本隐私政策可能随法律、政策或服务内容的变更而修订。修订本政策时，将通过服务界面事先公告变更内容及适用日期。",
    },
  ],
};

/** 언어별 문서 목록. 세그먼트 순서(이용약관 → 개인정보처리방침)를 유지한다. */
const TERMS_DOCS_BY_LOCALE: Record<Locale, TermsDoc[]> = {
  ko: [TERMS_KO, PRIVACY_KO],
  en: [TERMS_EN, PRIVACY_EN],
  ja: [TERMS_JA, PRIVACY_JA],
  zh: [TERMS_ZH, PRIVACY_ZH],
};

/** 현재 언어에 맞는 문서 목록을 반환한다. 미지원 로케일은 한국어로 폴백. */
export function getTermsDocs(locale: Locale): TermsDoc[] {
  return TERMS_DOCS_BY_LOCALE[locale] ?? TERMS_DOCS_BY_LOCALE.ko;
}
