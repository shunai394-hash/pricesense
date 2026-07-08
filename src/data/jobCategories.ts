import type { JobCategory, JobCategoryInput, JobGroup, JobGroupId } from "./types";

export const JOB_GROUPS: JobGroup[] = [
  { id: "it", label: "IT・エンジニア" },
  { id: "design", label: "デザイン" },
  { id: "marketing", label: "マーケティング" },
  { id: "writing", label: "ライティング" },
  { id: "video", label: "動画・映像" },
  { id: "ai", label: "AI" },
  { id: "consulting", label: "コンサル" },
  { id: "professional", label: "士業・専門職" },
  { id: "admin", label: "事務・バックオフィス" },
  { id: "sales", label: "営業" },
];

const GROUP_LABELS = Object.fromEntries(
  JOB_GROUPS.map((g) => [g.id, g.label])
) as Record<JobGroupId, string>;

function defineJob(group: JobGroupId, job: JobCategoryInput): JobCategory {
  const keywords = job.keywords ?? [job.label, ...job.tags, GROUP_LABELS[group]];
  return {
    id: job.id,
    label: job.label,
    group,
    groupLabel: GROUP_LABELS[group],
    minRate: job.min,
    avgRate: job.avg,
    top25Rate: job.top25,
    top10Rate: job.top10,
    marketRate: job.avg,
    maxRate: job.top10,
    description: job.description,
    tags: job.tags,
    skillExamples: job.skillExamples,
    marketTrend: job.marketTrend,
    keywords,
  };
}

