import QRCode from "qrcode";

export type SavedQrSettings = {
  size?: number;
  fgColor?: string;
  bgColor?: string;
  accentColor?: string;
  overlayText?: string;
  secondaryText?: string;
  primaryTextScale?: number;
  secondaryTextScale?: number;
  includeLabel?: boolean;
  qrLevel?: "L" | "M" | "Q" | "H";
  frameStyle?: string;
  centerIcon?: string;
  centerText?: string;
  centerTextSize?: number;
  centerTextColor?: string;
  showGradientBg?: boolean;
  gradientAngle?: number;
  dotShape?: string;
  markerBorderShape?: string;
  markerCenterShape?: string;
  centerBgShape?: string;
  centerPaddingH?: number;
  centerPaddingV?: number;
  shadowDepth?: number;
  shadowRounded?: boolean;
  exportBackground?: "white" | "transparent";
};

const DEFAULTS: Required<SavedQrSettings> = {
  size: 200,
  fgColor: "#000000",
  bgColor: "#ffffff",
  accentColor: "#000000",
  overlayText: "",
  secondaryText: "",
  primaryTextScale: 1,
  secondaryTextScale: 1,
  includeLabel: true,
  qrLevel: "H",
  frameStyle: "none",
  centerIcon: "none",
  centerText: "",
  centerTextSize: 1,
  centerTextColor: "#000000",
  showGradientBg: false,
  gradientAngle: 135,
  dotShape: "rounded",
  markerBorderShape: "rounded",
  markerCenterShape: "circle",
  centerBgShape: "circle",
  centerPaddingH: 8,
  centerPaddingV: 8,
  shadowDepth: 8,
  shadowRounded: false,
  exportBackground: "white",
};

const CENTER_ICON_MAP: Record<string, string> = {
  pin: "📍",
  phone: "📱",
  key: "🔑",
  bag: "👜",
  laptop: "💻",
  wallet: "👛",
  heart: "❤️",
  star: "⭐",
  paw: "🐾",
};

function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.min(255, (num >> 16) + amt);
  const g = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const b = Math.min(255, (num & 0x0000ff) + amt);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function isPositionMarker(row: number, col: number, moduleCount: number): boolean {
  if (row <= 6 && col <= 6) return true;
  if (row <= 6 && col >= moduleCount - 7) return true;
  if (row >= moduleCount - 7 && col <= 6) return true;
  return false;
}

function drawModule(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, shape: string) {
  ctx.beginPath();
  if (shape === "rounded") {
    const r = s * 0.35;
    ctx.roundRect(x, y, s, s, r);
  } else if (shape === "circle") {
    ctx.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2);
  } else {
    ctx.rect(x, y, s, s);
  }
  ctx.fill();
}

function drawMarkerCenter(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, shape: string) {
  const padding = size * 0.1;
  const adjustedX = x + padding;
  const adjustedY = y + padding;
  const adjustedSize = size - padding * 2;

  ctx.beginPath();
  if (shape === "circle") {
    ctx.arc(adjustedX + adjustedSize / 2, adjustedY + adjustedSize / 2, adjustedSize / 2, 0, Math.PI * 2);
  } else {
    ctx.rect(adjustedX, adjustedY, adjustedSize, adjustedSize);
  }
  ctx.fill();
}

function drawMarkerBorder(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, thickness: number, shape: string) {
  const outerPadding = thickness * 0.1;
  const adjustedX = x + outerPadding;
  const adjustedY = y + outerPadding;
  const adjustedSize = size - outerPadding * 2;

  ctx.beginPath();
  if (shape === "circle") {
    const centerX = adjustedX + adjustedSize / 2;
    const centerY = adjustedY + adjustedSize / 2;
    const outerRadius = adjustedSize / 2;
    const innerRadius = outerRadius - thickness;
    ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2, true);
  } else if (shape === "rounded") {
    const radius = thickness * 1.5;
    const innerGap = thickness;
    ctx.roundRect(adjustedX, adjustedY, adjustedSize, adjustedSize, radius);
    ctx.roundRect(
      adjustedX + innerGap,
      adjustedY + innerGap,
      adjustedSize - innerGap * 2,
      adjustedSize - innerGap * 2,
      radius * 0.5
    );
  } else {
    const innerGap = thickness;
    ctx.rect(adjustedX, adjustedY, adjustedSize, adjustedSize);
    ctx.rect(adjustedX + innerGap, adjustedY + innerGap, adjustedSize - innerGap * 2, adjustedSize - innerGap * 2);
  }

  ctx.fill("evenodd");
}

