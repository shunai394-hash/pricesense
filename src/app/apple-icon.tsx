import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          borderRadius: 36,
          border: "4px solid #e8c547",
        }}
      >
        <div
          style={{
            color: "#e8c547",
            fontSize: 72,
            fontWeight: 700,
            fontFamily: "Georgia, serif",
            letterSpacing: 1,
          }}
        >
          AI
        </div>
      </div>
    ),
    { ...size }
  );
}