const IT_JOBS: JobCategoryInput[] = [
  { id: "web_engineer", label: "Webエンジニア", min: 65000, avg: 85000, top25: 100000, top10: 120000, description: "フロントエンド / バックエンド開発", tags: ["React", "TypeScript", "API"], skillExamples: "React/Next.js、Node.js、クラウド連携", marketTrend: "需要が高く、経験年数で単価差が大きい" },
  { id: "frontend_engineer", label: "フロントエンドエンジニア", min: 60000, avg: 80000, top25: 95000, top10: 115000, description: "UI実装・SPA開発", tags: ["React", "Vue", "CSS"], skillExamples: "コンポーネント設計、パフォーマンス最適化", marketTrend: "React/Next.js需要が継続的に高い" },
  { id: "backend_engineer", label: "バックエンドエンジニア", min: 70000, avg: 90000, top25: 110000, top10: 130000, description: "サーバーサイド・API開発", tags: ["Go", "Python", "DB設計"], skillExamples: "API設計、マイクロサービス、DB最適化", marketTrend: "クラウドネイティブ設計力が単価を左右" },
  { id: "fullstack_engineer", label: "フルスタックエンジニア", min: 75000, avg: 95000, top25: 115000, top10: 140000, description: "フロント〜バック一貫開発", tags: ["Next.js", "DB", "インフラ"], skillExamples: "要件定義からリリースまで一貫対応", marketTrend: "小規模チームでの即戦力として高評価" },
  { id: "mobile_engineer", label: "モバイルエンジニア", min: 70000, avg: 90000, top25: 110000, top10: 130000, description: "iOS / Android アプリ開発", tags: ["Swift", "Kotlin", "Flutter"], skillExamples: "ネイティブ開発、クロスプラットフォーム", marketTrend: "専門性が高く上位層は10万円超が一般的" },
  { id: "ios_engineer", label: "iOSエンジニア", min: 75000, avg: 95000, top25: 115000, top10: 135000, description: "Swift / SwiftUI開発", tags: ["Swift", "iOS", "App Store"], skillExamples: "UIKit/SwiftUI、App Store審査対応", marketTrend: "SwiftUI移行案件が増加中" },
  { id: "android_engineer", label: "Androidエンジニア", min: 70000, avg: 90000, top25: 108000, top10: 128000, description: "Kotlin / Jetpack開発", tags: ["Kotlin", "Android", "Compose"], skillExamples: "Jetpack Compose、Play Store対応", marketTrend: "Kotlin完全移行で需要安定" },
  { id: "flutter_engineer", label: "Flutterエンジニア", min: 70000, avg: 88000, top25: 105000, top10: 125000, description: "クロスプラットフォーム開発", tags: ["Flutter", "Dart", "Firebase"], skillExamples: "iOS/Android同時開発、状態管理", marketTrend: "スタートアップでの採用が増加" },
  { id: "infra_engineer", label: "インフラ / SRE", min: 75000, avg: 95000, top25: 115000, top10: 140000, description: "クラウド基盤・運用設計", tags: ["AWS", "Terraform", "監視"], skillExamples: "AWS/GCP、Kubernetes、CI/CD", marketTrend: "クラウド移行案件が増加し単価上昇" },
  { id: "cloud_architect", label: "クラウドアーキテクト", min: 90000, avg: 115000, top25: 140000, top10: 170000, description: "クラウド設計・移行", tags: ["AWS", "Azure", "設計"], skillExamples: "マルチアカウント設計、コスト最適化", marketTrend: "大規模移行案件で高単価" },
  { id: "devops_engineer", label: "DevOpsエンジニア", min: 80000, avg: 100000, top25: 120000, top10: 145000, description: "CI/CD・自動化", tags: ["Docker", "K8s", "GitHub Actions"], skillExamples: "パイプライン構築、IaC、監視設計", marketTrend: "Platform Engineering需要が拡大" },
  { id: "security_engineer", label: "セキュリティエンジニア", min: 85000, avg: 110000, top25: 130000, top10: 160000, description: "セキュリティ設計・監査", tags: ["脆弱性診断", "SIEM", "ISMS"], skillExamples: "ペネトレーション、セキュリティレビュー", marketTrend: "サイバー攻撃増加で需要急拡大" },
  { id: "qa_engineer", label: "QA / テストエンジニア", min: 55000, avg: 70000, top25: 85000, top10: 100000, description: "品質保証・自動テスト", tags: ["E2E", "Playwright", "テスト設計"], skillExamples: "テスト自動化、品質プロセス改善", marketTrend: "自動化スキルで単価差が拡大" },
  { id: "data_engineer", label: "データエンジニア", min: 80000, avg: 100000, top25: 120000, top10: 145000, description: "データ基盤・ETL構築", tags: ["dbt", "BigQuery", "Spark"], skillExamples: "データパイプライン、DWH設計", marketTrend: "データドリブン経営で需要拡大" },
  { id: "data_analyst", label: "データアナリスト", min: 55000, avg: 75000, top25: 90000, top10: 105000, description: "データ分析 / BI構築", tags: ["SQL", "BigQuery", "Tableau"], skillExamples: "SQL分析、Looker/Tableau、KPI設計", marketTrend: "データドリブン経営の浸透で需要拡大" },
  { id: "data_scientist", label: "データサイエンティスト", min: 85000, avg: 110000, top25: 130000, top10: 155000, description: "統計分析・モデル構築", tags: ["Python", "統計", "機械学習"], skillExamples: "予測モデル、A/Bテスト設計", marketTrend: "AI/ML需要と連動して高単価" },
  { id: "ml_engineer", label: "MLエンジニア", min: 90000, avg: 115000, top25: 140000, top10: 170000, description: "機械学習システム開発", tags: ["PyTorch", "MLOps", "推論"], skillExamples: "モデルデプロイ、特徴量エンジニアリング", marketTrend: "MLOpsスキルで大幅な単価上昇" },
  { id: "embedded_engineer", label: "組み込みエンジニア", min: 70000, avg: 90000, top25: 110000, top10: 130000, description: "IoT・組み込み開発", tags: ["C/C++", "RTOS", "IoT"], skillExamples: "ファームウェア、デバイス連携", marketTrend: "IoT・エッジコンピューティングで需要増" },
  { id: "game_engineer", label: "ゲームエンジニア", min: 65000, avg: 85000, top25: 105000, top10: 125000, description: "ゲームクライアント開発", tags: ["Unity", "C#", "Unreal"], skillExamples: "ゲームロジック、マルチプレイ実装", marketTrend: "モバイルゲーム需要は安定" },
  { id: "unity_engineer", label: "Unityエンジニア", min: 65000, avg: 82000, top25: 100000, top10: 120000, description: "Unity / C#開発", tags: ["Unity", "C#", "2D/3D"], skillExamples: "ゲーム/UI開発、AR/VR", marketTrend: "メタバース・AR案件で需要増" },
  { id: "blockchain_engineer", label: "ブロックチェーンエンジニア", min: 90000, avg: 120000, top25: 145000, top10: 180000, description: "Web3・スマートコントラクト", tags: ["Solidity", "Web3", "DeFi"], skillExamples: "スマートコントラクト監査、DApp開発", marketTrend: "ニッチだが高単価の専門領域" },
  { id: "sap_engineer", label: "SAPエンジニア", min: 90000, avg: 120000, top25: 145000, top10: 170000, description: "SAP導入・カスタマイズ", tags: ["SAP", "ABAP", "S/4HANA"], skillExamples: "SAP導入、カスタマイズ、移行", marketTrend: "大企業案件で高単価が安定" },
  { id: "salesforce_engineer", label: "Salesforceエンジニア", min: 80000, avg: 105000, top25: 125000, top10: 150000, description: "Salesforce開発・運用", tags: ["Apex", "Lightning", "CRM"], skillExamples: "カスタム開発、連携設計、運用", marketTrend: "CRM刷新案件が継続的に発生" },
  { id: "rpa_engineer", label: "RPAエンジニア", min: 65000, avg: 85000, top25: 100000, top10: 120000, description: "業務自動化・RPA開発", tags: ["UiPath", "Power Automate", "自動化"], skillExamples: "UiPath/Power Automate、業務分析", marketTrend: "DX推進でRPA需要が拡大" },
  { id: "scrum_master", label: "スクラムマスター", min: 70000, avg: 90000, top25: 110000, top10: 130000, description: "アジャイルファシリテーション", tags: ["Scrum", "アジャイル", "PM"], skillExamples: "スプリント運営、チーム改善", marketTrend: "アジャイル移行案件で需要増" },
  { id: "pm", label: "PM / PdM", min: 70000, avg: 90000, top25: 110000, top10: 130000, description: "プロジェクト / プロダクトマネジメント", tags: ["要件定義", "ロードマップ", "KPI"], skillExamples: "ロードマップ策定、開発チーム統括", marketTrend: "成果責任が明確な案件ほど高単価" },
  { id: "it_consultant", label: "ITコンサルタント", min: 90000, avg: 120000, top25: 145000, top10: 180000, description: "IT戦略・システム企画", tags: ["要件定義", "RFP", "ベンダー管理"], skillExamples: "システム選定、PMO、ベンダーコントロール", marketTrend: "大規模刷新案件で高単価" },
];

