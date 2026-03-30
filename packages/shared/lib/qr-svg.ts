import QRCode from "qrcode";
import { type SavedQrSettings } from "@shared/lib/qr-render";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const isMarkerCell = (row: number, col: number, moduleCount: number) => {
  const inTopLeft = row >= 0 && row <= 6 && col >= 0 && col <= 6;
  const inTopRight = row >= 0 && row <= 6 && col >= moduleCount - 7 && col <= moduleCount - 1;
  const inBottomLeft = row >= moduleCount - 7 && row <= moduleCount - 1 && col >= 0 && col <= 6;
  return inTopLeft || inTopRight || inBottomLeft;
};

const markerRingSvg = (x: number, y: number, markerBorderShape: string, fgColor: string, bgColor: string) => {
  if (markerBorderShape === "circle") {
    const cx = x + 3.5;
    const cy = y + 3.5;
    return `<circle cx="${cx}" cy="${cy}" r="3.5" fill="${escapeXml(fgColor)}"/><circle cx="${cx}" cy="${cy}" r="2.5" fill="${escapeXml(bgColor)}"/>`;
  }
  if (markerBorderShape === "rounded") {
    return `<rect x="${x}" y="${y}" width="7" height="7" rx="1.2" ry="1.2" fill="${escapeXml(fgColor)}"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" rx="0.7" ry="0.7" fill="${escapeXml(bgColor)}"/>`;
  }
  return `<rect x="${x}" y="${y}" width="7" height="7" fill="${escapeXml(fgColor)}"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="${escapeXml(bgColor)}"/>`;
};

const markerCenterSvg = (x: number, y: number, markerCenterShape: string, fgColor: string) => {
  if (markerCenterShape === "circle") {
    return `<circle cx="${x + 3.5}" cy="${y + 3.5}" r="1.5" fill="${escapeXml(fgColor)}"/>`;
  }
  if (markerCenterShape === "rounded") {
    return `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.7" ry="0.7" fill="${escapeXml(fgColor)}"/>`;
  }
  return `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="${escapeXml(fgColor)}"/>`;
};

const drawDot = (x: number, y: number, dotShape: string, fgColor: string) => {
  if (dotShape === "circle") {
    return `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.42" fill="${escapeXml(fgColor)}"/>`;
  }
  if (dotShape === "rounded") {
    return `<rect x="${x + 0.05}" y="${y + 0.05}" width="0.9" height="0.9" rx="0.26" ry="0.26" fill="${escapeXml(fgColor)}"/>`;
  }
  return `<rect x="${x + 0.05}" y="${y + 0.05}" width="0.9" height="0.9" fill="${escapeXml(fgColor)}"/>`;
};

