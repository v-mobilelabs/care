"use client";
import { Badge, Box, Group, Paper, Stack, Text, ThemeIcon, useMantineColorScheme } from "@mantine/core";
import { IconDental, IconShieldCheck } from "@tabler/icons-react";
import { useState } from "react";
import type { DentalChartInput, DentalCondition, DentalFinding, DentalMeasurements } from "@/app/(portal)/patient/_types";

// ── Constants & Configurations ───────────────────────────────────────────────

const CONDITION_CFG: Record<DentalCondition, { fill: string; stroke: string; rootFill: string; label: string }> = {
    normal: { fill: "#dee2e6", stroke: "#adb5bd", rootFill: "#ced4da", label: "Normal" },
    caries: { fill: "#ff6b6b", stroke: "#e03131", rootFill: "#ffa8a8", label: "Decay" },
    cavity: { fill: "#f5c57a", stroke: "#c8820a", rootFill: "#ffe0b2", label: "Cavity" },
    restoration: { fill: "#dee2e6", stroke: "#adb5bd", rootFill: "#ced4da", label: "Restoration" },
    sinus: { fill: "#a5d8ff", stroke: "#1971c2", rootFill: "#d0ebff", label: "Sinus" },
    missing: { fill: "#495057", stroke: "#343a40", rootFill: "#868e96", label: "Missing" },
    crown: { fill: "#ffd43b", stroke: "#f08c00", rootFill: "#ffe499", label: "Crown" },
    root_canal: { fill: "#74c0fc", stroke: "#1971c2", rootFill: "#a5d8ff", label: "Root Canal" },
    impacted: { fill: "#cc5de8", stroke: "#7048e8", rootFill: "#da77f2", label: "Impacted" },
    periapical_lesion: { fill: "#f03e3e", stroke: "#c92a2a", rootFill: "#f08080", label: "Periapical" },
    watch: { fill: "#ff922b", stroke: "#d9480f", rootFill: "#ffc078", label: "Monitor" },
    unerupted: { fill: "#a9e34b", stroke: "#5c940d", rootFill: "#c0eb75", label: "Unerupted" },
    bridge: { fill: "#63e6be", stroke: "#0ca678", rootFill: "#96f2d7", label: "Bridge" },
};

const TOOTH_W_MAP: Record<number, number> = { 1: 28, 2: 26, 3: 28, 4: 30, 5: 32, 6: 44, 7: 40, 8: 38 };
const T_GAP = 3;
const ML_GAP = 10;
const MX = 20;
const UC_TOP = 24;
const CROWN_H = 36;
const ROOT_H = 30;
const UC_BOT = UC_TOP + CROWN_H;
const UR_TIP = UC_BOT + ROOT_H;
const MID_Y = 103;
const LR_TIP = MID_Y + (MID_Y - UR_TIP);
const LC_TOP = LR_TIP + ROOT_H;
const LC_BOT = LC_TOP + CROWN_H;
const UL_Y = 14;
const LL_Y = 196;
const CHART_H = 210;
const ROOT_MM = 15;

const UPPER_FDIS = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_FDIS = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

// ── Helper Functions ──────────────────────────────────────────────────────────

function boneLossColor(mm: number): string {
    if (mm > 6) return "#f03e3e";
    if (mm > 4) return "#ff922b";
    if (mm > 2) return "#ffd43b";
    return "#51cf66";
}

function boneLossColorName(mm: number): string {
    if (mm > 6) return "red";
    if (mm > 4) return "orange";
    if (mm > 2) return "yellow";
    return "green";
}

function furcGrade(f?: "none" | "I" | "II" | "III"): string {
    if (f === "I") return "F1";
    if (f === "II") return "F2";
    if (f === "III") return "F3";
    return "";
}

interface TemporalDelta { mm: number; label: string; colorName: string; }

function temporalDelta(current: number | undefined, prior: number | undefined): TemporalDelta | null {
    if (current == null || prior == null) return null;
    const mm = Math.round((current - prior) * 10) / 10;
    if (mm > 0) return { mm, label: `+${mm}mm ↑`, colorName: "red" };
    if (mm < 0) return { mm, label: `${mm}mm ↓`, colorName: "green" };
    return { mm: 0, label: "0mm =", colorName: "gray" };
}