const DESIGN_JOBS: JobCategoryInput[] = [
  { id: "ui_designer", label: "UIデザイナー", min: 50000, avg: 70000, top25: 85000, top10: 95000, description: "Web / アプリ UI デザイン", tags: ["Figma", "UI", "デザインシステム"], skillExamples: "画面設計、コンポーネント設計", marketTrend: "プロダクト開発とセットの案件が多い" },
  { id: "ux_designer", label: "UXデザイナー", min: 60000, avg: 80000, top25: 95000, top10: 110000, description: "UXリサーチ / 体験設計", tags: ["リサーチ", "情報設計", "UI"], skillExamples: "ユーザーインタビュー、ジャーニーマップ", marketTrend: "BtoB SaaSで需要が伸びている" },
  { id: "uiux_designer", label: "UI/UXデザイナー", min: 65000, avg: 85000, top25: 100000, top10: 115000, description: "UI/UX一貫設計", tags: ["Figma", "UX", "プロトタイプ"], skillExamples: "リサーチからUI実装まで", marketTrend: "スタートアップで特に需要が高い" },
  { id: "graphic_designer", label: "グラフィックデザイナー", min: 45000, avg: 60000, top25: 75000, top10: 85000, description: "印刷物・広告デザイン", tags: ["Illustrator", "Photoshop", "DTP"], skillExamples: "チラシ、パンフレット、広告バナー", marketTrend: "デジタル需要が中心にシフト" },
  { id: "brand_designer", label: "ブランドデザイナー", min: 60000, avg: 80000, top25: 100000, top10: 120000, description: "ブランドアイデンティティ設計", tags: ["ロゴ", "VI", "ガイドライン"], skillExamples: "CI/VI設計、ブランドガイドライン", marketTrend: "リブランディング案件で高単価" },
  { id: "web_designer", label: "Webデザイナー", min: 45000, avg: 65000, top25: 80000, top10: 90000, description: "Webサイトデザイン", tags: ["Figma", "LP", "WordPress"], skillExamples: "LP、コーポレートサイト、EC", marketTrend: "ノーコードツール普及で差別化が重要" },
  { id: "illustrator", label: "イラストレーター", min: 40000, avg: 55000, top25: 70000, top10: 85000, description: "イラスト・キャラクターデザイン", tags: ["イラスト", "キャラ", "Clip Studio"], skillExamples: "書籍、広告、SNS用イラスト", marketTrend: "SNS・ゲーム需要で安定" },
  { id: "3d_designer", label: "3Dデザイナー", min: 60000, avg: 80000, top25: 100000, top10: 120000, description: "3DCG・モデリング", tags: ["Blender", "Maya", "3D"], skillExamples: "プロダクトビジュアライズ、3Dモデル", marketTrend: "メタバース・EC需要で拡大" },
  { id: "product_designer", label: "プロダクトデザイナー", min: 70000, avg: 95000, top25: 115000, top10: 135000, description: "プロダクト全体の体験設計", tags: ["Figma", "Design System", "UX"], skillExamples: "デザインシステム、プロダクト戦略", marketTrend: "SaaS企業で高単価ポジション" },
  { id: "design_system", label: "デザインシステム設計", min: 75000, avg: 100000, top25: 120000, top10: 140000, description: "デザインシステム構築", tags: ["Storybook", "Figma", "トークン"], skillExamples: "コンポーネントライブラリ、ガイドライン", marketTrend: "大規模プロダクトで需要増" },
  { id: "thumbnail_designer", label: "サムネイルデザイナー", min: 35000, avg: 50000, top25: 65000, top10: 75000, description: "YouTube・SNSサムネイル", tags: ["Photoshop", "Canva", "SNS"], skillExamples: "YouTube、TikTok、Instagram", marketTrend: "クリエイター経済で需要拡大" },
  { id: "package_designer", label: "パッケージデザイナー", min: 50000, avg: 70000, top25: 85000, top10: 100000, description: "商品パッケージデザイン", tags: ["パッケージ", "DTP", "ブランド"], skillExamples: "食品、化粧品、EC商品パッケージ", marketTrend: "D2Cブランドで需要安定" },
];

