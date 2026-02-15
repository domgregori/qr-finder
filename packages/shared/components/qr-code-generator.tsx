"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import QRCode from "qrcode";
import { Download, Settings, Palette, Type, Maximize2, Sparkles, Frame, Image as ImageIcon, Square, Circle } from "lucide-react";
import { toast } from "sonner";
import { generateStyledQrDataUrl } from "@shared/lib/qr-render";

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

// Preset themes
const THEMES = [
  { name: "Classic", fg: "#000000", bg: "#ffffff", accent: "#000000" },
  { name: "Ocean", fg: "#0077b6", bg: "#caf0f8", accent: "#023e8a" },
  { name: "Forest", fg: "#2d6a4f", bg: "#d8f3dc", accent: "#1b4332" },
  { name: "Sunset", fg: "#9d4edd", bg: "#ffc8dd", accent: "#c77dff" },
  { name: "Midnight", fg: "#e0e0e0", bg: "#1a1a2e", accent: "#7b2cbf" },
  { name: "Retro", fg: "#5f0f40", bg: "#fbf8cc", accent: "#9a031e" },
  { name: "Neon", fg: "#39ff14", bg: "#0d0d0d", accent: "#ff00ff" },
  { name: "Coral", fg: "#ff6b6b", bg: "#fff5f5", accent: "#ee5a5a" },
  { name: "Ice", fg: "#1d4ed8", bg: "#e0f2fe", accent: "#38bdf8" },
  { name: "Moss", fg: "#365314", bg: "#ecfccb", accent: "#84cc16" },
  { name: "Desert", fg: "#7c2d12", bg: "#ffedd5", accent: "#fb923c" },
  { name: "Slate", fg: "#0f172a", bg: "#e2e8f0", accent: "#64748b" },
  { name: "Berry", fg: "#7f1d1d", bg: "#fee2e2", accent: "#ef4444" },
];

// Frame styles
const FRAMES = [
  { id: "none", name: "None" },
  { id: "simple", name: "Simple Border" },
  { id: "rounded", name: "Rounded" },
  { id: "double", name: "Double Line" },
  { id: "dashed", name: "Dashed" },
  { id: "shadow", name: "Shadow Box" },
  { id: "gradient", name: "Gradient Border" },
  { id: "corners", name: "Corner Brackets" },
];

// QR module shapes (for data dots)
const DOT_SHAPES = [
  { id: "square", name: "Square", icon: "▪️" },
  { id: "rounded", name: "Rounded", icon: "▫️" },
  { id: "circle", name: "Circle", icon: "●" },
];

// Marker border shapes (outer ring of corner markers)
const MARKER_BORDER_SHAPES = [
  { id: "square", name: "Square", icon: "□" },
  { id: "rounded", name: "Rounded", icon: "▢" },
  { id: "circle", name: "Circle", icon: "○" },
];

// Marker center shapes (inner dot of corner markers)
const MARKER_CENTER_SHAPES = [
  { id: "square", name: "Square", icon: "■" },
  { id: "circle", name: "Circle", icon: "●" },
];

// Center background shapes
const CENTER_BG_SHAPES = [
  { id: "circle", name: "Circle" },
  { id: "rounded", name: "Rounded Square" },
  { id: "square", name: "Square" },
];

// Preview components for shape selectors
function DotPreview({ shape }: { shape: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" className="fill-current">
      {shape === "square" && (
        <>
          <rect x="2" y="2" width="7" height="7" />
          <rect x="11" y="2" width="7" height="7" />
          <rect x="2" y="11" width="7" height="7" />
          <rect x="19" y="11" width="7" height="7" />
          <rect x="11" y="19" width="7" height="7" />
          <rect x="19" y="19" width="7" height="7" />
        </>
      )}
      {shape === "rounded" && (
        <>
          {/* Connected flowing shape */}
          <path d="M5 2 h5 q3 0 3 3 v5 q0 3 -3 3 h-5 q-3 0 -3 -3 v-5 q0 -3 3 -3 z" />
          <path d="M18 11 h5 q3 0 3 3 v8 q0 3 -3 3 h-5 q-3 0 -3 -3 v-8 q0 -3 3 -3 z" />
          <rect x="2" y="19" width="7" height="7" rx="2" />
        </>
      )}
      {shape === "circle" && (
        <>
          <circle cx="5.5" cy="5.5" r="3.5" />
          <circle cx="14" cy="5.5" r="3.5" />
          <circle cx="5.5" cy="14" r="3.5" />
          <circle cx="22.5" cy="14" r="3.5" />
          <circle cx="14" cy="22.5" r="3.5" />
          <circle cx="22.5" cy="22.5" r="3.5" />
        </>
      )}
    </svg>
  );
}

function MarkerBorderPreview({ shape }: { shape: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" className="fill-current">
      {shape === "square" && (
        <path d="M2 2h20v20H2V2zm3 3v14h14V5H5z" fillRule="evenodd" />
      )}
      {shape === "rounded" && (
        <path d="M6 2C3.8 2 2 3.8 2 6v12c0 2.2 1.8 4 4 4h12c2.2 0 4-1.8 4-4V6c0-2.2-1.8-4-4-4H6zm0 3h12c.6 0 1 .4 1 1v12c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1V6c0-.6.4-1 1-1z" fillRule="evenodd" />
      )}
      {shape === "circle" && (
        <>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="7" className="fill-white dark:fill-gray-700" />
        </>
      )}
    </svg>
  );
}

function MarkerCenterPreview({ shape }: { shape: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" className="fill-current">
      {shape === "square" && <rect x="5" y="5" width="14" height="14" />}
      {shape === "circle" && <circle cx="12" cy="12" r="7" />}
    </svg>
  );
}