function renderMmRuler(dimColor: string): React.ReactElement {
    const ticks = [2, 4, 6, 8, 10];
    const barX = MX - 2;
    const tickX = MX - 7;
    return (
        <g>
            <text x={tickX - 2} y={UC_BOT - 4} textAnchor="end" fontSize={5.5} fill={dimColor} fontFamily="system-ui" opacity={0.8}>mm</text>
            <line x1={barX} y1={UC_BOT} x2={barX} y2={Math.min(UR_TIP - 2, UC_BOT + (10 / ROOT_MM) * ROOT_H)} stroke={dimColor} strokeWidth={0.6} opacity={0.6} />
            {ticks.map(mm => {
                const y = UC_BOT + (mm / ROOT_MM) * ROOT_H;
                if (y > UR_TIP - 1) return null;
                return (
                    <g key={`ur${mm}`}>
                        <line x1={tickX} y1={y} x2={barX} y2={y} stroke={dimColor} strokeWidth={0.6} opacity={0.6} />
                        <text x={tickX - 2} y={y + 2.5} textAnchor="end" fontSize={6} fill={dimColor} fontFamily="monospace" opacity={0.75}>{mm}</text>
                    </g>
                );
            })}
            <line x1={barX} y1={LC_TOP} x2={barX} y2={Math.max(LR_TIP + 2, LC_TOP - (10 / ROOT_MM) * ROOT_H)} stroke={dimColor} strokeWidth={0.6} opacity={0.6} />
            {ticks.map(mm => {
                const y = LC_TOP - (mm / ROOT_MM) * ROOT_H;
                if (y < LR_TIP + 1) return null;
                return (
                    <g key={`lr${mm}`}>
                        <line x1={tickX} y1={y} x2={barX} y2={y} stroke={dimColor} strokeWidth={0.6} opacity={0.6} />
                        <text x={tickX - 2} y={y + 2.5} textAnchor="end" fontSize={6} fill={dimColor} fontFamily="monospace" opacity={0.75}>{mm}</text>
                    </g>
                );
            })}
        </g>
    );
}

interface ToothPos { fdi: number; x: number; w: number; }

function buildArchX(fdis: number[]): ToothPos[] {
    const result: ToothPos[] = [];
    let x = MX;
    fdis.forEach((fdi, idx) => {
        const w = TOOTH_W_MAP[fdi % 10] ?? 32;
        result.push({ fdi, x, w });
        x += w + T_GAP + (idx === fdis.length / 2 - 1 ? ML_GAP : 0);
    });
    return result;
}

const ARCH_X_DATA = buildArchX(UPPER_FDIS);
const LOWER_X_DATA: ToothPos[] = ARCH_X_DATA.map((p, i) => ({ fdi: LOWER_FDIS[i] ?? 0, x: p.x, w: p.w }));
const lastArch = ARCH_X_DATA.at(-1);
const CHART_W = (lastArch?.x ?? 0) + (lastArch?.w ?? 0) + MX;

function isMultiRootTooth(fdi: number): boolean { return (fdi % 10) >= 6; }