const MARKETING_JOBS: JobCategoryInput[] = [
  { id: "digital_marketer", label: "デジタルマーケター", min: 45000, avg: 65000, top25: 80000, top10: 90000, description: "デジタルマーケ全般", tags: ["広告", "SEO", "SNS"], skillExamples: "広告運用、コンテンツ戦略、LTV改善", marketTrend: "運用実績が見えるほど交渉しやすい" },
  { id: "seo_consultant", label: "SEOコンサルタント", min: 50000, avg: 70000, top25: 85000, top10: 100000, description: "SEO戦略・改善", tags: ["SEO", "コンテンツ", "分析"], skillExamples: "テクニカルSEO、コンテンツ設計", marketTrend: "AI検索時代のSEO再設計需要" },
  { id: "sns_marketer", label: "SNSマーケター", min: 40000, avg: 60000, top25: 75000, top10: 85000, description: "SNS運用・広告", tags: ["Instagram", "X", "TikTok"], skillExamples: "SNS運用、インフルエンサー施策", marketTrend: "TikTok/Instagram Reels需要増" },
  { id: "ad_specialist", label: "広告運用スペシャリスト", min: 50000, avg: 70000, top25: 90000, top10: 105000, description: "リスティング・SNS広告", tags: ["Google Ads", "Meta", "ROAS"], skillExamples: "Google/Meta広告、ROAS改善", marketTrend: "CPA改善実績で高単価交渉可" },
  { id: "content_marketer", label: "コンテンツマーケター", min: 45000, avg: 65000, top25: 80000, top10: 90000, description: "コンテンツ戦略・制作", tags: ["オウンドメディア", "SEO", "編集"], skillExamples: "メディア運営、リード獲得設計", marketTrend: "BtoBリード獲得で需要安定" },
  { id: "growth_hacker", label: "グロースハッカー", min: 70000, avg: 95000, top25: 115000, top10: 135000, description: "グロース施策・実験", tags: ["A/Bテスト", "分析", "CVR"], skillExamples: "ファネル改善、実験設計、KPI管理", marketTrend: "スタートアップで高単価" },
  { id: "ma_specialist", label: "MA / CRMスペシャリスト", min: 55000, avg: 75000, top25: 90000, top10: 105000, description: "マーケティングオートメーション", tags: ["HubSpot", "Marketo", "CRM"], skillExamples: "HubSpot/Marketo、シナリオ設計", marketTrend: "MA導入・運用案件が増加" },
  { id: "brand_manager", label: "ブランドマネージャー", min: 60000, avg: 85000, top25: 105000, top10: 120000, description: "ブランド戦略・管理", tags: ["ブランド", "戦略", "PR"], skillExamples: "ブランド戦略、キャンペーン企画", marketTrend: "D2Cブランドで需要増" },
  { id: "market_researcher", label: "マーケリサーチャー", min: 55000, avg: 75000, top25: 90000, top10: 105000, description: "市場調査・分析", tags: ["調査", "分析", "レポート"], skillExamples: "定量・定性調査、競合分析", marketTrend: "新規事業立ち上げで需要" },
  { id: "pr_specialist", label: "PR / 広報", min: 50000, avg: 70000, top25: 85000, top10: 100000, description: "広報・メディアリレーション", tags: ["PR", "プレスリリース", "メディア"], skillExamples: "プレスリリース、メディア対応", marketTrend: "スタートアップPR需要が拡大" },
  { id: "influencer_marketer", label: "インフルエンサーマーケター", min: 45000, avg: 65000, top25: 80000, top10: 95000, description: "インフルエンサー施策", tags: ["インフルエンサー", "SNS", "UGC"], skillExamples: "キャスティング、施策設計、効果測定", marketTrend: "UGCマーケで新規需要" },
  { id: "affiliate_marketer", label: "アフィリエイトマーケター", min: 40000, avg: 55000, top25: 70000, top10: 80000, description: "アフィリエイト運用", tags: ["ASP", "成果報酬", "EC"], skillExamples: "ASP運用、パートナー開拓", marketTrend: "EC事業者で継続需要" },
];

const WRITING_JOBS: JobCategoryInput[] = [
  { id: "web_writer", label: "Webライター", min: 30000, avg: 45000, top25: 55000, top10: 65000, description: "Webコンテンツ執筆", tags: ["Web", "記事", "SEO"], skillExamples: "オウンドメディア、コラム、LP", marketTrend: "専門領域の知識で差別化" },
  { id: "seo_writer", label: "SEOライター", min: 35000, avg: 50000, top25: 60000, top10: 70000, description: "SEO記事執筆", tags: ["SEO", "キーワード", "記事"], skillExamples: "SEO記事、構成設計、リライト", marketTrend: "AI時代の高品質記事需要" },
  { id: "copywriter", label: "コピーライター", min: 45000, avg: 65000, top25: 80000, top10: 95000, description: "広告・LPコピー", tags: ["コピー", "LP", "CVR"], skillExamples: "LP、広告コピー、キャッチコピー", marketTrend: "CVR改善実績で高単価" },
  { id: "editor", label: "編集者", min: 40000, avg: 55000, top25: 70000, top10: 80000, description: "メディア編集・校正", tags: ["編集", "校正", "メディア"], skillExamples: "メディア編集、校正、連載企画", marketTrend: "オウンドメディア運営で需要" },
  { id: "technical_writer", label: "テクニカルライター", min: 50000, avg: 70000, top25: 85000, top10: 100000, description: "技術文書・マニュアル", tags: ["マニュアル", "API", "ドキュメント"], skillExamples: "APIドキュメント、操作マニュアル", marketTrend: "SaaS/開発ツールで需要増" },
  { id: "recruitment_writer", label: "求人原稿ライター", min: 35000, avg: 50000, top25: 60000, top10: 70000, description: "求人票・採用コンテンツ", tags: ["求人", "採用", "HR"], skillExamples: "求人原稿、採用サイト、インタビュー", marketTrend: "採用難で求人原稿需要増" },
  { id: "scenario_writer", label: "シナリオライター", min: 45000, avg: 65000, top25: 80000, top10: 95000, description: "映像・イベントシナリオ", tags: ["シナリオ", "脚本", "ナレーション"], skillExamples: "CM、イベント、eラーニング", marketTrend: "動画コンテンツ増で需要" },
  { id: "game_scenario", label: "ゲームシナリオライター", min: 45000, avg: 65000, top25: 80000, top10: 95000, description: "ゲームシナリオ・世界観", tags: ["ゲーム", "シナリオ", "世界観"], skillExamples: "ストーリー、キャラ設定、イベント", marketTrend: "モバイルゲームで安定需要" },
  { id: "medical_writer", label: "メディカルライター", min: 55000, avg: 75000, top25: 90000, top10: 105000, description: "医療・ヘルスケア記事", tags: ["医療", "ヘルスケア", "監修"], skillExamples: "医療記事、ヘルスケアコンテンツ", marketTrend: "専門性で高単価交渉可" },
  { id: "finance_writer", label: "金融ライター", min: 50000, avg: 70000, top25: 85000, top10: 100000, description: "金融・投資コンテンツ", tags: ["金融", "投資", "FP"], skillExamples: "投資記事、金融商品解説", marketTrend: "フィンテックメディアで需要" },
  { id: "writer", label: "ライター / 編集", min: 30000, avg: 45000, top25: 55000, top10: 65000, description: "コンテンツ制作全般", tags: ["記事", "編集", "リライト"], skillExamples: "オウンドメディア、取材記事", marketTrend: "専門領域の知識があるほど差別化" },
];

