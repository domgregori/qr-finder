"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, Trash2, Plus, Move, Maximize2, Save, FolderOpen, RefreshCw } from "lucide-react";
import { ThemeToggle } from "@shared/components/theme-toggle";
import { type SavedQrSettings } from "@shared/lib/qr-render";
import { generateStyledQrSvg } from "@shared/lib/qr-svg";

type Device = {
  id: string;
  name: string;
  uniqueCode: string;
  qrSettings?: SavedQrSettings | null;
};

type LayoutSpecItem = {
  deviceId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  page: number;
};

type PersistedLayoutData = {
  version: 1;
  items: LayoutSpecItem[];
};

type SavedLayout = {
  id: string;
  name: string;
  data: PersistedLayoutData;
  updatedAt: string;
};

type Theme = {
  id: string;
  name: string;
  settings: SavedQrSettings;
};

type LayoutItem = {
  id: string;
  deviceId: string;
  name: string;
  uniqueCode: string;
  x: number;
  y: number;
  w: number;
  h: number;
  page: number;
  qrSvg: string;
};

type InteractionMode = "drag" | "resize";

type DragSnapshotItem = {
  id: string;
  x: number;
  y: number;
  page: number;
};

type InteractionState = {
  itemId: string;
  mode: InteractionMode;
  page: number;
  startX: number;
  startY: number;
  startItemX: number;
  startItemY: number;
  startItemW: number;
  startItemH: number;
  pointerOffsetX: number;
  pointerOffsetY: number;
  dragSnapshot?: DragSnapshotItem[];
};

type GuideState = {
  page: number | null;
  v: number[];
  h: number[];
};