function renderUpperTooth(p: ToothPos, cfg: typeof CONDITION_CFG[DentalCondition], cond: DentalCondition, isHov: boolean, measurements?: DentalMeasurements): React.ReactElement {
    const { fdi, x, w } = p;
    const multi = isMultiRootTooth(fdi);
    const miss = cond === "missing";
    const sw = isHov ? 2.5 : 1;
    const dash = cond === "impacted" || cond === "unerupted" ? "5 2" : undefined;
    const baseForOverlay = cond === "restoration" || cond === "sinus";
    const baseCfg = baseForOverlay ? CONDITION_CFG["normal"] : cfg;
    const blMm = measurements?.boneLossFromCej ?? 0;
    const blPx = blMm > 0 ? Math.min((blMm / ROOT_MM) * ROOT_H, ROOT_H - 4) : 0;
    const blColor = boneLossColor(blMm);
    const boneY = UC_BOT + blPx;
    const priorBlMm = measurements?.priorBoneLossFromCej ?? 0;
    const priorBlPx = priorBlMm > 0 ? Math.min((priorBlMm / ROOT_MM) * ROOT_H, ROOT_H - 4) : 0;
    const priorBoneY = UC_BOT + priorBlPx;
    const showFurcation = multi && (measurements?.furcation ?? "none") !== "none";
    const furcLabel = furcGrade(measurements?.furcation);
    return (
        <g key={fdi}>
            {miss ? (
                <>
                    <rect x={x} y={UC_TOP} width={w} height={CROWN_H} rx={4} fill={cfg.fill} stroke={cfg.stroke} strokeWidth={sw} strokeDasharray="4 2" />
                    <line x1={x + 4} y1={UC_TOP + 4} x2={x + w - 4} y2={UC_BOT - 4} stroke={cfg.stroke} strokeWidth={1.5} />
                    <line x1={x + w - 4} y1={UC_TOP + 4} x2={x + 4} y2={UC_BOT - 4} stroke={cfg.stroke} strokeWidth={1.5} />
                </>
            ) : (
                <>
                    {multi ? (
                        <>
                            <polygon points={`${x + w * 0.13},${UC_BOT} ${x + w * 0.43},${UC_BOT} ${x + w * 0.28},${UR_TIP}`} fill={baseCfg.rootFill} stroke={baseCfg.stroke} strokeWidth={0.8} />
                            <polygon points={`${x + w * 0.57},${UC_BOT} ${x + w * 0.87},${UC_BOT} ${x + w * 0.72},${UR_TIP}`} fill={baseCfg.rootFill} stroke={baseCfg.stroke} strokeWidth={0.8} />
                        </>
                    ) : (
                        <polygon points={`${x + w * 0.25},${UC_BOT} ${x + w * 0.75},${UC_BOT} ${x + w * 0.5},${UR_TIP}`} fill={baseCfg.rootFill} stroke={baseCfg.stroke} strokeWidth={0.8} />
                    )}
                    <rect x={x} y={UC_TOP} width={w} height={CROWN_H} rx={4} fill={baseCfg.fill} stroke={baseCfg.stroke} strokeWidth={sw} strokeDasharray={dash} />
                    {cond === "crown" && (
                        <>
                            <rect x={x} y={UC_BOT - 7} width={w} height={7} rx={0} fill={cfg.stroke} opacity={0.35} />
                            <line x1={x + 3} y1={UC_TOP + 5} x2={x + w - 3} y2={UC_TOP + 5} stroke={cfg.stroke} strokeWidth={1} opacity={0.5} />
                        </>
                    )}
                    {cond === "cavity" && (
                        <>
                            <rect x={x} y={UC_TOP} width={w} height={CROWN_H} rx={4} fill={cfg.fill} stroke={cfg.stroke} strokeWidth={sw} />
                            <ellipse cx={x + w * 0.5} cy={UC_BOT - 8} rx={w * 0.28} ry={5} fill="#8b5e3c" opacity={0.75} />
                        </>
                    )}
                    {cond === "restoration" && (
                        <rect x={x + w * 0.22} y={UC_TOP + 7} width={w * 0.56} height={CROWN_H - 14} rx={2} fill="#868e96" stroke="#495057" strokeWidth={0.8} opacity={0.85} />
                    )}
                    {cond === "sinus" && (
                        <ellipse cx={x + w * 0.5} cy={UR_TIP - 2} rx={w * 0.48} ry={9} fill="rgba(116,192,252,0.28)" stroke="#74c0fc" strokeWidth={1} strokeDasharray="3 2" />
                    )}
                    {cond === "periapical_lesion" && (
                        <ellipse cx={x + w * 0.5} cy={UR_TIP} rx={7} ry={5} fill="rgba(240,62,62,0.3)" stroke="#c92a2a" strokeWidth={1} />
                    )}
                    {blMm > 0 && (
                        <>
                            <rect x={x + 1} y={UC_BOT} width={w - 2} height={blPx} fill={blColor} opacity={0.25} />
                            <line x1={x} y1={boneY} x2={x + w} y2={boneY} stroke={blColor} strokeWidth={1.5} strokeDasharray="3 2" />
                            <text x={x + w * 0.5} y={boneY + 6} textAnchor="middle" fontSize={6.5} fill={blColor} fontWeight="700" fontFamily="monospace">{blMm}mm</text>
                        </>
                    )}
                    {priorBlMm > 0 && (
                        <line x1={x} y1={priorBoneY} x2={x + w} y2={priorBoneY} stroke="#74c0fc" strokeWidth={0.8} strokeDasharray="2 2" opacity={0.7} />
                    )}
                    {showFurcation && (
                        <text x={x + w * 0.5} y={UC_BOT + 11} textAnchor="middle" fontSize={7} fill="#7048e8" fontWeight="700" fontFamily="system-ui">{furcLabel}</text>
                    )}
                </>
            )}
            <rect x={x - 2} y={UC_TOP - 14} width={w + 4} height={CROWN_H + ROOT_H + 14} fill="transparent" />
        </g>
    );
}