const VIDEO_JOBS: JobCategoryInput[] = [
  { id: "video_editor", label: "動画編集者", min: 35000, avg: 55000, top25: 70000, top10: 80000, description: "動画編集・映像制作", tags: ["Premiere", "DaVinci", "編集"], skillExamples: "企業VP、SNS広告、YouTube", marketTrend: "SNS広告需要で単価上昇" },
  { id: "motion_graphics", label: "モーショングラフィックス", min: 50000, avg: 70000, top25: 85000, top10: 100000, description: "モーショングラフィック制作", tags: ["After Effects", "モーション", "アニメ"], skillExamples: "オープニング、説明動画、広告", marketTrend: "SaaS説明動画で需要増" },
  { id: "videographer", label: "カメラマン / 映像監督", min: 55000, avg: 75000, top25: 95000, top10: 110000, description: "撮影・ディレクション", tags: ["撮影", "照明", "ディレクション"], skillExamples: "企業VP、イベント、インタビュー", marketTrend: "オンラインイベント需要継続" },
  { id: "youtube_editor", label: "YouTube編集者", min: 35000, avg: 50000, top25: 65000, top10: 75000, description: "YouTube動画編集", tags: ["YouTube", "Premiere", "サムネ"], skillExamples: "YouTube、Shorts、切り抜き", marketTrend: "クリエイター支援で需要拡大" },
  { id: "3d_animator", label: "3DCGアニメーター", min: 55000, avg: 75000, top25: 95000, top10: 110000, description: "3DCGアニメーション", tags: ["Maya", "Blender", "3DCG"], skillExamples: "キャラアニメ、プロダクトCG", marketTrend: "ゲーム・広告で需要安定" },
  { id: "live_director", label: "ライブ配信ディレクター", min: 45000, avg: 65000, top25: 80000, top10: 95000, description: "ライブ配信・イベント運営", tags: ["OBS", "配信", "イベント"], skillExamples: "ライブ配信、オンラインイベント", marketTrend: "ハイブリッドイベント需要" },
  { id: "cm_producer", label: "CM・PV制作", min: 60000, avg: 85000, top25: 105000, top10: 125000, description: "CM・プロモーション映像", tags: ["CM", "PV", "企画"], skillExamples: "CM企画、PV制作、プロデュース", marketTrend: "D2CブランドPV需要増" },
  { id: "video_creator", label: "動画クリエイター", min: 35000, avg: 55000, top25: 70000, top10: 80000, description: "動画制作全般", tags: ["Premiere", "After Effects", "SNS"], skillExamples: "企業VP、SNS広告、YouTube", marketTrend: "SNS広告需要の増加で単価上昇" },
];

const AI_JOBS: JobCategoryInput[] = [
  { id: "ai_engineer", label: "AIエンジニア", min: 90000, avg: 120000, top25: 145000, top10: 175000, description: "AI/MLシステム開発", tags: ["Python", "LLM", "MLOps"], skillExamples: "LLMアプリ、推論基盤、RAG", marketTrend: "生成AI需要で単価急上昇" },
  { id: "prompt_engineer", label: "プロンプトエンジニア", min: 60000, avg: 85000, top25: 105000, top10: 125000, description: "プロンプト設計・最適化", tags: ["ChatGPT", "Claude", "プロンプト"], skillExamples: "プロンプト設計、評価、改善", marketTrend: "2024-2026で急成長中の新職種" },
  { id: "ai_consultant", label: "AIコンサルタント", min: 80000, avg: 110000, top25: 135000, top10: 165000, description: "AI導入・活用コンサル", tags: ["AI戦略", "PoC", "DX"], skillExamples: "AI活用戦略、PoC設計、ROI試算", marketTrend: "企業のAI導入需要が爆発的に増加" },
  { id: "chatgpt_consultant", label: "ChatGPT活用コンサル", min: 55000, avg: 80000, top25: 100000, top10: 120000, description: "ChatGPT業務活用", tags: ["ChatGPT", "業務効率化", "研修"], skillExamples: "業務フロー設計、研修、ガイドライン", marketTrend: "全業種でAI活用ニーズ拡大" },
  { id: "genai_engineer", label: "生成AI実装エンジニア", min: 85000, avg: 115000, top25: 140000, top10: 170000, description: "生成AIアプリ開発", tags: ["OpenAI", "LangChain", "API"], skillExamples: "ChatGPT API、エージェント開発", marketTrend: "最も需要が高いIT職種の一つ" },
  { id: "llm_finetuning", label: "LLMファインチューニング", min: 95000, avg: 125000, top25: 150000, top10: 180000, description: "LLM学習・チューニング", tags: ["LLM", "Fine-tuning", "LoRA"], skillExamples: "ファインチューニング、評価、デプロイ", marketTrend: "企業特化LLM需要が急増" },
  { id: "ai_image_creator", label: "AI画像生成クリエイター", min: 40000, avg: 60000, top25: 75000, top10: 90000, description: "AI画像生成・編集", tags: ["Midjourney", "Stable Diffusion", "DALL-E"], skillExamples: "Midjourney/SD、プロンプト設計", marketTrend: "広告・EC素材で需要拡大" },
  { id: "ai_video_specialist", label: "AI動画生成スペシャリスト", min: 50000, avg: 75000, top25: 95000, top10: 110000, description: "AI動画生成・編集", tags: ["Runway", "Sora", "AI動画"], skillExamples: "Runway/Sora、AI動画ワークフロー", marketTrend: "2025-2026で新規需要急増" },
  { id: "ai_automation", label: "AI自動化エンジニア", min: 70000, avg: 95000, top25: 115000, top10: 140000, description: "AI×RPA・ワークフロー自動化", tags: ["Zapier", "Make", "AI Agent"], skillExamples: "n8n/Make、AI Agent構築", marketTrend: "ノーコード×AIで需要拡大" },
  { id: "rag_engineer", label: "RAGシステムエンジニア", min: 85000, avg: 115000, top25: 140000, top10: 165000, description: "RAG・ナレッジベース構築", tags: ["RAG", "Vector DB", "LangChain"], skillExamples: "RAG設計、ベクトルDB、評価", marketTrend: "社内AI検索需要が急増" },
];