// Center icons/emojis
const CENTER_ICONS = [
  { id: "none", name: "None", emoji: "" },
  { id: "custom", name: "✏️ Custom Text", emoji: "" },
  { id: "pin", name: "📍 Location", emoji: "📍" },
  { id: "phone", name: "📱 Phone", emoji: "📱" },
  { id: "key", name: "🔑 Key", emoji: "🔑" },
  { id: "bag", name: "👜 Bag", emoji: "👜" },
  { id: "laptop", name: "💻 Laptop", emoji: "💻" },
  { id: "wallet", name: "👛 Wallet", emoji: "👛" },
  { id: "heart", name: "❤️ Heart", emoji: "❤️" },
  { id: "star", name: "⭐ Star", emoji: "⭐" },
  { id: "paw", name: "🐾 Pet", emoji: "🐾" },
];

export function QRCodeGenerator({ url, deviceName, initialSettings, onSettingsChange, showThemeSave = true, profileBlurb, profileAvatarUrl, profileAvatarShape }: QRCodeGeneratorProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState(200);
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [accentColor, setAccentColor] = useState("#000000");
  const [overlayText, setOverlayText] = useState("");
  const [secondaryText, setSecondaryText] = useState("");
  const [primaryTextScale, setPrimaryTextScale] = useState(1);
  const [secondaryTextScale, setSecondaryTextScale] = useState(1);
  const [includeLabel, setIncludeLabel] = useState(true);
  const [qrLevel, setQrLevel] = useState<"L" | "M" | "Q" | "H">("H");
  const [mounted, setMounted] = useState(false);
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const [frameStyle, setFrameStyle] = useState("none");
  const [centerIcon, setCenterIcon] = useState("none");
  const [centerText, setCenterText] = useState("");
  const [showGradientBg, setShowGradientBg] = useState(false);
  const [gradientAngle, setGradientAngle] = useState(135);
  // New customization options
  const [dotShape, setDotShape] = useState("rounded");
  const [markerBorderShape, setMarkerBorderShape] = useState("rounded");
  const [markerCenterShape, setMarkerCenterShape] = useState("circle");
  const [centerBgShape, setCenterBgShape] = useState("circle");
  const [centerPaddingH, setCenterPaddingH] = useState(8);
  const [centerPaddingV, setCenterPaddingV] = useState(8);
  const [centerTextSize, setCenterTextSize] = useState(1);
  const [centerTextColor, setCenterTextColor] = useState("#000000");
  const [centerTextColorLocked, setCenterTextColorLocked] = useState(true);
  const [fgHex, setFgHex] = useState(fgColor);
  const [bgHex, setBgHex] = useState(bgColor);
  const [accentHex, setAccentHex] = useState(accentColor);
  const [centerTextHex, setCenterTextHex] = useState(centerTextColor);
  const [shadowDepth, setShadowDepth] = useState(8);
  const [shadowRounded, setShadowRounded] = useState(false);
  const [exportBackground, setExportBackground] = useState<"white" | "transparent">("white");
  const [qrMatrix, setQrMatrix] = useState<boolean[][] | null>(null);
  const [customThemes, setCustomThemes] = useState<Array<{ id: string; name: string; settings: QrSettings }>>([]);
  const [themeName, setThemeName] = useState("");
  const [savingTheme, setSavingTheme] = useState(false);
  const initializedRef = useRef(false);
  const settingsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (centerTextColorLocked) {
      setCenterTextColor(accentColor);
    }
  }, [accentColor, centerTextColorLocked]);

  useEffect(() => {
    const loadThemes = async () => {
      try {
        const res = await fetch("/api/qr-themes");
        if (res.ok) {
          const data = await res.json();
          setCustomThemes(data ?? []);
        }
      } catch (error) {
        console.error("Failed to load themes:", error);
      }
    };
    loadThemes();
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
    if (initialSettings.qrLevel) setQrLevel(initialSettings.qrLevel);
    if (initialSettings.activeTheme !== undefined) setActiveTheme(initialSettings.activeTheme);
    if (initialSettings.frameStyle) setFrameStyle(initialSettings.frameStyle);
    if (initialSettings.centerIcon) setCenterIcon(initialSettings.centerIcon);
    if (initialSettings.centerText !== undefined) setCenterText(initialSettings.centerText);
    if (initialSettings.centerTextSize !== undefined) setCenterTextSize(initialSettings.centerTextSize);
    if (initialSettings.centerTextColor) {
      setCenterTextColor(initialSettings.centerTextColor);
      setCenterTextColorLocked(false);
    }
    if (initialSettings.showGradientBg !== undefined) setShowGradientBg(initialSettings.showGradientBg);
    if (initialSettings.gradientAngle !== undefined) setGradientAngle(initialSettings.gradientAngle);
    if (initialSettings.dotShape) setDotShape(initialSettings.dotShape);
    if (initialSettings.markerBorderShape) setMarkerBorderShape(initialSettings.markerBorderShape);
    if (initialSettings.markerCenterShape) setMarkerCenterShape(initialSettings.markerCenterShape);
    if (initialSettings.centerBgShape) setCenterBgShape(initialSettings.centerBgShape);
    if (initialSettings.centerPaddingH !== undefined) setCenterPaddingH(initialSettings.centerPaddingH);
    if (initialSettings.centerPaddingV !== undefined) setCenterPaddingV(initialSettings.centerPaddingV);
    if (initialSettings.shadowDepth !== undefined) setShadowDepth(initialSettings.shadowDepth);
    if (initialSettings.shadowRounded !== undefined) setShadowRounded(initialSettings.shadowRounded);
    if (initialSettings.exportBackground) setExportBackground(initialSettings.exportBackground);

    initializedRef.current = true;
  }, [initialSettings]);

  useEffect(() => setFgHex(fgColor), [fgColor]);
  useEffect(() => setBgHex(bgColor), [bgColor]);
  useEffect(() => setAccentHex(accentColor), [accentColor]);
  useEffect(() => setCenterTextHex(centerTextColor), [centerTextColor]);

  const normalizeHex = (value: string) => {
    const next = value.trim();
    if (!next.startsWith("#")) return null;
    if (/^#[0-9a-fA-F]{3}$/.test(next)) {
      return `#${next[1]}${next[1]}${next[2]}${next[2]}${next[3]}${next[3]}`;
    }
    if (/^#[0-9a-fA-F]{6}$/.test(next)) {
      return next;
    }
    return null;
  };

  const currentSettings = useMemo<QrSettings>(() => ({
    size,
    fgColor,
    bgColor,
    accentColor,
    overlayText,
    secondaryText,
    primaryTextScale,
    secondaryTextScale,
    includeLabel,
    qrLevel,
    activeTheme,
    frameStyle,
    centerIcon,
    centerText,
    centerTextSize,
    centerTextColor,
    showGradientBg,
    gradientAngle,
    dotShape,
    markerBorderShape,
    markerCenterShape,
    centerBgShape,
    centerPaddingH,
    centerPaddingV,
    shadowDepth,
    shadowRounded,
    exportBackground
  }), [
    size,
    fgColor,
    bgColor,
    accentColor,
    overlayText,
    secondaryText,
    primaryTextScale,
    secondaryTextScale,
    includeLabel,
    qrLevel,
    activeTheme,
    frameStyle,
    centerIcon,
    centerText,
    centerTextSize,
    centerTextColor,
    showGradientBg,
    gradientAngle,
    dotShape,
    markerBorderShape,
    markerCenterShape,
    centerBgShape,
    centerPaddingH,
    centerPaddingV,
    shadowDepth,
    shadowRounded,
    exportBackground
  ]);

  useEffect(() => {
    if (!onSettingsChange) return;
    if (settingsDebounceRef.current) {
      clearTimeout(settingsDebounceRef.current);
    }
    settingsDebounceRef.current = setTimeout(() => {
      onSettingsChange(currentSettings);
    }, 500);
    return () => {
      if (settingsDebounceRef.current) {
        clearTimeout(settingsDebounceRef.current);
      }
    };
  }, [currentSettings, onSettingsChange]);

  // Generate QR matrix when URL or level changes
  useEffect(() => {
    if (!url) return;
    try {
      const qr = QRCode.create(url, { errorCorrectionLevel: qrLevel });
      const modules = qr.modules;
      const matrix: boolean[][] = [];
      for (let row = 0; row < modules.size; row++) {
        const rowData: boolean[] = [];
        for (let col = 0; col < modules.size; col++) {
          rowData.push(modules.get(row, col) === 1);
        }
        matrix.push(rowData);
      }
      setQrMatrix(matrix);
    } catch (e) {
      console.error(e);
    }
  }, [url, qrLevel]);

  // Check if a position is part of position markers
  function isPositionMarker(row: number, col: number, moduleCount: number): boolean {
    // Top-left marker: 0-6, 0-6
    if (row <= 6 && col <= 6) return true;
    // Top-right marker: 0-6, moduleCount-7 to moduleCount-1
    if (row <= 6 && col >= moduleCount - 7) return true;
    // Bottom-left marker: moduleCount-7 to moduleCount-1, 0-6
    if (row >= moduleCount - 7 && col <= 6) return true;
    return false;
  }

  // Check if position is the outer border of a position marker
  function isMarkerBorder(row: number, col: number, moduleCount: number): boolean {
    // Check each marker position
    const markers = [
      { startRow: 0, startCol: 0 },
      { startRow: 0, startCol: moduleCount - 7 },
      { startRow: moduleCount - 7, startCol: 0 },
    ];
    
    for (const marker of markers) {
      const localRow = row - marker.startRow;
      const localCol = col - marker.startCol;
      if (localRow >= 0 && localRow <= 6 && localCol >= 0 && localCol <= 6) {
        // Outer border is row 0, 6 or col 0, 6 (but not the inner 5x5)
        if (localRow === 0 || localRow === 6 || localCol === 0 || localCol === 6) {
          return true;
        }
      }
    }
    return false;
  }

  // Check if position is the center of a position marker (3x3 inner square)
  function isMarkerCenter(row: number, col: number, moduleCount: number): boolean {
    const markers = [
      { startRow: 0, startCol: 0 },
      { startRow: 0, startCol: moduleCount - 7 },
      { startRow: moduleCount - 7, startCol: 0 },
    ];
    
    for (const marker of markers) {
      const localRow = row - marker.startRow;
      const localCol = col - marker.startCol;
      if (localRow >= 2 && localRow <= 4 && localCol >= 2 && localCol <= 4) {
        return true;
      }
    }
    return false;
  }

  // Draw QR code with custom module shapes
  useEffect(() => {
    if (!qrMatrix || !qrCanvasRef.current) return;
    const canvas = qrCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const margin = 4;
    const moduleCount = qrMatrix.length;
    const moduleSize = (size - margin * 2) / moduleCount;
    
    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = fgColor;

    // First pass: Draw position marker borders as connected shapes
    drawPositionMarkers(ctx, moduleCount, moduleSize, margin);
    
    // Second pass: Draw data dots (non-marker modules)
    if (dotShape === "rounded") {
      // Draw connected rounded modules
      drawConnectedRoundedModules(ctx, moduleCount, moduleSize, margin);
    } else {
      // Draw individual modules (square or circle)
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (qrMatrix[row][col] && !isPositionMarker(row, col, moduleCount)) {
            const x = margin + col * moduleSize;
            const y = margin + row * moduleSize;
            const s = moduleSize * 0.85;
            const offset = moduleSize * 0.075;
            drawModule(ctx, x + offset, y + offset, s, dotShape);
          }
        }
      }
    }
  }, [qrMatrix, size, fgColor, dotShape, markerBorderShape, markerCenterShape]);

  // Draw connected rounded modules (flowing style)
  function drawConnectedRoundedModules(ctx: CanvasRenderingContext2D, moduleCount: number, moduleSize: number, margin: number) {
    if (!qrMatrix) return;
    
    const r = moduleSize * 0.4; // Corner radius
    
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (!qrMatrix[row][col] || isPositionMarker(row, col, moduleCount)) continue;
        
        const x = margin + col * moduleSize;
        const y = margin + row * moduleSize;
        const s = moduleSize;
        
        // Check neighbors
        const top = row > 0 && qrMatrix[row - 1][col] && !isPositionMarker(row - 1, col, moduleCount);
        const bottom = row < moduleCount - 1 && qrMatrix[row + 1][col] && !isPositionMarker(row + 1, col, moduleCount);
        const left = col > 0 && qrMatrix[row][col - 1] && !isPositionMarker(row, col - 1, moduleCount);
        const right = col < moduleCount - 1 && qrMatrix[row][col + 1] && !isPositionMarker(row, col + 1, moduleCount);
        
        ctx.beginPath();
        
        // Top-left corner
        if (top && left) {
          ctx.moveTo(x, y);
        } else if (top) {
          ctx.moveTo(x, y);
        } else if (left) {
          ctx.moveTo(x, y);
        } else {
          ctx.moveTo(x + r, y);
        }
        
        // Top-right corner
        if (top && right) {
          ctx.lineTo(x + s, y);
        } else if (top) {
          ctx.lineTo(x + s, y);
        } else if (right) {
          ctx.lineTo(x + s - r, y);
          ctx.quadraticCurveTo(x + s, y, x + s, y + r);
        } else {
          ctx.lineTo(x + s - r, y);
          ctx.quadraticCurveTo(x + s, y, x + s, y + r);
        }
        
        // Bottom-right corner
        if (bottom && right) {
          ctx.lineTo(x + s, y + s);
        } else if (bottom) {
          ctx.lineTo(x + s, y + s);
        } else if (right) {
          ctx.lineTo(x + s, y + s - r);
          ctx.quadraticCurveTo(x + s, y + s, x + s - r, y + s);
        } else {
          ctx.lineTo(x + s, y + s - r);
          ctx.quadraticCurveTo(x + s, y + s, x + s - r, y + s);
        }
        
        // Bottom-left corner
        if (bottom && left) {
          ctx.lineTo(x, y + s);
        } else if (bottom) {
          ctx.lineTo(x, y + s);
        } else if (left) {
          ctx.lineTo(x + r, y + s);
          ctx.quadraticCurveTo(x, y + s, x, y + s - r);
        } else {
          ctx.lineTo(x + r, y + s);
          ctx.quadraticCurveTo(x, y + s, x, y + s - r);
        }
        
        // Back to top-left
        if (top && left) {
          ctx.lineTo(x, y);
        } else if (top) {
          ctx.lineTo(x, y);
        } else if (left) {
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
        } else {
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
        }
        
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // Draw position markers with custom border and center shapes
  function drawPositionMarkers(ctx: CanvasRenderingContext2D, moduleCount: number, moduleSize: number, margin: number) {
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
      const gap = moduleSize; // Gap between border and center
      
      // Draw outer border (ring)
      ctx.fillStyle = fgColor;
      drawMarkerBorder(ctx, x, y, outerSize, moduleSize, markerBorderShape);
      
      // Draw center (3x3 filled square)
      const centerX = x + 2 * moduleSize;
      const centerY = y + 2 * moduleSize;
      drawMarkerCenter(ctx, centerX, centerY, innerSize, markerCenterShape);
    }
  }

  // Draw the outer border ring of a position marker
  function drawMarkerBorder(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, thickness: number, shape: string) {
    const outerPadding = thickness * 0.1;
    const adjustedX = x + outerPadding;
    const adjustedY = y + outerPadding;
    const adjustedSize = size - outerPadding * 2;
    
    ctx.beginPath();
    
    if (shape === "circle") {
      // Draw outer circle
      const centerX = adjustedX + adjustedSize / 2;
      const centerY = adjustedY + adjustedSize / 2;
      const outerRadius = adjustedSize / 2;
      const innerRadius = outerRadius - thickness;
      
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2, true);
    } else if (shape === "rounded") {
      // Rounded rectangle ring
      const radius = thickness * 1.5;
      const innerGap = thickness;
      
      // Outer rounded rect
      ctx.roundRect(adjustedX, adjustedY, adjustedSize, adjustedSize, radius);
      // Inner rounded rect (cut out)
      ctx.roundRect(adjustedX + innerGap, adjustedY + innerGap, adjustedSize - innerGap * 2, adjustedSize - innerGap * 2, radius * 0.5);
    } else {
      // Square ring
      const innerGap = thickness;
      ctx.rect(adjustedX, adjustedY, adjustedSize, adjustedSize);
      ctx.rect(adjustedX + innerGap, adjustedY + innerGap, adjustedSize - innerGap * 2, adjustedSize - innerGap * 2);
    }
    
    ctx.fill("evenodd");
  }

  // Draw the center of a position marker
  function drawMarkerCenter(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, shape: string) {
    const padding = size * 0.1;
    const adjustedX = x + padding;
    const adjustedY = y + padding;
    const adjustedSize = size - padding * 2;
    
    ctx.beginPath();
    
    if (shape === "circle") {
      ctx.arc(adjustedX + adjustedSize / 2, adjustedY + adjustedSize / 2, adjustedSize / 2, 0, Math.PI * 2);
    } else {
      // Square
      ctx.rect(adjustedX, adjustedY, adjustedSize, adjustedSize);
    }
    
    ctx.fill();
  }

  // Draw a single module with the selected shape
  function drawModule(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, shape: string) {
    ctx.beginPath();
    switch (shape) {
      case "rounded":
        const r = s * 0.35;
        ctx.roundRect(x, y, s, s, r);
        break;
      case "circle":
        ctx.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2);
        break;
      default: // square
        ctx.rect(x, y, s, s);
    }
    ctx.fill();
  }

  const applyTheme = (theme: typeof THEMES[0]) => {
    setFgColor(theme.fg);
    setBgColor(theme.bg);
    setAccentColor(theme.accent);
    setActiveTheme(theme.name);
  };

  const applyThemeSettings = (settings: Partial<QrSettings>, name?: string) => {
    if (settings.size !== undefined) setSize(settings.size);
    if (settings.fgColor) setFgColor(settings.fgColor);
    if (settings.bgColor) setBgColor(settings.bgColor);
    if (settings.accentColor) setAccentColor(settings.accentColor);
    if (settings.overlayText !== undefined) setOverlayText(settings.overlayText);
    if (settings.secondaryText !== undefined) setSecondaryText(settings.secondaryText);
    if (settings.primaryTextScale !== undefined) setPrimaryTextScale(settings.primaryTextScale);
    if (settings.secondaryTextScale !== undefined) setSecondaryTextScale(settings.secondaryTextScale);
    if (settings.includeLabel !== undefined) setIncludeLabel(settings.includeLabel);
    if (settings.qrLevel) setQrLevel(settings.qrLevel);
    if (settings.frameStyle) setFrameStyle(settings.frameStyle);
    if (settings.centerIcon) setCenterIcon(settings.centerIcon);
    if (settings.centerText !== undefined) setCenterText(settings.centerText);
    if (settings.centerTextSize !== undefined) setCenterTextSize(settings.centerTextSize);
    if (settings.centerTextColor) {
      setCenterTextColor(settings.centerTextColor);
      setCenterTextColorLocked(false);
    }
    if (settings.showGradientBg !== undefined) setShowGradientBg(settings.showGradientBg);
    if (settings.gradientAngle !== undefined) setGradientAngle(settings.gradientAngle);
    if (settings.dotShape) setDotShape(settings.dotShape);
    if (settings.markerBorderShape) setMarkerBorderShape(settings.markerBorderShape);
    if (settings.markerCenterShape) setMarkerCenterShape(settings.markerCenterShape);
    if (settings.centerBgShape) setCenterBgShape(settings.centerBgShape);
    if (settings.centerPaddingH !== undefined) setCenterPaddingH(settings.centerPaddingH);
    if (settings.centerPaddingV !== undefined) setCenterPaddingV(settings.centerPaddingV);
    if (settings.shadowDepth !== undefined) setShadowDepth(settings.shadowDepth);
    if (settings.shadowRounded !== undefined) setShadowRounded(settings.shadowRounded);
    if (settings.exportBackground) setExportBackground(settings.exportBackground);
    setActiveTheme(name ?? null);
  };

  const getFrameStyle = useCallback(() => {
    const baseRadius = frameStyle === "rounded" || (frameStyle === "shadow" && shadowRounded) ? "24px" : "0px";
    const baseStyle: React.CSSProperties = {
      padding: "24px",
      borderRadius: baseRadius,
    };

    switch (frameStyle) {
      case "simple":
        return { ...baseStyle, border: `3px solid ${accentColor}` };
      case "rounded":
        return { ...baseStyle, border: `4px solid ${accentColor}` };
      case "double":
        return { ...baseStyle, border: `4px double ${accentColor}` };
      case "dashed":
        return { ...baseStyle, border: `3px dashed ${accentColor}` };
      case "shadow":
        return { ...baseStyle, boxShadow: `${shadowDepth}px ${shadowDepth}px 0px ${accentColor}`, border: `2px solid ${accentColor}` };
      case "gradient":
        return { 
          ...baseStyle, 
          border: "4px solid transparent",
          backgroundImage: `linear-gradient(${bgColor}, ${bgColor}), linear-gradient(${gradientAngle}deg, ${fgColor}, ${accentColor})`,
          backgroundOrigin: "border-box",
          backgroundClip: "padding-box, border-box",
        };
      case "corners":
        return { ...baseStyle, position: "relative" as const };
      default:
        return baseStyle;
    }
  }, [frameStyle, accentColor, bgColor, fgColor, gradientAngle, shadowDepth, shadowRounded]);

  const getBackgroundStyle = useCallback(() => {
    if (showGradientBg) {
      return {
        background: `linear-gradient(${gradientAngle}deg, ${bgColor}, ${lightenColor(bgColor, 20)})`,
      };
    }
    return { backgroundColor: bgColor };
  }, [showGradientBg, gradientAngle, bgColor]);

  // Helper to lighten a color
  function lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
  }

  const selectedIcon = CENTER_ICONS.find(i => i.id === centerIcon);
  const centerContent = centerIcon === "custom" ? centerText : selectedIcon?.emoji || "";
  const hasCenterContent = centerIcon !== "none" && (centerIcon === "custom" ? centerText.trim() !== "" : !!selectedIcon?.emoji);
  const centerPreviewFontSize = centerIcon === "custom"
    ? Math.max(8, Math.min(size / 6, (size / 4) / Math.max(1, centerContent.length / 3)) * centerTextSize)
    : size / 6;
  const centerPreviewTextWidth = centerIcon === "custom"
    ? Math.max(1, centerContent.length) * (centerPreviewFontSize * 0.6)
    : centerPreviewFontSize;
  const centerPreviewBgWidth = centerPreviewTextWidth + centerPaddingH * 2;
  const centerPreviewBgHeight = centerPreviewFontSize + centerPaddingV * 2;
  const primaryTextFontSize = Math.max(12, size / 18) * primaryTextScale;
  const secondaryTextFontSize = Math.max(10, size / 20) * secondaryTextScale;

  // Get center background border radius based on shape
  const getCenterBgRadius = (baseSize: number) => {
    switch (centerBgShape) {
      case "circle": return "50%";
      case "rounded": return `${baseSize * 0.2}px`;
      case "square": return "0";
      default: return "50%";
    }
  };

  // Draw center content background on canvas
  function drawCenterBackground(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, shape: string) {
    ctx.beginPath();
    switch (shape) {
      case "circle":
        ctx.arc(cx, cy, Math.max(w, h) / 2, 0, Math.PI * 2);
        break;
      case "rounded":
        const r = Math.min(w, h) * 0.2;
        ctx.roundRect(cx - w / 2, cy - h / 2, w, h, r);
        break;
      case "square":
        ctx.rect(cx - w / 2, cy - h / 2, w, h);
        break;
    }
    ctx.fill();
  }

  const downloadImage = async () => {
    try {
      const dataUrl = await generateStyledQrDataUrl({
        url,
        deviceName,
        settings: currentSettings,
      });

      const link = document.createElement("a");
      link.download = `${deviceName.replace(/\s+/g, "_")}_qr.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Download image error:", error);
      toast.error("Failed to generate PNG");
    }
  };

  const saveTheme = async () => {
    const name = themeName.trim();
    if (!name) {
      toast.error("Please enter a theme name.");
      return;
    }
    setSavingTheme(true);
    try {
      const res = await fetch("/api/qr-themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, settings: currentSettings })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error || "Failed to save theme.");
        return;
      }
      toast.success("Theme saved.");
      setThemeName("");
    } catch (error) {
      console.error("Save theme error:", error);
      toast.error("Failed to save theme.");
    } finally {
      setSavingTheme(false);
    }
  };

  if (!mounted) {
    return <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-24 z-10">
        <div className="space-y-4 rounded-2xl bg-white dark:bg-black/80 ring-1 ring-gray-200/70 dark:ring-gray-700/70 p-4 shadow-lg">
          {(profileBlurb || profileAvatarUrl) && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">About</p>
              <div className="flex gap-3 items-start">
                {profileAvatarUrl && (
                  <div className={`h-14 w-14 overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0 ${
                    profileAvatarShape === "circle" ? "rounded-full" : profileAvatarShape === "rounded" ? "rounded-xl" : ""
                  }`}>
                    <img src={profileAvatarUrl} alt="Profile avatar" className="h-full w-full object-contain" />
                  </div>
                )}
                {profileBlurb && (
                  <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{profileBlurb}</p>
                )}
              </div>
            </div>
          )}
          {/* QR Code Display */}
          <div className="flex justify-center">
            <div
              ref={qrRef}
              style={{ ...getFrameStyle(), ...getBackgroundStyle() }}
              className="relative"
            >
              {/* Corner brackets decoration */}
              {frameStyle === "corners" && (
                <>
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 rounded-tl-sm" style={{ borderColor: accentColor }} />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 rounded-tr-sm" style={{ borderColor: accentColor }} />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 rounded-bl-sm" style={{ borderColor: accentColor }} />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 rounded-br-sm" style={{ borderColor: accentColor }} />
                </>
              )}
              
              <div className="relative">
                <canvas
                  ref={qrCanvasRef}
                  width={size}
                  height={size}
                />
                {/* Center content overlay (icon or custom text) */}
                {hasCenterContent && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <div 
                      className="flex items-center justify-center font-bold"
                      style={{ 
                        backgroundColor: bgColor,
                        minWidth: centerPreviewBgWidth,
                        height: centerPreviewBgHeight,
                        fontSize: centerPreviewFontSize,
                        borderRadius: getCenterBgRadius(Math.max(centerPreviewBgWidth, centerPreviewBgHeight)),
                        padding: `${centerPaddingV}px ${centerPaddingH}px`,
                    color: centerIcon === "custom" ? centerTextColor : fgColor,
                  }}
                >
                  {centerContent}
                </div>
                  </div>
                )}
              </div>
              
              {includeLabel && (
                <p
                  className="text-center mt-3 font-bold"
                  style={{ color: fgColor, fontSize: Math.max(14, size / 14) }}
                >
                  {deviceName}
                </p>
              )}
              {overlayText && (
                <p
                  className="text-center mt-1 font-medium"
                  style={{ color: accentColor, fontSize: primaryTextFontSize }}
                >
                  {overlayText}
                </p>
              )}
              {secondaryText && (
                <p
                  className="text-center mt-1"
                  style={{ color: fgColor, fontSize: secondaryTextFontSize, opacity: 0.8 }}
                >
                  {secondaryText}
                </p>
              )}
            </div>
          </div>

          {/* Download Button */}
          <button
            onClick={downloadImage}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium"
          >
            <Download size={18} /> Download PNG
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Theme Presets */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
          <h3 className="font-semibold flex items-center gap-2 text-gray-700 dark:text-gray-200 mb-3">
            <Sparkles size={18} /> Quick Themes
          </h3>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((theme) => (
              <button
                key={theme.name}
                onClick={() => applyTheme(theme)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTheme === theme.name
                    ? "ring-2 ring-offset-2 ring-blue-500"
                    : ""
                }`}
                style={{ 
                  backgroundColor: theme.bg, 
                  color: theme.fg,
                  border: `2px solid ${theme.accent}`
                }}
              >
                {theme.name}
              </button>
            ))}
          </div>
          {customThemes.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wide mb-2">Custom Themes</p>
              <div className="flex flex-wrap gap-2">
                {customThemes.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => applyThemeSettings(theme.settings, theme.name)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      activeTheme === theme.name ? "ring-2 ring-offset-2 ring-blue-500" : ""
                    }`}
                  >
                    {theme.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

          {/* Customization Options */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-4">
        <h3 className="font-semibold flex items-center gap-2 text-gray-700 dark:text-gray-200">
          <Settings size={18} /> Customization
        </h3>

        {/* Size & Level Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              <Maximize2 size={14} /> Zoom
            </label>
            <input
              type="range"
              min="150"
              max="350"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full accent-orange-500"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">{Math.round((size / 200) * 100)}%</span>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 block">Error Level</label>
            <select
              value={qrLevel}
              onChange={(e) => setQrLevel(e.target.value as "L" | "M" | "Q" | "H")}
              className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
            >
              <option value="L">Low (7%)</option>
              <option value="M">Medium (15%)</option>
              <option value="Q">Quartile (25%)</option>
              <option value="H">High (30%) - Best for icons</option>
            </select>
          </div>
        </div>

        {/* QR Style Section */}
        <div className="space-y-4">
          {/* Dots Shape */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
              Dots
            </label>
            <div className="flex gap-2">
              {DOT_SHAPES.map((shape) => (
                <button
                  key={shape.id}
                  onClick={() => setDotShape(shape.id)}
                  className={`flex-1 flex items-center justify-center p-3 rounded-lg text-xl transition-all border ${
                    dotShape === shape.id
                      ? "bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-gray-900"
                      : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 hover:border-gray-400"
                  }`}
                  title={shape.name}
                >
                  <DotPreview shape={shape.id} />
                </button>
              ))}
            </div>
          </div>

          {/* Marker Border Shape */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
              Marker border
            </label>
            <div className="flex gap-2">
              {MARKER_BORDER_SHAPES.map((shape) => (
                <button
                  key={shape.id}
                  onClick={() => setMarkerBorderShape(shape.id)}
                  className={`flex-1 flex items-center justify-center p-3 rounded-lg text-xl transition-all border ${
                    markerBorderShape === shape.id
                      ? "bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-gray-900"
                      : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 hover:border-gray-400"
                  }`}
                  title={shape.name}
                >
                  <MarkerBorderPreview shape={shape.id} />
                </button>
              ))}
            </div>
          </div>

          {/* Marker Center Shape */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
              Marker center
            </label>
            <div className="flex gap-2">
              {MARKER_CENTER_SHAPES.map((shape) => (
                <button
                  key={shape.id}
                  onClick={() => setMarkerCenterShape(shape.id)}
                  className={`flex-1 flex items-center justify-center p-3 rounded-lg text-xl transition-all border ${
                    markerCenterShape === shape.id
                      ? "bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-gray-900"
                      : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 hover:border-gray-400"
                  }`}
                  title={shape.name}
                >
                  <MarkerCenterPreview shape={shape.id} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Colors Row */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              <Palette size={14} /> QR Color
            </label>
            <input
              type="color"
              value={fgColor}
              onChange={(e) => { setFgColor(e.target.value); setActiveTheme(null); }}
              className="w-full h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
            />
            <input
              type="text"
              value={fgHex}
              onChange={(e) => setFgHex(e.target.value)}
              onBlur={() => {
                const next = normalizeHex(fgHex);
                if (next) {
                  setFgColor(next);
                  setActiveTheme(null);
                } else {
                  setFgHex(fgColor);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
              className="mt-2 w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="#000000"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              <Palette size={14} /> Background
            </label>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => { setBgColor(e.target.value); setActiveTheme(null); }}
              className="w-full h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
            />
            <input
              type="text"
              value={bgHex}
              onChange={(e) => setBgHex(e.target.value)}
              onBlur={() => {
                const next = normalizeHex(bgHex);
                if (next) {
                  setBgColor(next);
                  setActiveTheme(null);
                } else {
                  setBgHex(bgColor);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
              className="mt-2 w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="#ffffff"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              <Palette size={14} /> Accent
            </label>
            <input
              type="color"
              value={accentColor}
              onChange={(e) => { setAccentColor(e.target.value); setActiveTheme(null); }}
              className="w-full h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
            />
            <input
              type="text"
              value={accentHex}
              onChange={(e) => setAccentHex(e.target.value)}
              onBlur={() => {
                const next = normalizeHex(accentHex);
                if (next) {
                  setAccentColor(next);
                  setActiveTheme(null);
                } else {
                  setAccentHex(accentColor);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
              className="mt-2 w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="#000000"
            />
          </div>
        </div>

        {/* Frame & Icon Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              <Frame size={14} /> Frame Style
            </label>
            <select
              value={frameStyle}
              onChange={(e) => setFrameStyle(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
            >
              {FRAMES.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              <ImageIcon size={14} /> Center Content
            </label>
            <select
              value={centerIcon}
              onChange={(e) => setCenterIcon(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
            >
              {CENTER_ICONS.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
        </div>

        {frameStyle === "shadow" && (
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              Shadow Depth
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="24"
                value={shadowDepth}
                onChange={(e) => setShadowDepth(Number(e.target.value))}
                className="flex-1 accent-orange-500"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 w-8">{shadowDepth}px</span>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={shadowRounded}
                onChange={(e) => setShadowRounded(e.target.checked)}
                className="rounded accent-orange-500"
              />
              Rounded Corners
            </label>
          </div>
        )}

        {/* Custom center text input */}
        {centerIcon === "custom" && (
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              <Type size={14} /> Center Text
            </label>
            <input
              type="text"
              value={centerText}
              onChange={(e) => setCenterText(e.target.value)}
              placeholder="e.g., SCAN ME, LOST, REWARD"
              maxLength={12}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-400"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Max 12 characters. Short text works best.</p>
            <div className="mt-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                Center Text Size
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0.6"
                  max="1.6"
                  step="0.05"
                  value={centerTextSize}
                  onChange={(e) => setCenterTextSize(Number(e.target.value))}
                  className="flex-1 accent-orange-500"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400 w-10">{centerTextSize.toFixed(2)}x</span>
              </div>
            </div>
            <div className="mt-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                Center Text Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={centerTextColor}
                  onChange={(e) => {
                    setCenterTextColor(e.target.value);
                    setCenterTextColorLocked(false);
                  }}
                  className="w-12 h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCenterTextColor(accentColor);
                    setCenterTextColorLocked(true);
                  }}
                  className="text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Use Accent
                </button>
              </div>
              <input
                type="text"
                value={centerTextHex}
                onChange={(e) => setCenterTextHex(e.target.value)}
                onBlur={() => {
                  const next = normalizeHex(centerTextHex);
                  if (next) {
                    setCenterTextColor(next);
                    setCenterTextColorLocked(false);
                  } else {
                    setCenterTextHex(centerTextColor);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  }
                }}
                className="mt-2 w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="#000000"
              />
            </div>
          </div>
        )}

        {/* Center Background Options (only show when center content is enabled) */}
        {centerIcon !== "none" && (
          <div className="space-y-3 p-3 bg-gray-100 dark:bg-gray-600 rounded-lg">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wide">Center Background</p>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  <Circle size={14} /> Shape
                </label>
                <select
                  value={centerBgShape}
                  onChange={(e) => setCenterBgShape(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-500 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {CENTER_BG_SHAPES.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Horizontal Padding
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={centerPaddingH}
                    onChange={(e) => setCenterPaddingH(Number(e.target.value))}
                    className="flex-1 accent-orange-500"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-8">{centerPaddingH}px</span>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Vertical Padding
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={centerPaddingV}
                    onChange={(e) => setCenterPaddingV(Number(e.target.value))}
                    className="flex-1 accent-orange-500"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-8">{centerPaddingV}px</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gradient toggle */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showGradientBg}
              onChange={(e) => setShowGradientBg(e.target.checked)}
              className="rounded accent-orange-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">Gradient Background</span>
          </label>
          {showGradientBg && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Angle:</span>
              <input
                type="range"
                min="0"
                max="360"
                value={gradientAngle}
                onChange={(e) => setGradientAngle(Number(e.target.value))}
                className="w-20 accent-orange-500"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">{gradientAngle}°</span>
            </div>
          )}
        </div>

        {/* Export background */}
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 block">Export Background</label>
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="export-bg"
                value="white"
                checked={exportBackground === "white"}
                onChange={() => setExportBackground("white")}
                className="accent-orange-500"
              />
              White
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="export-bg"
                value="transparent"
                checked={exportBackground === "transparent"}
                onChange={() => setExportBackground("transparent")}
                className="accent-orange-500"
              />
              Transparent
            </label>
          </div>
        </div>

        {/* Text Inputs */}
        <div className="space-y-3">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              <Type size={14} /> Primary Text
            </label>
            <input
              type="text"
              value={overlayText}
              onChange={(e) => setOverlayText(e.target.value)}
              placeholder="e.g., If found, please scan!"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              <Type size={14} /> Secondary Text
            </label>
            <input
              type="text"
              value={secondaryText}
              onChange={(e) => setSecondaryText(e.target.value)}
              placeholder="e.g., Reward offered • No questions asked"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 block">
              Primary Text Size
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.6"
                max="2.0"
                step="0.05"
                value={primaryTextScale}
                onChange={(e) => setPrimaryTextScale(Number(e.target.value))}
                className="flex-1 accent-orange-500"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 w-10">{primaryTextScale.toFixed(2)}x</span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 block">
              Secondary Text Size
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.6"
                max="2.0"
                step="0.05"
                value={secondaryTextScale}
                onChange={(e) => setSecondaryTextScale(Number(e.target.value))}
                className="flex-1 accent-orange-500"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 w-10">{secondaryTextScale.toFixed(2)}x</span>
            </div>
          </div>
        </div>

        {/* Include Label */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeLabel}
            onChange={(e) => setIncludeLabel(e.target.checked)}
            className="rounded accent-orange-500"
          />
          <span className="text-sm text-gray-600 dark:text-gray-300">Include device name</span>
        </label>
      </div>

      {showThemeSave && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Save as Custom Theme</h3>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
              placeholder="Theme name"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              type="button"
              onClick={saveTheme}
              disabled={savingTheme}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              {savingTheme ? "Saving..." : "Save Theme"}
            </button>
          </div>
        </div>
      )}
        </div>
    </div>
  );
}
