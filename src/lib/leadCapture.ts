export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export const PDF_LEAD_BENEFITS = [
  "あなた専用単価改善レポート",
  "端末に保存して後から見返せる",
  "交渉時に使える資料",
] as const;