const CONSULTING_JOBS: JobCategoryInput[] = [
  { id: "management_consultant", label: "経営コンサルタント", min: 100000, avg: 140000, top25: 170000, top10: 200000, description: "経営課題・戦略立案", tags: ["経営", "戦略", "KPI"], skillExamples: "経営課題分析、KPI設計、実行支援", marketTrend: "最高単価帯のフリーランス職種" },
  { id: "strategy_consultant", label: "戦略コンサルタント", min: 100000, avg: 135000, top25: 165000, top10: 195000, description: "事業戦略・競合分析", tags: ["戦略", "M&A", "新規事業"], skillExamples: "事業戦略、競合分析、ロードマップ", marketTrend: "新規事業・M&A案件で高単価" },
  { id: "it_strategy_consultant", label: "IT戦略コンサルタント", min: 90000, avg: 120000, top25: 145000, top10: 175000, description: "IT戦略・システム企画", tags: ["IT戦略", "DX", "RFP"], skillExamples: "IT中期計画、ベンダー選定", marketTrend: "DX推進で継続的に需要" },
  { id: "process_consultant", label: "業務改善コンサルタント", min: 80000, avg: 105000, top25: 125000, top10: 150000, description: "業務プロセス改善", tags: ["BPR", "業務改善", "可視化"], skillExamples: "As-Is/To-Be、業務フロー改善", marketTrend: "コスト削減需要で安定" },
  { id: "dx_consultant", label: "DXコンサルタント", min: 85000, avg: 115000, top25: 140000, top10: 165000, description: "デジタルトランスフォーメーション", tags: ["DX", "デジタル", "変革"], skillExamples: "DXロードマップ、デジタル化推進", marketTrend: "全業種でDX需要が拡大" },
  { id: "hr_consultant", label: "人事 / 組織コンサルタント", min: 75000, avg: 100000, top25: 120000, top10: 145000, description: "人事制度・組織設計", tags: ["人事", "評価制度", "組織"], skillExamples: "評価制度、採用戦略、組織設計", marketTrend: "採用難・評価制度改革で需要" },
  { id: "finance_consultant", label: "財務コンサルタント", min: 85000, avg: 115000, top25: 140000, top10: 165000, description: "財務分析・資金調達", tags: ["財務", "FP&A", "資金調達"], skillExamples: "財務モデル、資金調達支援", marketTrend: "スタートアップ資金調達支援需要" },
  { id: "supply_chain_consultant", label: "サプライチェーンコンサル", min: 80000, avg: 110000, top25: 130000, top10: 155000, description: "SCM・物流改善", tags: ["SCM", "物流", "在庫"], skillExamples: "在庫最適化、物流改善", marketTrend: "EC物流・在庫管理で需要" },
  { id: "ma_advisor", label: "M&Aアドバイザー", min: 100000, avg: 140000, top25: 170000, top10: 200000, description: "M&A支援・DD", tags: ["M&A", "DD", "バリュエーション"], skillExamples: "DD、バリュエーション、PMI", marketTrend: "M&A活況で高単価" },
  { id: "new_business_consultant", label: "新規事業コンサルタント", min: 85000, avg: 115000, top25: 140000, top10: 165000, description: "新規事業立ち上げ", tags: ["新規事業", "検証", "PMF"], skillExamples: "事業計画、PoC、PMF検証", marketTrend: "スタートアップ・大企業新規事業" },
  { id: "consultant", label: "コンサルタント", min: 90000, avg: 120000, top25: 145000, top10: 180000, description: "戦略立案 / 業務改善", tags: ["戦略", "業務改善", "提案書"], skillExamples: "課題分析、改善ロードマップ", marketTrend: "成果報酬型を含む高単価職種" },
];

