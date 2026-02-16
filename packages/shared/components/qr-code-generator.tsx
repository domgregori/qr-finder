"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Check, Download, FileImage, FileType2, Palette, Save, Settings, Type } from "lucide-react";
import { toast } from "sonner";

interface QRCodeGeneratorProps {
  url: string;
  deviceName: string;
  initialSettings?: Partial<QrSettings> | null;
  onSettingsChange?: (settings: QrSettings) => void;
  showThemeSave?: boolean;
  profileBlurb?: string | null;
  profileAvatarUrl?: string | null;
  profileAvatarShape?: "circle" | "rounded" | "square" | null;
}

export type QrSettings = {
  size: number;
  fgColor: string;
  bgColor: string;
  accentColor: string;
  overlayText: string;
  secondaryText: string;
  primaryTextScale: number;
  secondaryTextScale: number;
  includeLabel: boolean;
  labelPadding: number;
  framePadding: number;
  frameThickness: number;
  frameRadius: number;
  frameDash: number;
  shadowColor: string;
  qrLevel: "L" | "M" | "Q" | "H";
  activeTheme: string | null;
  frameStyle: string;
  centerIcon: string;
  centerText: string;
  centerTextSize: number;
  centerTextColor: string;
  showGradientBg: boolean;
  gradientAngle: number;
  dotShape: string;
  markerBorderShape: string;
  markerCenterShape: string;
  centerBgShape: string;
  centerPaddingH: number;
  centerPaddingV: number;
  shadowDepth: number;
  shadowRounded: boolean;
  exportBackground: "white" | "transparent";
};

type ThemePreset = {
  name: string;
  fgColor: string;
  bgColor: string;
  accentColor: string;
};

const THEME_PRESETS: ThemePreset[] = [
  { name: "Classic", fgColor: "#111111", bgColor: "#ffffff", accentColor: "#111111" },
  { name: "Ocean", fgColor: "#0077b6", bgColor: "#caf0f8", accentColor: "#023e8a" },
  { name: "Forest", fgColor: "#1b4332", bgColor: "#d8f3dc", accentColor: "#2d6a4f" },
  { name: "Warm", fgColor: "#7c2d12", bgColor: "#ffedd5", accentColor: "#ea580c" },
  { name: "Slate", fgColor: "#0f172a", bgColor: "#e2e8f0", accentColor: "#334155" },
];