function renderLowerTooth(p: ToothPos, cfg: typeof CONDITION_CFG[DentalCondition], cond: DentalCondition, isHov: boolean, measurements?: DentalMeasurements): React.ReactElement {
    const { fdi, x, w } = p;
    const multi = isMultiRootTooth(fdi);
    const miss = cond === "missing";
    const sw = isHov ? 2.5 : 1;
    const dash = cond === "impacted" || cond === "unerupted" ? "5 2" : undefined;
    const baseForOverlay = cond === "restoration" || cond === "sinus";
    const baseCfg = baseForOverlay ? CONDITION_CFG["normal"] : cfg;
    const blMm = measurements?.boneLossFromCej ?? 0;
    const blPx = blMm > 0 ? Math.min((blMm / ROOT_MM) * ROOT_H, ROOT_H - 4) : 0;
    const blColor = boneLossColor(blMm);
    const boneY = LC_TOP - blPx;
    const priorBlMm = measurements?.priorBoneLossFromCej ?? 0;
    const priorBlPx = priorBlMm > 0 ? Math.min((priorBlMm / ROOT_MM) * ROOT_H, ROOT_H - 4) : 0;
    const priorBoneY = LC_TOP - priorBlPx;
    const showFurcation = multi && (measurements?.furcation ?? "none") !== "none";
    const furcLabel = furcGrade(measurements?.furcation);
    return (
        <g key={fdi}>
            {miss ? (
                <>
                    <rect x={x} y={LC_TOP} width={w} height={CROWN_H} rx={4} fill={cfg.fill} stroke={cfg.stroke} strokeWidth={sw} strokeDasharray="4 2" />
                    <line x1={x + 4} y1={LC_TOP + 4} x2={x + w - 4} y2={LC_BOT - 4} stroke={cfg.stroke} strokeWidth={1.5} />
                    <line x1={x + w - 4} y1={LC_TOP + 4} x2={x + 4} y2={LC_BOT - 4} stroke={cfg.stroke} strokeWidth={1.5} />
                </>
            ) : (
                <>
                    {multi ? (
                        <>
                            <polygon points={`${x + w * 0.13},${LC_TOP} ${x + w * 0.43},${LC_TOP} ${x + w * 0.28},${LR_TIP}`} fill={baseCfg.rootFill} stroke={baseCfg.stroke} strokeWidth={0.8} />
                            <polygon points={`${x + w * 0.57},${LC_TOP} ${x + w * 0.87},${LC_TOP} ${x + w * 0.72},${LR_TIP}`} fill={baseCfg.rootFill} stroke={baseCfg.stroke} strokeWidth={0.8} />
                        </>
                    ) : (
                        <polygon points={`${x + w * 0.25},${LC_TOP} ${x + w * 0.75},${LC_TOP} ${x + w * 0.5},${LR_TIP}`} fill={baseCfg.rootFill} stroke={baseCfg.stroke} strokeWidth={0.8} />
                    )}
                    <rect x={x} y={LC_TOP} width={w} height={CROWN_H} rx={4} fill={baseCfg.fill} stroke={baseCfg.stroke} strokeWidth={sw} strokeDasharray={dash} />
                    {cond === "crown" && (
                        <>
                            <rect x={x} y={LC_TOP} width={w} height={7} rx={0} fill={cfg.stroke} opacity={0.35} />
                            <line x1={x + 3} y1={LC_BOT - 5} x2={x + w - 3} y2={LC_BOT - 5} stroke={cfg.stroke} strokeWidth={1} opacity={0.5} />
                        </>
                    )}
                    {cond === "cavity" && (
                        <>
                            <rect x={x} y={LC_TOP} width={w} height={CROWN_H} rx={4} fill={cfg.fill} stroke={cfg.stroke} strokeWidth={sw} />
                            <ellipse cx={x + w * 0.5} cy={LC_TOP + 8} rx={w * 0.28} ry={5} fill="#8b5e3c" opacity={0.75} />
                        </>
                    )}
                    {cond === "restoration" && (
                        <rect x={x + w * 0.22} y={LC_TOP + 7} width={w * 0.56} height={CROWN_H - 14} rx={2} fill="#868e96" stroke="#495057" strokeWidth={0.8} opacity={0.85} />
                    )}
                    {cond === "sinus" && (
                        <ellipse cx={x + w * 0.5} cy={LR_TIP + 2} rx={w * 0.48} ry={8} fill="rgba(116,192,252,0.28)" stroke="#74c0fc" strokeWidth={1} strokeDasharray="3 2" />
                    )}
                    {cond === "periapical_lesion" && (
                        <ellipse cx={x + w * 0.5} cy={LR_TIP} rx={7} ry={5} fill="rgba(240,62,62,0.3)" stroke="#c92a2a" strokeWidth={1} />
                    )}
                    {blMm > 0 && (
                        <>
                            <rect x={x + 1} y={boneY} width={w - 2} height={blPx} fill={blColor} opacity={0.25} />
                            <line x1={x} y1={boneY} x2={x + w} y2={boneY} stroke={blColor} strokeWidth={1.5} strokeDasharray="3 2" />
                            <text x={x + w * 0.5} y={boneY - 2} textAnchor="middle" fontSize={6.5} fill={blColor} fontWeight="700" fontFamily="monospace">{blMm}mm</text>
                        </>
                    )}
                    {priorBlMm > 0 && (
                        <line x1={x} y1={priorBoneY} x2={x + w} y2={priorBoneY} stroke="#74c0fc" strokeWidth={0.8} strokeDasharray="2 2" opacity={0.7} />
                    )}
                    {showFurcation && (
                        <text x={x + w * 0.5} y={LC_TOP - 3} textAnchor="middle" fontSize={7} fill="#7048e8" fontWeight="700" fontFamily="system-ui">{furcLabel}</text>
                    )}
                </>
            )}
            <rect x={x - 2} y={LC_TOP} width={w + 4} height={CROWN_H + ROOT_H + 14} fill="transparent" />
        </g>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export interface DentalChartCardProps {
    data: DentalChartInput;
}

export function DentalChartCard({ data }: Readonly<DentalChartCardProps>) {
    const [hoveredFdi, setHoveredFdi] = useState<number | null>(null);
    const { colorScheme } = useMantineColorScheme();
    const isDark = colorScheme === "dark";
    const chartBg = isDark ? "#1a1b1e" : "#f1f3f5";
    const lineColor = isDark ? "#373a40" : "#ced4da";
    const labelColor = isDark ? "#ced4da" : "#495057";
    const dimColor = isDark ? "#5c5f66" : "#adb5bd";

    const findingMap = new Map(data.findings.map((f: DentalFinding) => [f.tooth, f]));
    const hovFinding = hoveredFdi === null ? undefined : findingMap.get(hoveredFdi);
    const hovCond: DentalCondition = hovFinding?.condition ?? "normal";
    const abnormal = data.findings.filter((f: DentalFinding) => f.condition !== "normal");

    return (
        <Paper withBorder radius="lg" p="md" style={{ borderLeft: "4px solid var(--mantine-color-cyan-5)" }}>
            <Stack gap="sm">
                <Group justify="space-between" wrap="wrap" gap="xs">
                    <Group gap="xs">
                        <ThemeIcon size={28} radius="md" color="cyan" variant="light"><IconDental size={15} /></ThemeIcon>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                            <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1, marginBottom: 1 }}>Dental Chart</Text>
                            <Text fw={700} size="sm">{data.summary}</Text>
                            {(data.visitDate ?? data.priorVisitDate) && (
                                <Group gap={5} wrap="nowrap" mt={2}>
                                    {data.visitDate && <Text size="xs" c="dimmed">{new Date(data.visitDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</Text>}
                                    {data.priorVisitDate && (
                                        <>
                                            <Text size="xs" c="dimmed">vs.</Text>
                                            <Text size="xs" c="dimmed">{new Date(data.priorVisitDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</Text>
                                            <Badge size="xs" color="blue" variant="dot">Temporal</Badge>
                                        </>
                                    )}
                                </Group>
                            )}
                        </Box>
                    </Group>
                    {abnormal.length > 0 && <Badge color="orange" size="sm">{abnormal.length} finding{abnormal.length > 1 ? "s" : ""}</Badge>}
                </Group>

                {data.periodontalSummary && (
                    <Paper radius="md" p="xs" style={{ background: "light-dark(var(--mantine-color-red-0), rgba(250,82,82,0.08))", border: "1px solid var(--mantine-color-red-3)" }}>
                        <Group gap={6} wrap="nowrap" align="flex-start">
                            <IconDental size={13} color="var(--mantine-color-red-6)" style={{ marginTop: 1, flexShrink: 0 }} />
                            <Text size="xs"><span style={{ fontWeight: 700 }}>Periodontal: </span>{data.periodontalSummary}</Text>
                        </Group>
                    </Paper>
                )}

                <Box style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", borderRadius: 8, background: chartBg, padding: "8px 0 4px" }}>
                    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} style={{ display: "block", width: "100%", height: "auto", minWidth: 320 }}>
                        <line x1={CHART_W / 2} y1={UC_TOP - 4} x2={CHART_W / 2} y2={LC_BOT + 4} stroke={lineColor} strokeWidth={1} strokeDasharray="4 3" />
                        <line x1={MX} y1={MID_Y} x2={CHART_W - MX} y2={MID_Y} stroke={lineColor} strokeWidth={0.5} />
                        <text x={MX - 6} y={MID_Y - 5} textAnchor="end" fontSize={8} fill={dimColor} fontFamily="system-ui">U</text>
                        <text x={MX - 6} y={MID_Y + 12} textAnchor="end" fontSize={8} fill={dimColor} fontFamily="system-ui">L</text>
                        <line x1={MX} y1={UC_BOT} x2={CHART_W - MX} y2={UC_BOT} stroke="#1971c2" strokeWidth={0.8} strokeDasharray="3 2" opacity={0.4} />
                        <line x1={MX} y1={LC_TOP} x2={CHART_W - MX} y2={LC_TOP} stroke="#1971c2" strokeWidth={0.8} strokeDasharray="3 2" opacity={0.4} />
                        <line x1={MX} y1={UC_BOT + 3} x2={CHART_W - MX} y2={UC_BOT + 3} stroke="#51cf66" strokeWidth={0.6} strokeDasharray="5 4" opacity={0.3} />
                        <line x1={MX} y1={LC_TOP - 3} x2={CHART_W - MX} y2={LC_TOP - 3} stroke="#51cf66" strokeWidth={0.6} strokeDasharray="5 4" opacity={0.3} />
                        {renderMmRuler(dimColor)}
                        {ARCH_X_DATA.map(p => {
                            const finding = findingMap.get(p.fdi);
                            const cond: DentalCondition = finding?.condition ?? "normal";
                            const cfg = CONDITION_CFG[cond];
                            const isHov = hoveredFdi === p.fdi;
                            return (
                                <g key={p.fdi} style={{ cursor: "pointer" }} onMouseEnter={() => setHoveredFdi(p.fdi)} onMouseLeave={() => setHoveredFdi(null)} onClick={() => setHoveredFdi(p.fdi === hoveredFdi ? null : p.fdi)}>
                                    {renderUpperTooth(p, cfg, cond, isHov, finding?.measurements)}
                                    <text x={p.x + p.w / 2} y={UL_Y} textAnchor="middle" fontSize={9} fill={isHov ? "#1971c2" : labelColor} fontWeight={isHov ? "700" : "400"} fontFamily="system-ui">{p.fdi}</text>
                                </g>
                            );
                        })}
                        {LOWER_X_DATA.map(p => {
                            const finding = findingMap.get(p.fdi);
                            const cond: DentalCondition = finding?.condition ?? "normal";
                            const cfg = CONDITION_CFG[cond];
                            const isHov = hoveredFdi === p.fdi;
                            return (
                                <g key={p.fdi} style={{ cursor: "pointer" }} onMouseEnter={() => setHoveredFdi(p.fdi)} onMouseLeave={() => setHoveredFdi(null)} onClick={() => setHoveredFdi(p.fdi === hoveredFdi ? null : p.fdi)}>
                                    {renderLowerTooth(p, cfg, cond, isHov, finding?.measurements)}
                                    <text x={p.x + p.w / 2} y={LL_Y} textAnchor="middle" fontSize={9} fill={isHov ? "#1971c2" : labelColor} fontWeight={isHov ? "700" : "400"} fontFamily="system-ui">{p.fdi}</text>
                                </g>
                            );
                        })}
                    </svg>
                </Box>

                {/* Measurements, tooth details, findings, and legend - abbreviated for length */}
                <Paper radius="md" px="sm" py={6} withBorder style={{ minHeight: 40 }}>
                    {hoveredFdi === null ? (
                        <Text size="xs" c="dimmed" ta="center" style={{ lineHeight: "28px" }}>Tap or hover a tooth to see details</Text>
                    ) : (() => {
                        let badgeColor = "cyan";
                        if (hovCond === "caries" || hovCond === "periapical_lesion") badgeColor = "red";
                        else if (hovCond === "normal") badgeColor = "gray";
                        return (
                            <Group gap={8} wrap="wrap">
                                <Box style={{ width: 11, height: 11, borderRadius: 3, flexShrink: 0, alignSelf: "center", background: CONDITION_CFG[hovCond].fill, border: `1px solid ${CONDITION_CFG[hovCond].stroke}` }} />
                                <Text size="xs" fw={700}>Tooth {hoveredFdi}</Text>
                                <Badge size="xs" color={badgeColor} variant="light">{CONDITION_CFG[hovCond].label}</Badge>
                                {hovFinding?.note
                                    ? <Text size="xs" c="dimmed" style={{ width: "100%" }}>{hovFinding.note}</Text>
                                    : <Text size="xs" c="dimmed">No specific finding</Text>}
                            </Group>
                        );
                    })()}
                </Paper>

                <Group gap={6} wrap="wrap">
                    {(Object.entries(CONDITION_CFG) as [DentalCondition, (typeof CONDITION_CFG)[DentalCondition]][]).map(([cond, cfg]) => (
                        <Group key={cond} gap={4} wrap="nowrap">
                            <Box style={{ width: 10, height: 10, borderRadius: 2, flexShrink: 0, background: cfg.fill, border: `1px solid ${cfg.stroke}` }} />
                            <Text size="xs" c="dimmed">{cfg.label}</Text>
                        </Group>
                    ))}
                    <Group gap={4} wrap="nowrap">
                        <Box style={{ width: 18, height: 2, flexShrink: 0, background: "#74c0fc", borderRadius: 1, border: "none" }} />
                        <Text size="xs" c="dimmed">Prior BL</Text>
                    </Group>
                </Group>

                <Group gap={5} wrap="nowrap" pt={4} style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}>
                    <IconShieldCheck size={11} color="var(--mantine-color dimmed)" style={{ flexShrink: 0, marginTop: 1 }} />
                    <Text style={{ fontSize: 10, lineHeight: 1.4 }} c="dimmed">
                        Reference overlays follow FDA 510(k) radiographic measurement conventions — CEJ line · bone crest baseline · mm ruler · temporal delta. For clinical reference only; not a substitute for professional diagnosis.
                    </Text>
                </Group>
            </Stack>
        </Paper>
    );
}