const PROFESSIONAL_JOBS: JobCategoryInput[] = [
  { id: "lawyer", label: "弁護士", min: 100000, avg: 150000, top25: 180000, top10: 220000, description: "法律相談・契約レビュー", tags: ["法律", "契約", "訴訟"], skillExamples: "契約レビュー、法務相談、訴訟", marketTrend: "最高単価帯の士業" },
  { id: "judicial_scrivener", label: "司法書士", min: 60000, avg: 85000, top25: 105000, top10: 125000, description: "登記・供託手続", tags: ["登記", "相続", "会社設立"], skillExamples: "不動産登記、会社設立、相続", marketTrend: "会社設立・相続需要安定" },
  { id: "administrative_scrivener", label: "行政書士", min: 50000, avg: 70000, top25: 85000, top10: 100000, description: "許認可・行政手続", tags: ["許認可", "建設業", "在留"], skillExamples: "許認可申請、在留資格、契約書", marketTrend: "外国人材・許認可需要増" },
  { id: "tax_accountant", label: "税理士", min: 80000, avg: 110000, top25: 135000, top10: 160000, description: "税務・会計顧問", tags: ["税務", "決算", "相続税"], skillExamples: "税務申告、節税提案、M&A税務", marketTrend: "フリーランス増加で顧問需要増" },
  { id: "cpa", label: "公認会計士", min: 90000, avg: 130000, top25: 155000, top10: 185000, description: "会計監査・財務アドバイザリー", tags: ["監査", "会計", "IPO"], skillExamples: "監査、IPO支援、内部統制", marketTrend: "IPO・M&A案件で高単価" },
  { id: "labor_consultant", label: "社会保険労務士", min: 55000, avg: 75000, top25: 90000, top10: 105000, description: "労務・社保手続", tags: ["労務", "就規", "社保"], skillExamples: "就業規則、社保手続、労務相談", marketTrend: "働き方改革・労務リスク対応" },
  { id: "sme_consultant", label: "中小企業診断士", min: 70000, avg: 95000, top25: 115000, top10: 135000, description: "経営診断・補助金申請", tags: ["経営診断", "補助金", "事業計画"], skillExamples: "経営診断、補助金申請、事業計画", marketTrend: "補助金申請支援で需要増" },
  { id: "real_estate_agent", label: "宅地建物取引士", min: 50000, avg: 70000, top25: 85000, top10: 100000, description: "不動産取引・コンサル", tags: ["不動産", "取引", "投資"], skillExamples: "不動産売買、投資コンサル", marketTrend: "不動産投資需要で安定" },
  { id: "fp", label: "ファイナンシャルプランナー", min: 45000, avg: 65000, top25: 80000, top10: 95000, description: "資産運用・ライフプラン", tags: ["FP", "資産運用", "保険"], skillExamples: "ライフプラン、資産運用、相続", marketTrend: "資産運用相談需要増" },
  { id: "ip_consultant", label: "知財コンサルタント", min: 70000, avg: 95000, top25: 115000, top10: 140000, description: "知的財産・特許", tags: ["特許", "商標", "知財"], skillExamples: "特許調査、知財戦略、契約", marketTrend: "スタートアップ知財需要" },
];

const ADMIN_JOBS: JobCategoryInput[] = [
  { id: "accounting", label: "経理・財務", min: 40000, avg: 55000, top25: 65000, top10: 75000, description: "会計 / FP&A / 経理代行", tags: ["簿記", "決算", "管理会計"], skillExamples: "月次決算、資金繰り、税理士連携", marketTrend: "業務範囲が広いほど単価安定" },
  { id: "hr_admin", label: "総務・人事", min: 40000, avg: 55000, top25: 65000, top10: 75000, description: "総務・人事アシスタント", tags: ["総務", "人事", "労務"], skillExamples: "入退社手続、給与計算、備品管理", marketTrend: "バックオフィス代行需要増" },
  { id: "secretary", label: "秘書・アシスタント", min: 35000, avg: 50000, top25: 60000, top10: 70000, description: "経営者秘書・PA", tags: ["秘書", "スケジュール", "英語"], skillExamples: "スケジュール管理、来客対応", marketTrend: "英語秘書で高単価" },
  { id: "data_entry", label: "データ入力・事務", min: 25000, avg: 35000, top25: 45000, top10: 50000, description: "データ入力・一般事務", tags: ["入力", "Excel", "事務"], skillExamples: "Excel入力、データ整理、書類作成", marketTrend: "リモート事務で需要安定" },
  { id: "medical_admin", label: "医療事務", min: 35000, avg: 45000, top25: 55000, top10: 65000, description: "医療機関事務", tags: ["レセプト", "医療", "事務"], skillExamples: "レセプト、受付、カルテ管理", marketTrend: "オンライン診療で需要増" },
  { id: "customer_support", label: "カスタマーサポート", min: 35000, avg: 45000, top25: 55000, top10: 65000, description: "問合せ対応・CS", tags: ["CS", "問合せ", "チャット"], skillExamples: "問合せ対応、FAQ整備、チャット", marketTrend: "SaaS CS需要が拡大" },
  { id: "virtual_assistant", label: "バーチャルアシスタント", min: 30000, avg: 45000, top25: 55000, top10: 65000, description: "リモートアシスタント", tags: ["VA", "リモート", "多能"], skillExamples: "日程調整、リサーチ、SNS運用", marketTrend: "フリーランス・経営者向け需要" },
  { id: "legal_admin", label: "契約管理・法務事務", min: 45000, avg: 60000, top25: 75000, top10: 85000, description: "契約書管理・法務支援", tags: ["契約", "法務", "コンプライアンス"], skillExamples: "契約書管理、NDA、コンプライアンス", marketTrend: "スタートアップ法務需要増" },
];

