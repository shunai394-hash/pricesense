import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
  formatYen,
  type AnnualSimulationRow,
  type DiagnosisResult,
  type JobCategory,
} from "@/lib/calculator";

export interface PdfExportData {
  category: JobCategory;
  userRate: number;
  diagnosis: DiagnosisResult;
  annualOpportunity: number;
  targetRate: number;
  annualUpgradeImpact: number;
  annualSimulationRows: AnnualSimulationRow[];
  negotiationSubject: string;
  negotiationBody: string;
}

function buildPdfHtml(data: PdfExportData): string {
  const {
    category,
    userRate,
    diagnosis,
    annualOpportunity,
    targetRate,
    annualUpgradeImpact,
    annualSimulationRows,
    negotiationSubject,
    negotiationBody,
  } = data;

  const simulationRowsHtml = annualSimulationRows
    .map(
      (row) => `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0; color: #666;">${row.label}</td>
            <td style="padding: 8px 0; text-align: right;">${formatYen(row.dailyRate)}</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 700;">${formatYen(row.annualRevenue)}</td>
            <td style="padding: 8px 0; text-align: right; color: ${row.diffFromCurrent > 0 ? "#27ae60" : row.diffFromCurrent < 0 ? "#c0392b" : "#666"};">
              ${row.id === "current" ? "—" : `${row.diffFromCurrent > 0 ? "+" : ""}${formatYen(row.diffFromCurrent)}`}
            </td>
          </tr>`
    )
    .join("");

  const annualLabel =
    annualOpportunity > 0
      ? `年間機会損失: ${formatYen(annualOpportunity)}`
      : annualOpportunity < 0
        ? `年間超過収益: ${formatYen(Math.abs(annualOpportunity))}`
        : "市場相場と一致";

  return `
    <div style="font-family: 'Hiragino Sans', 'Noto Sans JP', sans-serif; color: #1a1a1a; padding: 40px; max-width: 720px; background: #fff;">
      <div style="border-bottom: 3px solid #e8c547; padding-bottom: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 11px; color: #888; letter-spacing: 2px;">PRICESENSE 単価診断レポート</p>
        <h1 style="margin: 8px 0 0; font-size: 24px; font-weight: 700;">${category.label} — 診断結果</h1>
        <p style="margin: 4px 0 0; font-size: 12px; color: #666;">生成日: ${new Date().toLocaleDateString("ja-JP")}</p>
      </div>

      <section style="margin-bottom: 24px;">
        <h2 style="font-size: 14px; color: #888; margin: 0 0 12px; text-transform: uppercase;">診断サマリー</h2>
        <div style="background: #f8f6f0; border-radius: 8px; padding: 16px;">
          <p style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #c9a020;">${diagnosis.label}</p>
          <p style="margin: 0; font-size: 13px; line-height: 1.6;">${diagnosis.summary}</p>
        </div>
      </section>

      <section style="margin-bottom: 24px;">
        <h2 style="font-size: 14px; color: #888; margin: 0 0 12px;">単価比較</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0; color: #666;">あなたの日単価</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 700;">${formatYen(userRate)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0; color: #666;">市場平均</td>
            <td style="padding: 8px 0; text-align: right;">${formatYen(category.avgRate)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0; color: #666;">市場最低</td>
            <td style="padding: 8px 0; text-align: right;">${formatYen(category.minRate)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0; color: #666;">上位25%</td>
            <td style="padding: 8px 0; text-align: right;">${formatYen(category.top25Rate)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0; color: #666;">上位10%</td>
            <td style="padding: 8px 0; text-align: right;">${formatYen(category.top10Rate)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0; color: #666;">市場内ポジション</td>
            <td style="padding: 8px 0; text-align: right;">${diagnosis.positionLabel}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">${annualLabel.split(":")[0]}</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 700; color: ${annualOpportunity > 0 ? "#c0392b" : "#27ae60"};">${annualLabel.includes(":") ? annualLabel.split(":")[1].trim() : annualLabel}</td>
          </tr>
        </table>
      </section>

      <section style="margin-bottom: 24px;">
        <h2 style="font-size: 14px; color: #888; margin: 0 0 12px;">年間収益シミュレーション</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="border-bottom: 1px solid #ddd; color: #888; font-size: 11px;">
              <th style="padding: 6px 0; text-align: left;">シナリオ</th>
              <th style="padding: 6px 0; text-align: right;">日単価</th>
              <th style="padding: 6px 0; text-align: right;">年間収益</th>
              <th style="padding: 6px 0; text-align: right;">現在比</th>
            </tr>
          </thead>
          <tbody>
            ${simulationRowsHtml}
          </tbody>
        </table>
      </section>

      <section style="margin-bottom: 24px;">
        <h2 style="font-size: 14px; color: #888; margin: 0 0 12px;">交渉目標</h2>
        <p style="margin: 0; font-size: 13px;">目標単価: <strong>${formatYen(targetRate)}</strong> / 改定後年間増収（推定）: <strong style="color: #27ae60;">+${formatYen(annualUpgradeImpact)}</strong></p>
      </section>

      <section style="margin-bottom: 24px;">
        <h2 style="font-size: 14px; color: #888; margin: 0 0 12px;">交渉文</h2>
        <p style="margin: 0 0 8px; font-size: 13px;"><strong>件名:</strong> ${negotiationSubject}</p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; font-size: 12px; line-height: 1.8; white-space: pre-wrap;">${negotiationBody.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
      </section>

      <p style="font-size: 10px; color: #aaa; margin: 0;">※ 本レポートの相場データは参考値です。個別の案件条件により実際の単価は異なります。PriceSense — フリーランス単価診断</p>
    </div>
  `;
}

async function renderDiagnosisPdf(data: PdfExportData): Promise<jsPDF> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "720px";
  container.innerHTML = buildPdfHtml(data);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;

    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
    }

    return pdf;
  } finally {
    document.body.removeChild(container);
  }
}

export async function exportDiagnosisPdf(data: PdfExportData): Promise<void> {
  const pdf = await renderDiagnosisPdf(data);
  const date = new Date().toISOString().slice(0, 10);
  pdf.save(`pricesense-${data.category.id}-${date}.pdf`);
}

export interface PdfAttachmentPayload {
  filename: string;
  contentBase64: string;
}

export async function exportDiagnosisPdfAsBase64(
  data: PdfExportData
): Promise<PdfAttachmentPayload> {
  const pdf = await renderDiagnosisPdf(data);
  const date = new Date().toISOString().slice(0, 10);
  const dataUri = pdf.output("datauristring");
  const contentBase64 = dataUri.split(",")[1] ?? "";

  return {
    filename: `pricesense-${data.category.id}-${date}.pdf`,
    contentBase64,
  };
}