function drawPositionMarkers(
  ctx: CanvasRenderingContext2D,
  moduleCount: number,
  moduleSize: number,
  margin: number,
  fgColor: string,
  markerBorderShape: string,
  markerCenterShape: string
) {
  const markers = [
    { startRow: 0, startCol: 0 },
    { startRow: 0, startCol: moduleCount - 7 },
    { startRow: moduleCount - 7, startCol: 0 },
  ];

  for (const marker of markers) {
    const x = margin + marker.startCol * moduleSize;
    const y = margin + marker.startRow * moduleSize;
    const outerSize = 7 * moduleSize;
    const innerSize = 3 * moduleSize;

    ctx.fillStyle = fgColor;
    drawMarkerBorder(ctx, x, y, outerSize, moduleSize, markerBorderShape);

    const centerX = x + 2 * moduleSize;
    const centerY = y + 2 * moduleSize;
    drawMarkerCenter(ctx, centerX, centerY, innerSize, markerCenterShape);
  }
}

function drawConnectedRoundedModules(
  ctx: CanvasRenderingContext2D,
  qrMatrix: boolean[][],
  moduleCount: number,
  moduleSize: number,
  margin: number
) {
  const r = moduleSize * 0.4;

  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (!qrMatrix[row][col] || isPositionMarker(row, col, moduleCount)) continue;

      const x = margin + col * moduleSize;
      const y = margin + row * moduleSize;
      const s = moduleSize;

      const top = row > 0 && qrMatrix[row - 1][col] && !isPositionMarker(row - 1, col, moduleCount);
      const bottom = row < moduleCount - 1 && qrMatrix[row + 1][col] && !isPositionMarker(row + 1, col, moduleCount);
      const left = col > 0 && qrMatrix[row][col - 1] && !isPositionMarker(row, col - 1, moduleCount);
      const right = col < moduleCount - 1 && qrMatrix[row][col + 1] && !isPositionMarker(row, col + 1, moduleCount);

      ctx.beginPath();

      if (!top && !left) {
        ctx.moveTo(x + r, y);
      } else {
        ctx.moveTo(x, y);
      }

      if (!top && !right) {
        ctx.lineTo(x + s - r, y);
        ctx.quadraticCurveTo(x + s, y, x + s, y + r);
      } else {
        ctx.lineTo(x + s, y);
      }

      if (!bottom && !right) {
        ctx.lineTo(x + s, y + s - r);
        ctx.quadraticCurveTo(x + s, y + s, x + s - r, y + s);
      } else {
        ctx.lineTo(x + s, y + s);
      }

      if (!bottom && !left) {
        ctx.lineTo(x + r, y + s);
        ctx.quadraticCurveTo(x, y + s, x, y + s - r);
      } else {
        ctx.lineTo(x, y + s);
      }

      if (!top && !left) {
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
      } else {
        ctx.lineTo(x, y);
      }

      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawCenterBackground(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, shape: string) {
  ctx.beginPath();
  if (shape === "circle") {
    ctx.arc(cx, cy, Math.max(w, h) / 2, 0, Math.PI * 2);
  } else if (shape === "rounded") {
    const r = Math.min(w, h) * 0.2;
    ctx.roundRect(cx - w / 2, cy - h / 2, w, h, r);
  } else {
    ctx.rect(cx - w / 2, cy - h / 2, w, h);
  }
  ctx.fill();
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export async function generateStyledQrDataUrl(params: {
  url: string;
  deviceName: string;
  settings?: SavedQrSettings | null;
}): Promise<string> {
  const settings = { ...DEFAULTS, ...(params.settings ?? {}) };

  const qr = QRCode.create(params.url, { errorCorrectionLevel: settings.qrLevel });
  const modules = qr.modules;
  const qrMatrix: boolean[][] = [];
  for (let row = 0; row < modules.size; row++) {
    const rowData: boolean[] = [];
    for (let col = 0; col < modules.size; col++) {
      rowData.push(modules.get(row, col) === 1);
    }
    qrMatrix.push(rowData);
  }

  const exportQrSize = 1024;
  const frameStrokeWidth = settings.frameStyle === "corners" ? 4 : settings.frameStyle === "double" ? 2 : 3;
  const frameInset = Math.max(12, frameStrokeWidth + (settings.frameStyle === "shadow" ? settings.shadowDepth + 4 : 0));
  const padding = Math.max(48, frameInset + 28);
  const sizeScale = exportQrSize / Math.max(1, settings.size);
  const primaryTextFontSize = Math.max(12, settings.size / 18) * settings.primaryTextScale * sizeScale;
  const secondaryTextFontSize = Math.max(10, settings.size / 20) * settings.secondaryTextScale * sizeScale;
  const textHeight =
    (settings.includeLabel ? 30 : 0) +
    (settings.overlayText ? Math.max(18, primaryTextFontSize + 4) : 0) +
    (settings.secondaryText ? Math.max(14, secondaryTextFontSize + 2) : 0);

  const totalWidth = exportQrSize + padding * 2;
  const totalHeight = exportQrSize + padding * 2 + textHeight;

  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = totalWidth;
  exportCanvas.height = totalHeight;
  const ctx = exportCanvas.getContext("2d");
  if (!ctx) {
    return QRCode.toDataURL(params.url, { width: 800, margin: 1, errorCorrectionLevel: settings.qrLevel });
  }

  if (settings.exportBackground === "white") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, totalWidth, totalHeight);
  } else {
    ctx.clearRect(0, 0, totalWidth, totalHeight);
  }

  if (settings.showGradientBg) {
    const gradient = ctx.createLinearGradient(padding, padding, padding + exportQrSize, padding + exportQrSize);
    gradient.addColorStop(0, settings.bgColor);
    gradient.addColorStop(1, lightenColor(settings.bgColor, 20));
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = settings.bgColor;
  }
  ctx.fillRect(padding, padding, exportQrSize, exportQrSize);

  if (settings.frameStyle !== "none") {
    ctx.strokeStyle = settings.accentColor;
    ctx.lineWidth = 3;
    const frameMargin = frameInset;
    const frameRadius = settings.frameStyle === "rounded" || (settings.frameStyle === "shadow" && settings.shadowRounded) ? 24 : 12;

    switch (settings.frameStyle) {
      case "simple":
      case "rounded":
        drawRoundedRect(
          ctx,
          frameMargin,
          frameMargin,
          totalWidth - frameMargin * 2,
          totalHeight - frameMargin * 2,
          settings.frameStyle === "rounded" ? frameRadius : 0
        );
        ctx.stroke();
        break;
      case "double":
        ctx.lineWidth = 2;
        drawRoundedRect(ctx, frameMargin, frameMargin, totalWidth - frameMargin * 2, totalHeight - frameMargin * 2, frameRadius);
        ctx.stroke();
        drawRoundedRect(
          ctx,
          frameMargin + 5,
          frameMargin + 5,
          totalWidth - frameMargin * 2 - 10,
          totalHeight - frameMargin * 2 - 10,
          Math.max(0, frameRadius - 5)
        );
        ctx.stroke();
        break;
      case "dashed":
        ctx.setLineDash([8, 4]);
        drawRoundedRect(ctx, frameMargin, frameMargin, totalWidth - frameMargin * 2, totalHeight - frameMargin * 2, frameRadius);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      case "shadow": {
        const shadowFrameWidth = totalWidth - frameMargin * 2 - settings.shadowDepth;
        const shadowFrameHeight = totalHeight - frameMargin * 2 - settings.shadowDepth;
        ctx.fillStyle = settings.accentColor;
        drawRoundedRect(
          ctx,
          frameMargin + settings.shadowDepth,
          frameMargin + settings.shadowDepth,
          shadowFrameWidth,
          shadowFrameHeight,
          settings.shadowRounded ? frameRadius : 0
        );
        ctx.fill();
        ctx.fillStyle = settings.bgColor;
        drawRoundedRect(
          ctx,
          frameMargin,
          frameMargin,
          shadowFrameWidth,
          shadowFrameHeight,
          settings.shadowRounded ? frameRadius : 0
        );
        ctx.fill();
        drawRoundedRect(
          ctx,
          frameMargin,
          frameMargin,
          shadowFrameWidth,
          shadowFrameHeight,
          settings.shadowRounded ? frameRadius : 0
        );
        ctx.stroke();
        break;
      }
      case "corners": {
        const cl = 20;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(frameMargin, frameMargin + cl);
        ctx.lineTo(frameMargin, frameMargin);
        ctx.lineTo(frameMargin + cl, frameMargin);
        ctx.moveTo(totalWidth - frameMargin - cl, frameMargin);
        ctx.lineTo(totalWidth - frameMargin, frameMargin);
        ctx.lineTo(totalWidth - frameMargin, frameMargin + cl);
        ctx.moveTo(frameMargin, totalHeight - frameMargin - cl);
        ctx.lineTo(frameMargin, totalHeight - frameMargin);
        ctx.lineTo(frameMargin + cl, totalHeight - frameMargin);
        ctx.moveTo(totalWidth - frameMargin - cl, totalHeight - frameMargin);
        ctx.lineTo(totalWidth - frameMargin, totalHeight - frameMargin);
        ctx.lineTo(totalWidth - frameMargin, totalHeight - frameMargin - cl);
        ctx.stroke();
        break;
      }
      default:
        break;
    }
  }

  const qrCanvas = document.createElement("canvas");
  qrCanvas.width = exportQrSize;
  qrCanvas.height = exportQrSize;
  const qrCtx = qrCanvas.getContext("2d");
  if (!qrCtx) {
    return QRCode.toDataURL(params.url, { width: 800, margin: 1, errorCorrectionLevel: settings.qrLevel });
  }

  const qrMargin = Math.max(8, Math.round(exportQrSize * 0.02));
  const moduleCount = qrMatrix.length;
  const moduleSize = (exportQrSize - qrMargin * 2) / moduleCount;

  qrCtx.clearRect(0, 0, exportQrSize, exportQrSize);
  qrCtx.fillStyle = settings.fgColor;

  drawPositionMarkers(
    qrCtx,
    moduleCount,
    moduleSize,
    qrMargin,
    settings.fgColor,
    settings.markerBorderShape,
    settings.markerCenterShape
  );

  if (settings.dotShape === "rounded") {
    drawConnectedRoundedModules(qrCtx, qrMatrix, moduleCount, moduleSize, qrMargin);
  } else {
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qrMatrix[row][col] && !isPositionMarker(row, col, moduleCount)) {
          const x = qrMargin + col * moduleSize;
          const y = qrMargin + row * moduleSize;
          const s = moduleSize * 0.85;
          const offset = moduleSize * 0.075;
          drawModule(qrCtx, x + offset, y + offset, s, settings.dotShape);
        }
      }
    }
  }

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qrCanvas, padding, padding, exportQrSize, exportQrSize);

  const centerContent = settings.centerIcon === "custom"
    ? settings.centerText.trim()
    : (CENTER_ICON_MAP[settings.centerIcon] ?? "");

  if (settings.centerIcon !== "none" && centerContent) {
    const isCustomText = settings.centerIcon === "custom";
    const fontSize = isCustomText
      ? Math.max(8, Math.min(exportQrSize / 6, (exportQrSize / 4) / Math.max(1, centerContent.length / 3)) * settings.centerTextSize)
      : exportQrSize / 5;

    ctx.font = isCustomText ? `bold ${fontSize}px sans-serif` : `${fontSize}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = settings.bgColor;
    const textWidth = ctx.measureText(centerContent).width;
    const textHeight2 = fontSize;
    const bgWidth = textWidth + settings.centerPaddingH * 2;
    const bgHeight = textHeight2 + settings.centerPaddingV * 2;

    drawCenterBackground(ctx, padding + exportQrSize / 2, padding + exportQrSize / 2, bgWidth, bgHeight, settings.centerBgShape);

    ctx.fillStyle = isCustomText ? settings.centerTextColor : settings.fgColor;
    ctx.fillText(centerContent, padding + exportQrSize / 2, padding + exportQrSize / 2 + 2);
  }

  let textY = padding + exportQrSize + 25;
  ctx.textAlign = "center";

  if (settings.includeLabel) {
    ctx.font = "bold 16px sans-serif";
    ctx.fillStyle = settings.fgColor;
    ctx.fillText(params.deviceName, totalWidth / 2, textY);
    textY += 22;
  }

  if (settings.overlayText) {
    ctx.font = `${primaryTextFontSize}px sans-serif`;
    ctx.fillStyle = settings.accentColor;
    ctx.fillText(settings.overlayText, totalWidth / 2, textY);
    textY += Math.max(18, primaryTextFontSize + 4);
  }

  if (settings.secondaryText) {
    ctx.font = `${secondaryTextFontSize}px sans-serif`;
    ctx.fillStyle = settings.fgColor;
    ctx.fillText(settings.secondaryText, totalWidth / 2, textY);
  }

  return exportCanvas.toDataURL("image/png");
}