const SALES_JOBS: JobCategoryInput[] = [
  { id: "btob_sales", label: "BtoB営業", min: 45000, avg: 60000, top25: 75000, top10: 85000, description: "法人営業・新規開拓", tags: ["BtoB", "新規", "提案"], skillExamples: "新規開拓、提案、クロージング", marketTrend: "成果連動で大幅な値上げも可能" },
  { id: "inside_sales", label: "インサイドセールス", min: 40000, avg: 55000, top25: 70000, top10: 80000, description: "テレアポ・リード獲得", tags: ["IS", "テレアポ", "CRM"], skillExamples: "リード獲得、商談設定、CRM管理", marketTrend: "SaaS IS需要が拡大" },
  { id: "field_sales", label: "フィールドセールス", min: 50000, avg: 70000, top25: 85000, top10: 100000, description: "外回り営業・大案件", tags: ["FS", "商談", "大案件"], skillExamples: "大企業向け提案、関係構築", marketTrend: "高単価案件ほどFS需要" },
  { id: "customer_success", label: "カスタマーサクセス", min: 45000, avg: 65000, top25: 80000, top10: 95000, description: "既存顧客フォロー・解約防止", tags: ["CS", "解約防止", "アップセル"], skillExamples: "オンボーディング、解約防止、アップセル", marketTrend: "SaaS CS職の需要急増" },
  { id: "sales_engineer", label: "セールスエンジニア", min: 70000, avg: 95000, top25: 115000, top10: 135000, description: "技術営業・PoC支援", tags: ["SE", "PoC", "技術提案"], skillExamples: "技術デモ、PoC、要件ヒアリング", marketTrend: "SaaS/IT企業で高単価" },
  { id: "sales_outsource", label: "営業代行", min: 40000, avg: 55000, top25: 70000, top10: 85000, description: "営業アウトソース", tags: ["代行", "新規", "成果報酬"], skillExamples: "新規開拓代行、リスト作成", marketTrend: "スタートアップ初期で需要" },
  { id: "appointment_setter", label: "テレアポ・アポイント", min: 35000, avg: 45000, top25: 55000, top10: 65000, description: "アポイント獲得", tags: ["テレアポ", "アポ", "リスト"], skillExamples: "テレアポ、アポ獲得、リスト作成", marketTrend: "成果報酬型が主流" },
  { id: "ec_sales", label: "EC運営・販売管理", min: 40000, avg: 55000, top25: 70000, top10: 80000, description: "ECモール運営", tags: ["EC", "Amazon", "楽天"], skillExamples: "Amazon/楽天運営、在庫管理", marketTrend: "D2C EC需要で安定" },
  { id: "sales", label: "営業 / セールス", min: 45000, avg: 60000, top25: 75000, top10: 85000, description: "BtoB営業 / インサイドセールス", tags: ["商談", "提案", "CRM"], skillExamples: "新規開拓、既存深耕、営業プロセス", marketTrend: "成果連動で大幅な値上げも可能" },
];

const TRANSLATOR_JOBS: JobCategoryInput[] = [
  { id: "translator", label: "翻訳・通訳", min: 35000, avg: 50000, top25: 65000, top10: 75000, description: "ビジネス翻訳 / ローカライズ", tags: ["英日翻訳", "専門翻訳", "通訳"], skillExamples: "技術文書、契約書、マーケ資料", marketTrend: "専門分野ほど高単価" },
  { id: "english_translator", label: "英日翻訳者", min: 40000, avg: 55000, top25: 70000, top10: 80000, description: "英日ビジネス翻訳", tags: ["英日", "ビジネス", "翻訳"], skillExamples: "ビジネス文書、プレスリリース", marketTrend: "グローバル企業で需要安定" },
  { id: "localization", label: "ローカライズスペシャリスト", min: 45000, avg: 65000, top25: 80000, top10: 95000, description: "ソフトウェア・ゲームローカライズ", tags: ["ローカライズ", "i18n", "ゲーム"], skillExamples: "SaaS/ゲームローカライズ、QA", marketTrend: "グローバル展開で需要増" },
];

export const JOB_CATEGORIES: JobCategory[] = [
  ...IT_JOBS.map((j) => defineJob("it", j)),
  ...DESIGN_JOBS.map((j) => defineJob("design", j)),
  ...MARKETING_JOBS.map((j) => defineJob("marketing", j)),
  ...WRITING_JOBS.map((j) => defineJob("writing", j)),
  ...VIDEO_JOBS.map((j) => defineJob("video", j)),
  ...AI_JOBS.map((j) => defineJob("ai", j)),
  ...CONSULTING_JOBS.map((j) => defineJob("consulting", j)),
  ...PROFESSIONAL_JOBS.map((j) => defineJob("professional", j)),
  ...ADMIN_JOBS.map((j) => defineJob("admin", j)),
  ...SALES_JOBS.map((j) => defineJob("sales", j)),
  ...TRANSLATOR_JOBS.map((j) => defineJob("writing", j)),
];

export const JOB_CATEGORY_COUNT = JOB_CATEGORIES.length;

/** 開発・テスト用: 121職種以上が読み込まれていることを保証 */
export const JOB_CATEGORY_DATA_VERSION = "2026-01-121";

export function getCategoryById(id: string): JobCategory | undefined {
  return JOB_CATEGORIES.find((c) => c.id === id);
}

export function getCategoriesByGroup(group: JobGroupId): JobCategory[] {
  return JOB_CATEGORIES.filter((c) => c.group === group);
}
