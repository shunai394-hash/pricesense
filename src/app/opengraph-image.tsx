import { ImageResponse } from "next/og";
import { DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const alt = `${SITE_NAME} — AI営業部`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          background:
            "linear-gradient(135deg, #0a0a0a 0%, #141414 50%, #1a1a1a 100%)",
          border: "4px solid #e8c547",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 12,
              border: "2px solid #e8c547",
              background: "rgba(232,197,71,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#e8c547",
              fontSize: 22,
              fontWeight: 700,
              fontFamily: "Georgia, serif",
            }}
          >
            AI
          </div>
          <div
            style={{
              display: "flex",
              color: "#e8c547",
              fontSize: 28,
              letterSpacing: 4,
              fontWeight: 500,
            }}
          >
            AI営業部
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 56,
            fontWeight: 700,
            color: "#f5f0e8",
            lineHeight: 1.2,
            fontFamily: "Georgia, serif",
            marginBottom: 24,
          }}
        >
          単価診断から、営業の次の一手へ
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "#8a8578",
            lineHeight: 1.5,
            maxWidth: 900,
          }}
        >
          {DEFAULT_DESCRIPTION.slice(0, 80)}…
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            display: "flex",
            background:
              "linear-gradient(90deg, transparent, #e8c547, transparent)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
