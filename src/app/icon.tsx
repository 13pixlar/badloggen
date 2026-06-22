import { ImageResponse } from "next/og";
import { AppIcon } from "@/lib/brand/app-icon";

export const dynamic = "force-static";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<AppIcon size={32} />, { ...size });
}