const DEFAULT_SETTINGS: QrSettings = {
  size: 320,
  fgColor: "#111111",
  bgColor: "#ffffff",
  accentColor: "#111111",
  overlayText: "",
  secondaryText: "",
  primaryTextScale: 1,
  secondaryTextScale: 1,
  includeLabel: true,
  labelPadding: 8,
  framePadding: 10,
  frameThickness: 3,
  frameRadius: 22,
  frameDash: 8,
  shadowColor: "#111111",
  qrLevel: "H",
  activeTheme: null,
  frameStyle: "rounded",
  centerIcon: "none",
  centerText: "",
  centerTextSize: 1,
  centerTextColor: "#111111",
  showGradientBg: false,
  gradientAngle: 135,
  dotShape: "square",
  markerBorderShape: "square",
  markerCenterShape: "square",
  centerBgShape: "rounded",
  centerPaddingH: 12,
  centerPaddingV: 8,
  shadowDepth: 8,
  shadowRounded: false,
  exportBackground: "white",
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const sanitizeFileName = (value: string) => {
  const normalized = value.trim().replace(/\s+/g, "_");
  return normalized.length > 0 ? normalized.replace(/[^a-zA-Z0-9_-]/g, "") : "device_qr";
};

export function QRCodeGenerator({
  url,
  deviceName,
  initialSettings,
  onSettingsChange,
  showThemeSave = true,
}: QRCodeGeneratorProps) {
  const initializedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [size, setSize] = useState(DEFAULT_SETTINGS.size);
  const [fgColor, setFgColor] = useState(DEFAULT_SETTINGS.fgColor);
  const [bgColor, setBgColor] = useState(DEFAULT_SETTINGS.bgColor);
  const [accentColor, setAccentColor] = useState(DEFAULT_SETTINGS.accentColor);
  const [overlayText, setOverlayText] = useState(DEFAULT_SETTINGS.overlayText);
  const [secondaryText, setSecondaryText] = useState(DEFAULT_SETTINGS.secondaryText);
  const [primaryTextScale, setPrimaryTextScale] = useState(DEFAULT_SETTINGS.primaryTextScale);
  const [secondaryTextScale, setSecondaryTextScale] = useState(DEFAULT_SETTINGS.secondaryTextScale);
  const [includeLabel, setIncludeLabel] = useState(DEFAULT_SETTINGS.includeLabel);
  const [labelPadding, setLabelPadding] = useState(DEFAULT_SETTINGS.labelPadding);
  const [framePadding, setFramePadding] = useState(DEFAULT_SETTINGS.framePadding);
  const [frameThickness, setFrameThickness] = useState(DEFAULT_SETTINGS.frameThickness);
  const [frameRadius, setFrameRadius] = useState(DEFAULT_SETTINGS.frameRadius);
  const [frameDash, setFrameDash] = useState(DEFAULT_SETTINGS.frameDash);
  const [shadowColor, setShadowColor] = useState(DEFAULT_SETTINGS.shadowColor);
  const [shadowDepth, setShadowDepth] = useState(DEFAULT_SETTINGS.shadowDepth);
  const [qrLevel, setQrLevel] = useState<"L" | "M" | "Q" | "H">(DEFAULT_SETTINGS.qrLevel);
  const [frameStyle, setFrameStyle] = useState(DEFAULT_SETTINGS.frameStyle);
  const [showGradientBg, setShowGradientBg] = useState(DEFAULT_SETTINGS.showGradientBg);
  const [gradientAngle, setGradientAngle] = useState(DEFAULT_SETTINGS.gradientAngle);
  const [centerText, setCenterText] = useState(DEFAULT_SETTINGS.centerText);
  const [centerTextColor, setCenterTextColor] = useState(DEFAULT_SETTINGS.centerTextColor);
  const [centerTextSize, setCenterTextSize] = useState(DEFAULT_SETTINGS.centerTextSize);
  const [dotShape, setDotShape] = useState(DEFAULT_SETTINGS.dotShape);
  const [markerBorderShape, setMarkerBorderShape] = useState(DEFAULT_SETTINGS.markerBorderShape);
  const [markerCenterShape, setMarkerCenterShape] = useState(DEFAULT_SETTINGS.markerCenterShape);
  const [exportBackground, setExportBackground] = useState<"white" | "transparent">(DEFAULT_SETTINGS.exportBackground);
  const [activeTheme, setActiveTheme] = useState<string | null>(DEFAULT_SETTINGS.activeTheme);

  const [customThemes, setCustomThemes] = useState<Array<{ id: string; name: string; settings: QrSettings }>>([]);
  const [themeName, setThemeName] = useState("");
  const [savingTheme, setSavingTheme] = useState(false);
  const [svgMarkup, setSvgMarkup] = useState("");
  const [copiedSvg, setCopiedSvg] = useState(false);
  const previousAccentRef = useRef(DEFAULT_SETTINGS.accentColor);

  useEffect(() => {
    const loadThemes = async () => {
      try {
        const res = await fetch("/api/qr-themes");
        if (!res.ok) return;
        const data = await res.json();
        setCustomThemes(data ?? []);
      } catch (error) {
        console.error("Failed to load themes:", error);
      }
    };
    void loadThemes();
  }, []);

  useEffect(() => {
    if (!initialSettings || initializedRef.current) return;
    if (initialSettings.size !== undefined) setSize(initialSettings.size);
    if (initialSettings.fgColor) setFgColor(initialSettings.fgColor);
    if (initialSettings.bgColor) setBgColor(initialSettings.bgColor);
    if (initialSettings.accentColor) setAccentColor(initialSettings.accentColor);
    if (initialSettings.overlayText !== undefined) setOverlayText(initialSettings.overlayText);
    if (initialSettings.secondaryText !== undefined) setSecondaryText(initialSettings.secondaryText);
    if (initialSettings.primaryTextScale !== undefined) setPrimaryTextScale(initialSettings.primaryTextScale);
    if (initialSettings.secondaryTextScale !== undefined) setSecondaryTextScale(initialSettings.secondaryTextScale);
    if (initialSettings.includeLabel !== undefined) setIncludeLabel(initialSettings.includeLabel);
    if (initialSettings.labelPadding !== undefined) setLabelPadding(initialSettings.labelPadding);
    if (initialSettings.framePadding !== undefined) setFramePadding(initialSettings.framePadding);
    if (initialSettings.frameThickness !== undefined) setFrameThickness(initialSettings.frameThickness);
    if (initialSettings.frameRadius !== undefined) setFrameRadius(initialSettings.frameRadius);
    if (initialSettings.frameDash !== undefined) setFrameDash(initialSettings.frameDash);
    if (initialSettings.shadowColor) setShadowColor(initialSettings.shadowColor);
    if (initialSettings.shadowDepth !== undefined) setShadowDepth(initialSettings.shadowDepth);
    if (initialSettings.qrLevel) setQrLevel(initialSettings.qrLevel);
    if (initialSettings.frameStyle) setFrameStyle(initialSettings.frameStyle);
    if (initialSettings.centerText !== undefined) setCenterText(initialSettings.centerText);
    if (initialSettings.centerTextColor) setCenterTextColor(initialSettings.centerTextColor);
    if (initialSettings.centerTextSize !== undefined) setCenterTextSize(initialSettings.centerTextSize);
    if (initialSettings.dotShape) setDotShape(initialSettings.dotShape);
    if (initialSettings.markerBorderShape) setMarkerBorderShape(initialSettings.markerBorderShape);
    if (initialSettings.markerCenterShape) setMarkerCenterShape(initialSettings.markerCenterShape);
    if (initialSettings.showGradientBg !== undefined) setShowGradientBg(initialSettings.showGradientBg);
    if (initialSettings.gradientAngle !== undefined) setGradientAngle(initialSettings.gradientAngle);
    if (initialSettings.exportBackground) setExportBackground(initialSettings.exportBackground);
    if (initialSettings.activeTheme !== undefined) setActiveTheme(initialSettings.activeTheme ?? null);
    previousAccentRef.current = initialSettings.accentColor ?? accentColor;
    initializedRef.current = true;
  }, [initialSettings]);

  useEffect(() => {
    // Keep shadow color in sync with accent unless user set a custom shadow color.
    if (shadowColor === previousAccentRef.current) {
      setShadowColor(accentColor);
    }
    previousAccentRef.current = accentColor;
  }, [accentColor, shadowColor]);

  const settings = useMemo<QrSettings>(
    () => ({
      ...DEFAULT_SETTINGS,
      size,
      fgColor,
      bgColor,
      accentColor,
      overlayText,
      secondaryText,
      primaryTextScale,
      secondaryTextScale,
      includeLabel,
      labelPadding,
      framePadding,
      frameThickness,
      frameRadius,
      frameDash,
      shadowColor,
      shadowDepth,
      qrLevel,
      activeTheme,
      frameStyle,
      centerText,
      centerTextColor,
      centerTextSize,
      dotShape,
      markerBorderShape,
      markerCenterShape,
      showGradientBg,
      gradientAngle,
      exportBackground,
    }),
    [
      size,
      fgColor,
      bgColor,
      accentColor,
      overlayText,
      secondaryText,
      primaryTextScale,
      secondaryTextScale,
      includeLabel,
      labelPadding,
      framePadding,
      frameThickness,
      frameRadius,
      frameDash,
      shadowColor,
      shadowDepth,
      qrLevel,
      activeTheme,
      frameStyle,
      centerText,
      centerTextColor,
      centerTextSize,
      dotShape,
      markerBorderShape,
      markerCenterShape,
      showGradientBg,
      gradientAngle,
      exportBackground,
    ]
  );

  useEffect(() => {
    if (!onSettingsChange) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => onSettingsChange(settings), 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [settings, onSettingsChange]);

  const isMarkerCell = (row: number, col: number, moduleCount: number) => {
    const inTopLeft = row >= 0 && row <= 6 && col >= 0 && col <= 6;
    const inTopRight = row >= 0 && row <= 6 && col >= moduleCount - 7 && col <= moduleCount - 1;
    const inBottomLeft = row >= moduleCount - 7 && row <= moduleCount - 1 && col >= 0 && col <= 6;
    return inTopLeft || inTopRight || inBottomLeft;
  };

  const markerRingSvg = (x: number, y: number) => {
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

  const markerCenterSvg = (x: number, y: number) => {
    if (markerCenterShape === "circle") {
      return `<circle cx="${x + 3.5}" cy="${y + 3.5}" r="1.5" fill="${escapeXml(fgColor)}"/>`;
    }
    if (markerCenterShape === "rounded") {
      return `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.7" ry="0.7" fill="${escapeXml(fgColor)}"/>`;
    }
    return `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="${escapeXml(fgColor)}"/>`;
  };

  const drawDot = (x: number, y: number) => {
    if (dotShape === "circle") {
      return `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.42" fill="${escapeXml(fgColor)}"/>`;
    }
    if (dotShape === "rounded") {
      return `<rect x="${x + 0.05}" y="${y + 0.05}" width="0.9" height="0.9" rx="0.26" ry="0.26" fill="${escapeXml(fgColor)}"/>`;
    }
    return `<rect x="${x + 0.05}" y="${y + 0.05}" width="0.9" height="0.9" fill="${escapeXml(fgColor)}"/>`;
  };

  const buildStyledSvg = async () => {
    const qr = QRCode.create(url, { errorCorrectionLevel: qrLevel });
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
      .map((pos) => `${markerRingSvg(pos.x, pos.y)}${markerCenterSvg(pos.x, pos.y)}`)
      .join("");

    let dotSvg = "";
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (modules.get(row, col) !== 1) continue;
        if (isMarkerCell(row, col, moduleCount)) continue;
        dotSvg += drawDot(margin + col, margin + row);
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
      (overlayText.trim() ? 1 : 0) +
      (secondaryText.trim() ? 1 : 0);

    const labelBlockHeight = labelCount === 0 ? 0 : 18 + (includeLabel ? primarySize + 6 : 0) + (overlayText.trim() ? primarySize + 4 : 0) + (secondaryText.trim() ? secondarySize + 4 : 0);

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

    const centerTextTrimmed = centerText.trim();
    const centerTextEnabled = centerTextTrimmed.length > 0;
    const centerFontSize = Math.max(10, size / 14) * centerTextSize;
    const centerBoxW = Math.max(64, centerTextTrimmed.length * (centerFontSize * 0.58) + 20);
    const centerBoxH = Math.max(28, centerFontSize + 12);
    const centerBoxX = qrLeft + qrSize / 2 - centerBoxW / 2;
    const centerBoxY = qrTop + qrSize / 2 - centerBoxH / 2;

    const frameOffset = frameStyle === "none" ? 0 : effectiveFramePadding;
    const labelTopGap = 16 + frameOffset + Math.max(0, labelPadding);
    let labelY = qrBottom + labelTopGap;
    let labelSvg = "";

    if (includeLabel) {
      labelSvg += `<text x="${width / 2}" y="${labelY}" text-anchor="middle" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI" font-weight="700" font-size="${Math.round(primarySize)}" fill="${escapeXml(fgColor)}">${escapeXml(deviceName)}</text>`;
      labelY += primarySize + 8;
    }
    if (overlayText.trim()) {
      labelSvg += `<text x="${width / 2}" y="${labelY}" text-anchor="middle" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI" font-weight="700" font-size="${Math.round(primarySize)}" fill="${escapeXml(accentColor)}">${escapeXml(overlayText.trim())}</text>`;
      labelY += primarySize + 6;
    }
    if (secondaryText.trim()) {
      labelSvg += `<text x="${width / 2}" y="${labelY}" text-anchor="middle" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI" font-weight="500" font-size="${Math.round(secondarySize)}" fill="${escapeXml(fgColor)}" opacity="0.9">${escapeXml(secondaryText.trim())}</text>`;
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
  ${centerTextEnabled ? `<rect x="${centerBoxX}" y="${centerBoxY}" width="${centerBoxW}" height="${centerBoxH}" rx="${Math.round(centerBoxH * 0.25)}" ry="${Math.round(centerBoxH * 0.25)}" fill="${escapeXml(bgColor)}"/><text x="${qrLeft + qrSize / 2}" y="${qrTop + qrSize / 2 + centerFontSize * 0.35}" text-anchor="middle" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI" font-weight="700" font-size="${Math.round(centerFontSize)}" fill="${escapeXml(centerTextColor)}">${escapeXml(centerTextTrimmed)}</text>` : ""}
  ${labelSvg}
</svg>`.trim();
  };

  useEffect(() => {
    let cancelled = false;

    const renderPreview = async () => {
      try {
        const svg = await buildStyledSvg();
        if (!cancelled) setSvgMarkup(svg);
      } catch (error) {
        console.error("Failed to generate SVG preview:", error);
      }
    };

    void renderPreview();

    return () => {
      cancelled = true;
    };
  }, [settings, url, deviceName]);

  const downloadSvg = async () => {
    try {
      const svg = await buildStyledSvg();
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${sanitizeFileName(deviceName)}_qr.svg`;
      link.click();
      URL.revokeObjectURL(objectUrl);
      toast.success("SVG downloaded");
    } catch (error) {
      console.error("SVG download failed:", error);
      toast.error("Failed to download SVG");
    }
  };

  const downloadPng = async () => {
    try {
      const svg = await buildStyledSvg();
      const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const objectUrl = URL.createObjectURL(svgBlob);
      const image = new Image();

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("SVG image load failed"));
        image.src = objectUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("2D context unavailable");

      if (exportBackground === "white") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(image, 0, 0);
      URL.revokeObjectURL(objectUrl);

      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = `${sanitizeFileName(deviceName)}_qr.png`;
      link.click();
      toast.success("PNG downloaded");
    } catch (error) {
      console.error("PNG download failed:", error);
      toast.error("Failed to download PNG");
    }
  };

  const copySvgToClipboard = async () => {
    try {
      const svg = await buildStyledSvg();
      await navigator.clipboard.writeText(svg);
      setCopiedSvg(true);
      setTimeout(() => setCopiedSvg(false), 1500);
      toast.success("SVG markup copied");
    } catch (error) {
      console.error("Copy SVG failed:", error);
      toast.error("Failed to copy SVG markup");
    }
  };

  const applyTheme = (theme: ThemePreset) => {
    setFgColor(theme.fgColor);
    setBgColor(theme.bgColor);
    setAccentColor(theme.accentColor);
    setActiveTheme(theme.name);
  };

  const applyThemeSettings = (themeSettings: Partial<QrSettings>, name: string) => {
    if (themeSettings.fgColor) setFgColor(themeSettings.fgColor);
    if (themeSettings.bgColor) setBgColor(themeSettings.bgColor);
    if (themeSettings.accentColor) setAccentColor(themeSettings.accentColor);
    if (themeSettings.overlayText !== undefined) setOverlayText(themeSettings.overlayText);
    if (themeSettings.secondaryText !== undefined) setSecondaryText(themeSettings.secondaryText);
    if (themeSettings.primaryTextScale !== undefined) setPrimaryTextScale(themeSettings.primaryTextScale);
    if (themeSettings.secondaryTextScale !== undefined) setSecondaryTextScale(themeSettings.secondaryTextScale);
    if (themeSettings.includeLabel !== undefined) setIncludeLabel(themeSettings.includeLabel);
    if (themeSettings.labelPadding !== undefined) setLabelPadding(themeSettings.labelPadding);
    if (themeSettings.framePadding !== undefined) setFramePadding(themeSettings.framePadding);
    if (themeSettings.frameThickness !== undefined) setFrameThickness(themeSettings.frameThickness);
    if (themeSettings.frameRadius !== undefined) setFrameRadius(themeSettings.frameRadius);
    if (themeSettings.frameDash !== undefined) setFrameDash(themeSettings.frameDash);
    if (themeSettings.shadowColor) setShadowColor(themeSettings.shadowColor);
    if (themeSettings.shadowDepth !== undefined) setShadowDepth(themeSettings.shadowDepth);
    if (themeSettings.qrLevel) setQrLevel(themeSettings.qrLevel);
    if (themeSettings.frameStyle) setFrameStyle(themeSettings.frameStyle);
    if (themeSettings.centerText !== undefined) setCenterText(themeSettings.centerText);
    if (themeSettings.centerTextColor) setCenterTextColor(themeSettings.centerTextColor);
    if (themeSettings.centerTextSize !== undefined) setCenterTextSize(themeSettings.centerTextSize);
    if (themeSettings.dotShape) setDotShape(themeSettings.dotShape);
    if (themeSettings.markerBorderShape) setMarkerBorderShape(themeSettings.markerBorderShape);
    if (themeSettings.markerCenterShape) setMarkerCenterShape(themeSettings.markerCenterShape);
    if (themeSettings.showGradientBg !== undefined) setShowGradientBg(themeSettings.showGradientBg);
    if (themeSettings.gradientAngle !== undefined) setGradientAngle(themeSettings.gradientAngle);
    if (themeSettings.exportBackground) setExportBackground(themeSettings.exportBackground);
    setActiveTheme(name);
  };

  const saveTheme = async () => {
    const name = themeName.trim();
    if (!name) {
      toast.error("Theme name is required");
      return;
    }

    setSavingTheme(true);
    try {
      const res = await fetch("/api/qr-themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, settings }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error ?? "Failed to save theme");
        return;
      }

      const latestThemes = await fetch("/api/qr-themes").then((r) => (r.ok ? r.json() : []));
      setCustomThemes(latestThemes ?? []);
      setThemeName("");
      toast.success("Theme saved");
    } catch (error) {
      console.error("Save theme failed:", error);
      toast.error("Failed to save theme");
    } finally {
      setSavingTheme(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Live SVG Preview</h3>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            Vector Output
          </span>
        </div>

        <div className="overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
          <div
            className="mx-auto max-w-full [&_svg]:h-auto [&_svg]:max-w-full"
            dangerouslySetInnerHTML={{ __html: svgMarkup }}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            onClick={downloadSvg}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <FileType2 size={16} /> Download SVG
          </button>
          <button
            onClick={downloadPng}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            <FileImage size={16} /> Download PNG
          </button>
          <button
            onClick={copySvgToClipboard}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            {copiedSvg ? <Check size={16} /> : <Download size={16} />} {copiedSvg ? "Copied" : "Copy SVG"}
          </button>
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">QR Settings</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Designed to produce clean SVG exports first, with optional PNG output.</p>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</label>
          <div className="flex flex-wrap gap-2">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyTheme(preset)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${activeTheme === preset.name ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900" : "border-gray-300 dark:border-gray-600"}`}
                style={{ backgroundColor: preset.bgColor, color: preset.fgColor }}
              >
                {preset.name}
              </button>
            ))}
            {customThemes.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => applyThemeSettings(theme.settings, theme.name)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${activeTheme === theme.name ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900" : "border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"}`}
              >
                {theme.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 inline-flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300"><Settings size={14} /> QR Size</label>
            <input type="range" min="220" max="600" step="10" value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-full" />
            <p className="text-xs text-gray-500 dark:text-gray-400">{size}px</p>
          </div>
          <div>
            <label className="mb-1 inline-flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">Error Level</label>
            <select
              value={qrLevel}
              onChange={(e) => setQrLevel(e.target.value as "L" | "M" | "Q" | "H")}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="L">L (7%)</option>
              <option value="M">M (15%)</option>
              <option value="Q">Q (25%)</option>
              <option value="H">H (30%)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Dot shape</label>
            <select
              value={dotShape}
              onChange={(e) => setDotShape(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="square">Square</option>
              <option value="rounded">Rounded</option>
              <option value="circle">Circle</option>
            </select>
          </div>
          <div>
            <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Corner border</label>
            <select
              value={markerBorderShape}
              onChange={(e) => setMarkerBorderShape(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="square">Square</option>
              <option value="rounded">Rounded</option>
              <option value="circle">Circle</option>
            </select>
          </div>
          <div>
            <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Corner center</label>
            <select
              value={markerCenterShape}
              onChange={(e) => setMarkerCenterShape(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="square">Square</option>
              <option value="rounded">Rounded</option>
              <option value="circle">Circle</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 inline-flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300"><Palette size={14} /> QR</label>
            <input type="color" value={fgColor} onChange={(e) => { setFgColor(e.target.value); setActiveTheme(null); }} className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-600" />
          </div>
          <div>
            <label className="mb-1 inline-flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300"><Palette size={14} /> BG</label>
            <input type="color" value={bgColor} onChange={(e) => { setBgColor(e.target.value); setActiveTheme(null); }} className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-600" />
          </div>
          <div>
            <label className="mb-1 inline-flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300"><Palette size={14} /> Accent</label>
            <input type="color" value={accentColor} onChange={(e) => { setAccentColor(e.target.value); setActiveTheme(null); }} className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-600" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Frame</label>
            <select
              value={frameStyle}
              onChange={(e) => setFrameStyle(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="none">None</option>
              <option value="simple">Simple</option>
              <option value="rounded">Rounded</option>
              <option value="double">Double</option>
              <option value="dashed">Dashed</option>
              <option value="shadow">Shadow Box (3D)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Export Background</label>
            <select
              value={exportBackground}
              onChange={(e) => setExportBackground(e.target.value as "white" | "transparent")}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="white">White</option>
              <option value="transparent">Transparent</option>
            </select>
          </div>
        </div>
        {frameStyle !== "none" && (
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Frame thickness</label>
              <input
                type="range"
                min="1"
                max="12"
                step="1"
                value={frameThickness}
                onChange={(e) => setFrameThickness(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">{frameThickness}px</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Frame padding</label>
              <input
                type="range"
                min="0"
                max="40"
                step="1"
                value={framePadding}
                onChange={(e) => setFramePadding(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">{framePadding}px</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Corner radius</label>
              <input
                type="range"
                min="0"
                max="64"
                step="1"
                value={frameRadius}
                onChange={(e) => setFrameRadius(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">{frameRadius}px</p>
            </div>
            {frameStyle === "dashed" && (
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Dash size</label>
                <input
                  type="range"
                  min="2"
                  max="24"
                  step="1"
                  value={frameDash}
                  onChange={(e) => setFrameDash(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">{frameDash}px</p>
              </div>
            )}
            {frameStyle === "shadow" && (
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Shadow depth</label>
                <input
                  type="range"
                  min="2"
                  max="24"
                  step="1"
                  value={shadowDepth}
                  onChange={(e) => setShadowDepth(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">{shadowDepth}px</p>
              </div>
            )}
            {frameStyle === "shadow" && (
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Shadow color</label>
                <input
                  type="color"
                  value={shadowColor}
                  onChange={(e) => setShadowColor(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-600"
                />
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={showGradientBg} onChange={(e) => setShowGradientBg(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
            Gradient background
          </label>
          {showGradientBg && (
            <div>
              <input type="range" min="0" max="360" value={gradientAngle} onChange={(e) => setGradientAngle(Number(e.target.value))} className="w-full" />
              <p className="text-xs text-gray-500 dark:text-gray-400">{gradientAngle}°</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={includeLabel} onChange={(e) => setIncludeLabel(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
            Show device name label
          </label>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Text padding from frame
            </label>
            <input
              type="range"
              min="0"
              max="40"
              step="1"
              value={labelPadding}
              onChange={(e) => setLabelPadding(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {labelPadding}px extra spacing
            </p>
          </div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Primary Text</label>
          <input value={overlayText} onChange={(e) => setOverlayText(e.target.value)} maxLength={64} className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" placeholder="e.g. I'M LOST" />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Secondary Text</label>
          <input value={secondaryText} onChange={(e) => setSecondaryText(e.target.value)} maxLength={96} className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" placeholder="e.g. Help get me home!" />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Center Text</label>
          <input value={centerText} onChange={(e) => setCenterText(e.target.value)} maxLength={24} className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" placeholder="e.g. LOST" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 inline-flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300"><Type size={14} /> Center color</label>
              <input type="color" value={centerTextColor} onChange={(e) => setCenterTextColor(e.target.value)} className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-600" />
              <button
                type="button"
                onClick={() => setCenterTextColor(accentColor)}
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Use Accent Color
              </button>
            </div>
            <div>
              <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Center size</label>
              <input type="range" min="0.7" max="2" step="0.1" value={centerTextSize} onChange={(e) => setCenterTextSize(Number(e.target.value))} className="w-full" />
            </div>
          </div>
        </div>

        {showThemeSave && (
          <div className="space-y-2 border-t border-gray-200 pt-4 dark:border-gray-700">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Save as Theme</label>
            <div className="flex gap-2">
              <input
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
                placeholder="Theme name"
                className="h-10 flex-1 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
              <button
                onClick={saveTheme}
                disabled={savingTheme}
                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
              >
                <Save size={15} /> {savingTheme ? "Saving" : "Save"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
