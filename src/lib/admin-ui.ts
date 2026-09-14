/** Maps admin API errors to operator-facing Japanese. Never invents new auth rules. */
export function formatAdminClientError(
  raw: string | undefined,
  status?: number
): string {
  const text = (raw ?? "").trim();
  if (status === 401 || /^unauthorized$/i.test(text)) {
    return "管理者認証に失敗しました。ADMIN_TOKEN を確認し、再試行してください。";
  }
  if (status === 404 || /not found/i.test(text)) {
    return "指定されたデータが見つかりません。";
  }
  if (/invalid leadid/i.test(text)) {
    return "Lead IDの形式が正しくありません。";
  }
  if (/invalid dealid/i.test(text)) {
    return "Deal IDの形式が正しくありません。";
  }
  if (status === 503) {
    return "データ連携の設定が完了していないため、読み込めませんでした。";
  }
  if (!text) {
    return "読み込みに失敗しました。時間をおいて再試行してください。";
  }
  return text.slice(0, 300);
}
