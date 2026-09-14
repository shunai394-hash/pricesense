import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 8,
          border: "2px solid #e8c547",
        }}
      >
        <div
          style={{
            color: "#e8c547",
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "Georgia, serif",
            letterSpacing: 0.5,
          }}
        >
          AI
        </div>
      </div>
    ),
    { ...size }
  );
}