const PAGE_WIDTH_IN = 8.5;
const PAGE_HEIGHT_IN = 11;
const GRID_IN = 0.25;
const GRID_X = (GRID_IN / PAGE_WIDTH_IN) * 100;
const GRID_Y = (GRID_IN / PAGE_HEIGHT_IN) * 100;
const MIN_SIZE = 12;
const ALIGN_TOLERANCE = 0.8;
const RULER_SIZE_PX = 28;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function snap(value: number, step: number) {
  return Math.round(value / step) * step;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildDefaultLayout(devices: Device[], qrByDeviceId: Record<string, string>): LayoutItem[] {
  const columns = 3;
  const cardW = 28;
  const cardH = 28;
  const xStart = 4;
  const yStart = 4;
  const xGap = 2;
  const yGap = 2;
  const rowsPerPage = 3;
  const perPage = columns * rowsPerPage;

  return devices.map((device, index) => {
    const page = Math.floor(index / perPage);
    const localIndex = index % perPage;
    const col = localIndex % columns;
    const row = Math.floor(localIndex / columns);

    return {
      id: uid(),
      deviceId: device.id,
      name: device.name,
      uniqueCode: device.uniqueCode,
      qrSvg: qrByDeviceId[device.id] ?? "",
      page,
      x: xStart + col * (cardW + xGap),
      y: yStart + row * (cardH + yGap),
      w: cardW,
      h: cardH,
    };
  });
}

function computeGuides(current: LayoutItem, peers: LayoutItem[]): { v: number[]; h: number[] } {
  const vGuides = new Set<number>();
  const hGuides = new Set<number>();

  const cLeft = current.x;
  const cCenter = current.x + current.w / 2;
  const cRight = current.x + current.w;
  const cTop = current.y;
  const cMiddle = current.y + current.h / 2;
  const cBottom = current.y + current.h;

  for (const peer of peers) {
    const pLeft = peer.x;
    const pCenter = peer.x + peer.w / 2;
    const pRight = peer.x + peer.w;
    const pTop = peer.y;
    const pMiddle = peer.y + peer.h / 2;
    const pBottom = peer.y + peer.h;

    const vx = [
      [cLeft, pLeft],
      [cLeft, pCenter],
      [cLeft, pRight],
      [cCenter, pLeft],
      [cCenter, pCenter],
      [cCenter, pRight],
      [cRight, pLeft],
      [cRight, pCenter],
      [cRight, pRight],
    ];

    for (const [a, b] of vx) {
      if (Math.abs(a - b) <= ALIGN_TOLERANCE) {
        vGuides.add(b);
      }
    }

    const hy = [
      [cTop, pTop],
      [cTop, pMiddle],
      [cTop, pBottom],
      [cMiddle, pTop],
      [cMiddle, pMiddle],
      [cMiddle, pBottom],
      [cBottom, pTop],
      [cBottom, pMiddle],
      [cBottom, pBottom],
    ];

    for (const [a, b] of hy) {
      if (Math.abs(a - b) <= ALIGN_TOLERANCE) {
        hGuides.add(b);
      }
    }
  }

  return {
    v: Array.from(vGuides).sort((a, b) => a - b),
    h: Array.from(hGuides).sort((a, b) => a - b),
  };
}

export default function PrintLayoutPage() {
  const { status } = useSession() || {};
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [baseUrl, setBaseUrl] = useState("");
  const [publicPortalUrl, setPublicPortalUrl] = useState<string | null>(null);

  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceMap, setDeviceMap] = useState<Record<string, Device>>({});
  const [qrByDeviceId, setQrByDeviceId] = useState<Record<string, string>>({});

  const [layoutItems, setLayoutItems] = useState<LayoutItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activePage, setActivePage] = useState(0);

  const [snapEnabled, setSnapEnabled] = useState(true);
  const [guides, setGuides] = useState<GuideState>({ page: null, v: [], h: [] });
  const [interaction, setInteraction] = useState<InteractionState | null>(null);

  const [savedLayouts, setSavedLayouts] = useState<SavedLayout[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>("");
  const [layoutName, setLayoutName] = useState("");
  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<string>("");
  const [globalQrSizeInches, setGlobalQrSizeInches] = useState<string>("2");
  const [pageCount, setPageCount] = useState(1);

  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const computedPageCount = useMemo(() => {
    if (layoutItems.length === 0) return 1;
    return Math.max(...layoutItems.map((item) => item.page)) + 1;
  }, [layoutItems]);

  const hiddenDevices = useMemo(() => {
    const placed = new Set(layoutItems.map((item) => item.deviceId));
    return devices.filter((device) => !placed.has(device.id));
  }, [devices, layoutItems]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      void initialize();
    }
  }, [status]);

  useEffect(() => {
    if (pageCount < computedPageCount) {
      setPageCount(computedPageCount);
    }
  }, [computedPageCount, pageCount]);

  useEffect(() => {
    if (activePage > pageCount - 1) {
      setActivePage(Math.max(0, pageCount - 1));
    }
  }, [activePage, pageCount]);

  useEffect(() => {
    if (!interaction) return;

    const onMouseMove = (event: MouseEvent) => {
      const pageEntries = Object.entries(pageRefs.current)
        .map(([k, el]) => ({ page: Number(k), el }))
        .filter((entry): entry is { page: number; el: HTMLDivElement } => Boolean(entry.el));
      if (pageEntries.length === 0) return;

      const hovered = pageEntries.find(({ el }) => {
        const r = el.getBoundingClientRect();
        return event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
      });
      const targetPage = hovered?.page ?? interaction.page;
      const pageEl = pageRefs.current[interaction.mode === "resize" ? interaction.page : targetPage];
      if (!pageEl) return;

      const rect = pageEl.getBoundingClientRect();

      setLayoutItems((prev) => {
        const snapshotMap = new Map((interaction.dragSnapshot ?? []).map((entry) => [entry.id, entry]));
        const leadItem = prev.find((entry) => entry.id === interaction.itemId);
        const next = prev.map((item) => {
          if (interaction.mode === "drag") {
            const pointerX = ((event.clientX - rect.left) / rect.width) * 100;
            const pointerY = ((event.clientY - rect.top) / rect.height) * 100;
            const leadSnapshot = snapshotMap.get(interaction.itemId);
            if (!leadSnapshot || !leadItem) return item;

            let leadX = clamp(pointerX - interaction.pointerOffsetX, 0, 100 - leadItem.w);
            let leadY = clamp(pointerY - interaction.pointerOffsetY, 0, 100 - leadItem.h);
            if (snapEnabled) {
              leadX = clamp(snap(leadX, GRID_X), 0, 100 - leadItem.w);
              leadY = clamp(snap(leadY, GRID_Y), 0, 100 - leadItem.h);
            }

            const dx = leadX - leadSnapshot.x;
            const dy = leadY - leadSnapshot.y;
            const currentSnapshot = snapshotMap.get(item.id);
            if (!currentSnapshot) return item;

            const nextX = clamp(currentSnapshot.x + dx, 0, 100 - item.w);
            const nextY = clamp(currentSnapshot.y + dy, 0, 100 - item.h);
            return { ...item, page: targetPage, x: nextX, y: nextY };
          }

          if (item.id !== interaction.itemId) return item;
          const dxPct = ((event.clientX - interaction.startX) / rect.width) * 100;
          const dyPct = ((event.clientY - interaction.startY) / rect.height) * 100;
          let nextW = clamp(interaction.startItemW + dxPct, MIN_SIZE, 100 - item.x);
          let nextH = clamp(interaction.startItemH + dyPct, MIN_SIZE, 100 - item.y);
          if (snapEnabled) {
            nextW = clamp(snap(nextW, GRID_X), MIN_SIZE, 100 - item.x);
            nextH = clamp(snap(nextH, GRID_Y), MIN_SIZE, 100 - item.y);
          }
          return { ...item, w: nextW, h: nextH };
        });

        const current = next.find((item) => item.id === interaction.itemId);
        if (current) {
          const draggedIds = new Set((interaction.dragSnapshot ?? []).map((entry) => entry.id));
          const peers = next.filter((item) => !draggedIds.has(item.id) && item.page === current.page);
          const g = computeGuides(current, peers);
          setGuides({ page: current.page, v: g.v, h: g.h });
        }

        return next;
      });
    };

    const onMouseUp = () => {
      setInteraction(null);
      setGuides({ page: null, v: [], h: [] });
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [interaction, snapEnabled]);

  const initialize = async () => {
    setLoading(true);
    try {
      const [configRes, devicesRes, layoutsRes, themesRes] = await Promise.all([
        fetch("/api/config"),
        fetch("/api/devices"),
        fetch("/api/print-layouts"),
        fetch("/api/qr-themes"),
      ]);

      let portal = "";
      if (configRes.ok) {
        const config = await configRes.json();
        portal = config?.publicPortalUrl ?? "";
        setPublicPortalUrl(portal || null);
      }

      if (!devicesRes.ok) {
        return;
      }

      const rawDevices = await devicesRes.json();
      const list: Device[] = (rawDevices ?? []).map((d: any) => ({
        id: d.id,
        name: d.name,
        uniqueCode: d.uniqueCode,
        qrSettings: d.qrSettings ?? null,
      }));

      const map: Record<string, Device> = {};
      for (const device of list) {
        map[device.id] = device;
      }

      const effectiveBase = portal || baseUrl || (typeof window !== "undefined" ? window.location.origin : "");

      const qrEntries = await Promise.all(
        list.map(async (device) => {
          const deviceUrl = `${effectiveBase}/device/${device.uniqueCode}`;
          const qrSvg = await generateStyledQrSvg({
            url: deviceUrl,
            deviceName: device.name,
            settings: device.qrSettings ?? null,
          });
          return [device.id, qrSvg] as const;
        })
      );

      const qrMap: Record<string, string> = Object.fromEntries(qrEntries);
      setDevices(list);
      setDeviceMap(map);
      setQrByDeviceId(qrMap);
      const defaults = buildDefaultLayout(list, qrMap);
      setLayoutItems(defaults);
      setPageCount(Math.max(1, ...defaults.map((item) => item.page + 1)));

      if (layoutsRes.ok) {
        const layouts = await layoutsRes.json();
        setSavedLayouts((layouts ?? []) as SavedLayout[]);
      }
      if (themesRes.ok) {
        const loadedThemes = (await themesRes.json()) as Theme[];
        setThemes(Array.isArray(loadedThemes) ? loadedThemes : []);
      }
    } catch (error) {
      console.error("Failed to initialize print page:", error);
    } finally {
      setLoading(false);
    }
  };

  const startInteraction = (event: ReactMouseEvent, item: LayoutItem, mode: InteractionMode) => {
    event.stopPropagation();
    if ((event.ctrlKey || event.metaKey) && mode === "drag") {
      setSelectedIds((prev) => (prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]));
      return;
    }

    const nextSelectedIds = selectedIdSet.has(item.id) && mode === "drag" ? selectedIds : [item.id];
    setSelectedIds(nextSelectedIds);
    setActivePage(item.page);
    const pageEl = pageRefs.current[item.page];
    const rect = pageEl?.getBoundingClientRect();
    const pointerOffsetX = rect ? ((event.clientX - rect.left) / rect.width) * 100 - item.x : item.w / 2;
    const pointerOffsetY = rect ? ((event.clientY - rect.top) / rect.height) * 100 - item.y : item.h / 2;

    const dragSnapshot =
      mode === "drag"
        ? layoutItems
            .filter((entry) => nextSelectedIds.includes(entry.id))
            .map((entry) => ({ id: entry.id, x: entry.x, y: entry.y, page: entry.page }))
        : undefined;

    setInteraction({
      itemId: item.id,
      mode,
      page: item.page,
      startX: event.clientX,
      startY: event.clientY,
      startItemX: item.x,
      startItemY: item.y,
      startItemW: item.w,
      startItemH: item.h,
      pointerOffsetX,
      pointerOffsetY,
      dragSnapshot,
    });
  };

  const deleteSelected = () => {
    if (selectedIds.length === 0) return;
    const idSet = new Set(selectedIds);
    setLayoutItems((prev) => prev.filter((item) => !idSet.has(item.id)));
    setSelectedIds([]);
  };

  const addDeviceToPage = (device: Device) => {
    const qrSvg = qrByDeviceId[device.id];
    if (!qrSvg) return;

    const newItem: LayoutItem = {
      id: uid(),
      deviceId: device.id,
      name: device.name,
      uniqueCode: device.uniqueCode,
      qrSvg,
      page: activePage,
      x: 4,
      y: 4,
      w: 28,
      h: 28,
    };

    setLayoutItems((prev) => [...prev, newItem]);
    if (activePage + 1 > pageCount) {
      setPageCount(activePage + 1);
    }
    setSelectedIds([newItem.id]);
  };

  const autoPaginate = () => {
    const sorted = [...layoutItems].sort((a, b) => a.name.localeCompare(b.name));
    const columns = 3;
    const rows = 3;
    const perPage = columns * rows;
    const cardW = 28;
    const cardH = 28;
    const xStart = 4;
    const yStart = 4;
    const xGap = 2;
    const yGap = 2;

    const arranged = sorted.map((item, index) => {
      const page = Math.floor(index / perPage);
      const local = index % perPage;
      const col = local % columns;
      const row = Math.floor(local / columns);
      return {
        ...item,
        page,
        x: xStart + col * (cardW + xGap),
        y: yStart + row * (cardH + yGap),
        w: cardW,
        h: cardH,
      };
    });

    setLayoutItems(arranged);
    setPageCount(Math.max(1, ...arranged.map((item) => item.page + 1)));
    setSelectedIds([]);
    setActivePage(0);
  };

  const overlaps = (a: LayoutItem, b: LayoutItem) => {
    return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
  };

  const condensePages = () => {
    const sorted = [...layoutItems].sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x);
    const placed: LayoutItem[] = [];

    for (const item of sorted) {
      let placedItem: LayoutItem | null = null;
      let targetPage = 0;
      while (!placedItem) {
        const onPage = placed.filter((p) => p.page === targetPage);
        let foundSpot = false;
        for (let y = 0; y <= 100 - item.h; y += GRID_Y) {
          for (let x = 0; x <= 100 - item.w; x += GRID_X) {
            const candidate = { ...item, page: targetPage, x, y };
            if (!onPage.some((p) => overlaps(candidate, p))) {
              placedItem = candidate;
              foundSpot = true;
              break;
            }
          }
          if (foundSpot) break;
        }
        if (!placedItem) targetPage += 1;
      }
      placed.push(placedItem);
    }

    setLayoutItems(placed);
    setPageCount(Math.max(1, ...placed.map((item) => item.page + 1)));
    setSelectedIds([]);
    setActivePage(0);
  };

  const applyGlobalThemeToPrint = async () => {
    if (!selectedThemeId) return;
    const theme = themes.find((entry) => entry.id === selectedThemeId);
    if (!theme) return;

    const selectedSet = new Set(selectedIds);
    const targetDeviceIds = selectedSet.size > 0
      ? Array.from(new Set(layoutItems.filter((item) => selectedSet.has(item.id)).map((item) => item.deviceId)))
      : devices.map((device) => device.id);
    if (targetDeviceIds.length === 0) return;
    const targetDeviceIdSet = new Set(targetDeviceIds);

    const effectiveBase = publicPortalUrl || baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
    const nextQrEntries = await Promise.all(
      devices
        .filter((device) => targetDeviceIdSet.has(device.id))
        .map(async (device) => {
        const deviceUrl = `${effectiveBase}/device/${device.uniqueCode}`;
        const qrSvg = await generateStyledQrSvg({
          url: deviceUrl,
          deviceName: device.name,
          settings: theme.settings ?? null,
        });
        return [device.id, qrSvg] as const;
      })
    );

    const nextQrMapDelta: Record<string, string> = Object.fromEntries(nextQrEntries);
    setQrByDeviceId((prev) => ({ ...prev, ...nextQrMapDelta }));
    setLayoutItems((prev) =>
      prev.map((item) =>
        targetDeviceIdSet.has(item.deviceId) ? { ...item, qrSvg: nextQrMapDelta[item.deviceId] ?? item.qrSvg } : item
      )
    );
  };

  const applyGlobalQrSizeInches = () => {
    const inches = Number(globalQrSizeInches);
    if (!Number.isFinite(inches) || inches <= 0) return;
    const widthPct = clamp((inches / PAGE_WIDTH_IN) * 100, MIN_SIZE, 100);
    const heightPct = clamp((inches / PAGE_HEIGHT_IN) * 100, MIN_SIZE, 100);
    const selectedSet = new Set(selectedIds);

    setLayoutItems((prev) =>
      prev.map((item) => ({
        ...item,
        w: selectedSet.size === 0 || selectedSet.has(item.id) ? clamp(widthPct, MIN_SIZE, 100 - item.x) : item.w,
        h: selectedSet.size === 0 || selectedSet.has(item.id) ? clamp(heightPct, MIN_SIZE, 100 - item.y) : item.h,
      }))
    );
  };

  const addBlankPage = () => {
    setPageCount((prev) => prev + 1);
    setActivePage(pageCount);
  };

  const removeActiveBlankPage = () => {
    const hasItems = layoutItems.some((item) => item.page === activePage);
    if (hasItems || pageCount <= 1) return;

    setLayoutItems((prev) =>
      prev.map((item) => (item.page > activePage ? { ...item, page: item.page - 1 } : item))
    );
    setPageCount((prev) => Math.max(1, prev - 1));
    setActivePage((prev) => Math.max(0, prev - 1));
  };

  const serializeLayout = (): PersistedLayoutData => ({
    version: 1,
    items: layoutItems.map((item) => ({
      deviceId: item.deviceId,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      page: item.page,
    })),
  });

  const applyLayoutData = (data: PersistedLayoutData) => {
    const validItems = (data?.items ?? [])
      .map((it) => {
        const device = deviceMap[it.deviceId];
        const qr = qrByDeviceId[it.deviceId];
        if (!device || !qr) return null;

        return {
          id: uid(),
          deviceId: device.id,
          name: device.name,
          uniqueCode: device.uniqueCode,
          qrSvg: qr,
          x: clamp(it.x, 0, 100 - MIN_SIZE),
          y: clamp(it.y, 0, 100 - MIN_SIZE),
          w: clamp(it.w, MIN_SIZE, 100),
          h: clamp(it.h, MIN_SIZE, 100),
          page: Math.max(0, Math.floor(it.page ?? 0)),
        } as LayoutItem;
      })
      .filter((item): item is LayoutItem => Boolean(item));

    if (validItems.length > 0) {
      setLayoutItems(validItems);
      setPageCount(Math.max(1, ...validItems.map((item) => item.page + 1)));
      setSelectedIds([]);
      setActivePage(0);
    }
  };

  const refreshSavedLayouts = async () => {
    try {
      const res = await fetch("/api/print-layouts");
      if (!res.ok) return;
      const layouts = await res.json();
      setSavedLayouts((layouts ?? []) as SavedLayout[]);
    } catch (error) {
      console.error("Failed to refresh layouts:", error);
    }
  };

  const handleCreateLayout = async () => {
    const name = layoutName.trim();
    if (!name || busy) return;

    setBusy(true);
    try {
      const res = await fetch("/api/print-layouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          data: serializeLayout(),
        }),
      });

      if (!res.ok) return;
      const created = (await res.json()) as SavedLayout;
      setSavedLayouts((prev) => [created, ...prev]);
      setSelectedLayoutId(created.id);
      setLayoutName("");
    } catch (error) {
      console.error("Failed to save layout:", error);
    } finally {
      setBusy(false);
    }
  };

  const handleOverwriteLayout = async () => {
    if (!selectedLayoutId || busy) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/print-layouts/${selectedLayoutId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: serializeLayout() }),
      });

      if (!res.ok) return;
      await refreshSavedLayouts();
    } catch (error) {
      console.error("Failed to overwrite layout:", error);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteSavedLayout = async () => {
    if (!selectedLayoutId || busy) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/print-layouts/${selectedLayoutId}`, {
        method: "DELETE",
      });
      if (!res.ok) return;
      setSelectedLayoutId("");
      await refreshSavedLayouts();
    } catch (error) {
      console.error("Failed to delete saved layout:", error);
    } finally {
      setBusy(false);
    }
  };

  const handleLoadSelected = () => {
    if (!selectedLayoutId) return;
    const layout = savedLayouts.find((entry) => entry.id === selectedLayoutId);
    if (!layout) return;
    applyLayoutData(layout.data);
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 no-print">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
              </Link>
              <h1 className="font-bold text-gray-900 dark:text-white">Print QR Sheet (8.5x11)</h1>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Printer size={16} /> Print
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 flex flex-col lg:flex-row gap-6">
        <aside className="w-full lg:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 no-print">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Layout Controls</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Ctrl+click blocks to multi-select, then drag to move together or apply style changes to selected.
          </p>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={deleteSelected}
              disabled={selectedIds.length === 0}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={14} /> Delete
            </button>
            <button
              onClick={autoPaginate}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw size={14} /> Auto Paginate
            </button>
            <button
              onClick={condensePages}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw size={14} /> Condense Pages
            </button>
            <button
              onClick={addBlankPage}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <Plus size={14} /> Add Blank Page
            </button>
            <button
              onClick={removeActiveBlankPage}
              disabled={pageCount <= 1 || layoutItems.some((item) => item.page === activePage)}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={14} /> Remove Blank Page
            </button>
          </div>

          <div className="border rounded-lg border-gray-200 dark:border-gray-700 p-3 mb-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Print-only Global Styling</h3>
            <div className="space-y-2">
              <label className="text-xs text-gray-600 dark:text-gray-300">
                Apply theme to {selectedIds.length > 0 ? "selected QR codes" : "all QR codes"} (print only)
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedThemeId}
                  onChange={(e) => setSelectedThemeId(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                >
                  <option value="">Select theme...</option>
                  {themes.map((theme) => (
                    <option key={theme.id} value={theme.id}>{theme.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => void applyGlobalThemeToPrint()}
                  disabled={!selectedThemeId}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 disabled:opacity-40"
                >
                  Apply
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-600 dark:text-gray-300">
                Set QR size for {selectedIds.length > 0 ? "selected cards" : "all cards"} (inches)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={globalQrSizeInches}
                  onChange={(e) => setGlobalQrSizeInches(e.target.value)}
                  className="w-28 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                />
                <button
                  onClick={applyGlobalQrSizeInches}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
                >
                  Apply Size
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 mb-4">
            <label className="text-sm text-gray-700 dark:text-gray-300">Snap to 0.25" grid</label>
            <input
              type="checkbox"
              checked={snapEnabled}
              onChange={(e) => setSnapEnabled(e.target.checked)}
              className="h-4 w-4"
            />
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Saved Layouts (Per User)</h3>

            <select
              value={selectedLayoutId}
              onChange={(e) => setSelectedLayoutId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm mb-2"
            >
              <option value="">Select saved layout...</option>
              {savedLayouts.map((layout) => (
                <option key={layout.id} value={layout.id}>
                  {layout.name}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-3 gap-2 mb-2">
              <button
                onClick={handleLoadSelected}
                disabled={!selectedLayoutId || busy}
                className="inline-flex items-center justify-center gap-1 px-2 py-2 rounded-lg border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 disabled:opacity-40"
              >
                <FolderOpen size={12} /> Load
              </button>
              <button
                onClick={handleOverwriteLayout}
                disabled={!selectedLayoutId || busy}
                className="inline-flex items-center justify-center gap-1 px-2 py-2 rounded-lg border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 disabled:opacity-40"
              >
                <Save size={12} /> Save
              </button>
              <button
                onClick={handleDeleteSavedLayout}
                disabled={!selectedLayoutId || busy}
                className="inline-flex items-center justify-center gap-1 px-2 py-2 rounded-lg border border-red-300 text-red-700 text-xs hover:bg-red-50 disabled:opacity-40"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={layoutName}
                onChange={(e) => setLayoutName(e.target.value)}
                placeholder="New layout name"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
              />
              <button
                onClick={handleCreateLayout}
                disabled={!layoutName.trim() || busy}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-40"
              >
                Create
              </button>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Add Removed Devices</h3>
            {hiddenDevices.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No hidden devices.</p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {hiddenDevices.map((device) => (
                  <button
                    key={device.id}
                    onClick={() => addDeviceToPage(device)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm text-gray-800 dark:text-gray-200 inline-flex items-center justify-between"
                  >
                    <span className="truncate">{device.name}</span>
                    <Plus size={14} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <section className="flex-1 overflow-auto">
          <div className="no-print flex flex-wrap items-center gap-2 mb-3">
            {Array.from({ length: pageCount }).map((_, index) => (
              <button
                key={index}
                onClick={() => setActivePage(index)}
                className={`px-3 py-1.5 rounded-lg text-sm border ${
                  activePage === index
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Page {index + 1}
              </button>
            ))}
          </div>

          <div className="print-root mx-auto space-y-8">
            {Array.from({ length: pageCount }).map((_, pageIndex) => {
              const items = layoutItems.filter((item) => item.page === pageIndex);
              const showGuides = guides.page === pageIndex && interaction !== null;

              return (
                <div key={pageIndex} className="page-shell relative inline-block ml-8 mt-8">
                  <div
                    className="no-print absolute left-0 right-0 bg-white/90 dark:bg-gray-800/90 border border-gray-300 dark:border-gray-600 rounded-t-md"
                    style={{ top: `-${RULER_SIZE_PX}px`, height: `${RULER_SIZE_PX}px` }}
                  >
                    {Array.from({ length: PAGE_WIDTH_IN * 4 + 1 }).map((_, tick) => {
                      const x = (tick / (PAGE_WIDTH_IN * 4)) * 100;
                      const inch = tick / 4;
                      const isInch = tick % 4 === 0;
                      const isHalf = tick % 2 === 0;
                      const tickHeight = isInch ? 14 : isHalf ? 10 : 6;
                      return (
                        <div key={`top-ruler-${pageIndex}-${tick}`}>
                          <div
                            className="absolute bottom-0 w-px bg-gray-500 dark:bg-gray-300"
                            style={{ left: `${x}%`, height: `${tickHeight}px` }}
                          />
                          {isInch && (
                            <span
                              className="absolute top-0 -translate-x-1/2 text-[10px] text-gray-600 dark:text-gray-300"
                              style={{ left: `${x}%` }}
                            >
                              {inch}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div
                    className="no-print absolute top-0 bottom-0 bg-white/90 dark:bg-gray-800/90 border border-gray-300 dark:border-gray-600 rounded-l-md"
                    style={{ left: `-${RULER_SIZE_PX}px`, width: `${RULER_SIZE_PX}px` }}
                  >
                    {Array.from({ length: PAGE_HEIGHT_IN * 4 + 1 }).map((_, tick) => {
                      const y = (tick / (PAGE_HEIGHT_IN * 4)) * 100;
                      const inch = tick / 4;
                      const isInch = tick % 4 === 0;
                      const isHalf = tick % 2 === 0;
                      const tickWidth = isInch ? 14 : isHalf ? 10 : 6;
                      return (
                        <div key={`left-ruler-${pageIndex}-${tick}`}>
                          <div
                            className="absolute right-0 h-px bg-gray-500 dark:bg-gray-300"
                            style={{ top: `${y}%`, width: `${tickWidth}px` }}
                          />
                          {isInch && (
                            <span
                              className="absolute left-0 -translate-y-1/2 text-[10px] text-gray-600 dark:text-gray-300"
                              style={{ top: `${y}%` }}
                            >
                              {inch}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div
                    ref={(el) => {
                      pageRefs.current[pageIndex] = el;
                    }}
                    className={`print-page relative bg-white border border-gray-300 shadow-xl ${pageIndex !== activePage ? "opacity-70" : ""}`}
                    style={{ width: "8.5in", height: "11in", maxWidth: "100%", aspectRatio: "8.5 / 11" }}
                    onMouseDown={() => setSelectedIds([])}
                  >
                    {showGuides && (
                      <>
                        {guides.v.map((x) => (
                          <div
                            key={`v-${pageIndex}-${x}`}
                            className="no-print absolute top-0 bottom-0 w-px bg-blue-400/80 pointer-events-none"
                            style={{ left: `${x}%` }}
                          />
                        ))}
                        {guides.h.map((y) => (
                          <div
                            key={`h-${pageIndex}-${y}`}
                            className="no-print absolute left-0 right-0 h-px bg-blue-400/80 pointer-events-none"
                            style={{ top: `${y}%` }}
                          />
                        ))}
                      </>
                    )}

                    {items.map((item) => {
                      const selected = selectedIdSet.has(item.id);
                      return (
                        <div
                          key={item.id}
                          className={`print-item absolute select-none ${selected ? "ring-2 ring-blue-500" : "ring-1 ring-gray-300/70"}`}
                          style={{
                            left: `${item.x}%`,
                            top: `${item.y}%`,
                            width: `${item.w}%`,
                            height: `${item.h}%`,
                            cursor: interaction?.itemId === item.id && interaction.mode === "drag" ? "grabbing" : "grab",
                          }}
                          onMouseDown={(event) => startInteraction(event, item, "drag")}
                        >
                          <div className="no-print absolute left-1 right-1 top-1 z-10 flex items-center justify-between text-[11px] text-gray-600 pointer-events-none">
                            <div className="bg-white/85 dark:bg-gray-800/85 rounded px-1.5 py-0.5 inline-flex items-center gap-1">
                              <span className="truncate font-medium">{item.name}</span>
                              {selected ? (
                                <span className="inline-flex items-center gap-1 text-blue-600">
                                  <Move size={12} />
                                  <Maximize2 size={12} />
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="h-full w-full">
                            <div
                              className="print-svg h-full w-full [&_svg]:h-full [&_svg]:w-full"
                              dangerouslySetInnerHTML={{ __html: item.qrSvg }}
                            />
                          </div>

                          <button
                            type="button"
                            className="no-print absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center"
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation();
                              setLayoutItems((prev) => prev.filter((entry) => entry.id !== item.id));
                              setSelectedIds((prev) => prev.filter((id) => id !== item.id));
                            }}
                          >
                            <Trash2 size={12} />
                          </button>

                          <div
                            className="no-print absolute right-0 bottom-0 w-4 h-4 bg-blue-500 cursor-se-resize"
                            onMouseDown={(event) => startInteraction(event, item, "resize")}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <style jsx global>{`
        @media print {
          @page {
            size: Letter portrait;
            margin: 0;
          }

          html,
          body {
            width: 8.5in;
            margin: 0;
            padding: 0;
            overflow: visible !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          body * {
            visibility: hidden;
          }

          .print-root,
          .print-root * {
            visibility: visible;
          }

          .no-print {
            display: none !important;
          }

          .print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 8.5in;
            margin: 0;
            padding: 0;
            display: block !important;
            gap: 0 !important;
          }

          .page-shell {
            display: block !important;
            width: 8.5in !important;
            height: 11in !important;
            margin: 0 !important;
            padding: 0 !important;
            page-break-after: always;
            break-after: page;
            overflow: hidden !important;
          }

          .page-shell:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          .print-page {
            width: 8.5in !important;
            height: 11in !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            overflow: hidden !important;
            opacity: 1 !important;
          }

          .print-item {
            break-inside: avoid;
            border: none !important;
            background: transparent !important;
            overflow: hidden !important;
          }

          .print-svg,
          .print-svg svg {
            width: 100% !important;
            height: 100% !important;
            display: block !important;
            overflow: hidden !important;
          }
        }
      `}</style>
    </div>
  );
}