export async function generateStyledQrSvg(params: {
  url: string;
  deviceName: string;
  settings?: SavedQrSettings | null;
}) {
  const s = (params.settings ?? {}) as Record<string, any>;
  const size = Number(s.size ?? 320);
  const fgColor = typeof s.fgColor === "string" ? s.fgColor : "#111111";
  const bgColor = typeof s.bgColor === "string" ? s.bgColor : "#ffffff";
  const accentColor = typeof s.accentColor === "string" ? s.accentColor : fgColor;
  const overlayText = typeof s.overlayText === "string" ? s.overlayText : "";
  const secondaryText = typeof s.secondaryText === "string" ? s.secondaryText : "";
  const primaryTextScale = Number(s.primaryTextScale ?? 1);
  const secondaryTextScale = Number(s.secondaryTextScale ?? 1);
  const includeLabel = s.includeLabel !== false;
  const labelPadding = Number(s.labelPadding ?? 8);
  const qrLevel = (s.qrLevel as "L" | "M" | "Q" | "H") ?? "H";
  const frameStyle = typeof s.frameStyle === "string" ? s.frameStyle : "rounded";
  const framePadding = Number(s.framePadding ?? 10);
  const frameThickness = Number(s.frameThickness ?? 3);
  const frameRadius = Number(s.frameRadius ?? 22);
  const frameDash = Number(s.frameDash ?? 8);
  const shadowDepth = Number(s.shadowDepth ?? 8);
  const shadowColor = typeof s.shadowColor === "string" ? s.shadowColor : accentColor;
  const showGradientBg = Boolean(s.showGradientBg);
  const gradientAngle = Number(s.gradientAngle ?? 135);
  const centerText = typeof s.centerText === "string" ? s.centerText.trim() : "";
  const centerTextColor = typeof s.centerTextColor === "string" ? s.centerTextColor : fgColor;
  const centerTextSize = Number(s.centerTextSize ?? 1);
  const exportBackground = s.exportBackground === "transparent" ? "transparent" : "white";
  const dotShape = typeof s.dotShape === "string" ? s.dotShape : "square";
  const markerBorderShape = typeof s.markerBorderShape === "string" ? s.markerBorderShape : "square";
  const markerCenterShape = typeof s.markerCenterShape === "string" ? s.markerCenterShape : "square";

  const qr = QRCode.create(params.url, { errorCorrectionLevel: qrLevel });
  const modules = qr.modules;
  const moduleCount = modules.size;
  const margin = 1;
  const qrView = moduleCount + margin * 2;

  const markerPositions = [
    { x: margin, y: margin },
    { x: margin + moduleCount - 7, y: margin },
    { x: margin, y: margin + moduleCount - 7 },
  ];

  const markerSvg = markerPositions
    .map((pos) => `${markerRingSvg(pos.x, pos.y, markerBorderShape, fgColor, bgColor)}${markerCenterSvg(pos.x, pos.y, markerCenterShape, fgColor)}`)
    .join("");

  let dotSvg = "";
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (modules.get(row, col) !== 1) continue;
      if (isMarkerCell(row, col, moduleCount)) continue;
      dotSvg += drawDot(margin + col, margin + row, dotShape, fgColor);
    }
  }
  const qrInner = `${markerSvg}${dotSvg}`;

  const padding = 28;
  const qrSize = size;
  const frameStroke = frameStyle === "none" ? 0 : Math.max(1, frameThickness);
  const effectiveFrameRadius = frameStyle === "none" ? 0 : Math.max(0, frameRadius);
  const effectiveFramePadding = frameStyle === "none" ? 0 : Math.max(0, framePadding);

  const primarySize = Math.max(12, size / 16) * primaryTextScale;
  const secondarySize = Math.max(10, size / 20) * secondaryTextScale;

  const labelCount =
    (includeLabel ? 1 : 0) +
    (overlayText ? 1 : 0) +
    (secondaryText ? 1 : 0);
  const labelBlockHeight = labelCount === 0 ? 0 : 18 + (includeLabel ? primarySize + 6 : 0) + (overlayText ? primarySize + 4 : 0) + (secondaryText ? secondarySize + 4 : 0);

  const width = qrSize + (padding + effectiveFramePadding) * 2;
  const qrTop = padding + effectiveFramePadding;
  const qrLeft = padding + effectiveFramePadding;
  const qrBottom = qrTop + qrSize;
  const height = qrBottom + labelBlockHeight + padding;

  const backgroundFill = showGradientBg
    ? `url(#qrf-gradient)`
    : exportBackground === "transparent"
      ? "transparent"
      : bgColor;
  const frameStrokeDash = frameStyle === "dashed" ? ` stroke-dasharray="${Math.max(2, frameDash)} ${Math.max(2, frameDash)}"` : "";
  const shadowOffset = frameStyle === "shadow" ? Math.max(2, shadowDepth) : 0;
  const shadowOpacity = frameStyle === "shadow" ? 1 : 0;

  const centerTextEnabled = centerText.length > 0;
  const centerFontSize = Math.max(10, size / 14) * centerTextSize;
  const centerBoxW = Math.max(64, centerText.length * (centerFontSize * 0.58) + 20);
  const centerBoxH = Math.max(28, centerFontSize + 12);
  const centerBoxX = qrLeft + qrSize / 2 - centerBoxW / 2;
  const centerBoxY = qrTop + qrSize / 2 - centerBoxH / 2;

  const frameOffset = frameStyle === "none" ? 0 : effectiveFramePadding;
  let labelY = qrBottom + 16 + frameOffset + Math.max(0, labelPadding);
  let labelSvg = "";
  if (includeLabel) {
    labelSvg += `<text x="${width / 2}" y="${labelY}" text-anchor="middle" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI" font-weight="700" font-size="${Math.round(primarySize)}" fill="${escapeXml(fgColor)}">${escapeXml(params.deviceName)}</text>`;
    labelY += primarySize + 8;
  }
  if (overlayText) {
    labelSvg += `<text x="${width / 2}" y="${labelY}" text-anchor="middle" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI" font-weight="700" font-size="${Math.round(primarySize)}" fill="${escapeXml(accentColor)}">${escapeXml(overlayText)}</text>`;
    labelY += primarySize + 6;
  }
  if (secondaryText) {
    labelSvg += `<text x="${width / 2}" y="${labelY}" text-anchor="middle" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI" font-weight="500" font-size="${Math.round(secondarySize)}" fill="${escapeXml(fgColor)}" opacity="0.9">${escapeXml(secondaryText)}</text>`;
  }

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(width)}" height="${Math.round(height)}" viewBox="0 0 ${Math.round(width)} ${Math.round(height)}">
  <defs>
    <linearGradient id="qrf-gradient" x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform="rotate(${Math.round(gradientAngle)}, .5, .5)">
      <stop offset="0%" stop-color="${escapeXml(bgColor)}"/>
      <stop offset="100%" stop-color="${escapeXml(accentColor)}" stop-opacity="0.25"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="100%" height="100%" fill="${backgroundFill}"/>
  ${frameStyle === "none" ? "" : frameStyle === "shadow"
      ? `<rect x="${qrLeft - effectiveFramePadding + shadowOffset}" y="${qrTop - effectiveFramePadding + shadowOffset}" width="${qrSize + effectiveFramePadding * 2}" height="${qrSize + effectiveFramePadding * 2}" rx="${effectiveFrameRadius}" ry="${effectiveFrameRadius}" fill="${escapeXml(shadowColor)}" opacity="${shadowOpacity}"/><rect x="${qrLeft - effectiveFramePadding}" y="${qrTop - effectiveFramePadding}" width="${qrSize + effectiveFramePadding * 2}" height="${qrSize + effectiveFramePadding * 2}" rx="${effectiveFrameRadius}" ry="${effectiveFrameRadius}" fill="${escapeXml(bgColor)}" stroke="${escapeXml(accentColor)}" stroke-width="${frameStroke}"/>`
      : `<rect x="${qrLeft - effectiveFramePadding}" y="${qrTop - effectiveFramePadding}" width="${qrSize + effectiveFramePadding * 2}" height="${qrSize + effectiveFramePadding * 2}" rx="${effectiveFrameRadius}" ry="${effectiveFrameRadius}" fill="none" stroke="${escapeXml(accentColor)}" stroke-width="${frameStroke}"${frameStrokeDash}/>`
    }
  <g transform="translate(${qrLeft},${qrTop}) scale(${qrSize / qrView})">
    ${qrInner}
  </g>
  ${centerTextEnabled ? `<rect x="${centerBoxX}" y="${centerBoxY}" width="${centerBoxW}" height="${centerBoxH}" rx="${Math.round(centerBoxH * 0.25)}" ry="${Math.round(centerBoxH * 0.25)}" fill="${escapeXml(bgColor)}"/><text x="${qrLeft + qrSize / 2}" y="${qrTop + qrSize / 2 + centerFontSize * 0.35}" text-anchor="middle" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI" font-weight="700" font-size="${Math.round(centerFontSize)}" fill="${escapeXml(centerTextColor)}">${escapeXml(centerText)}</text>` : ""}
  ${labelSvg}
</svg>`.trim();
}
