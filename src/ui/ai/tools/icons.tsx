import {
    IconAdjustments,
    IconAlertTriangle,
    IconChecklist,
    IconCircleDot,
    IconClock,
    IconDroplet,
    IconFlame,
    IconHandClick,
    IconHeartbeat,
    IconMoodSad,
    IconMoodSmile,
    IconPencil,
    IconQuestionMark,
    IconScale,
    IconThermometer,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import type { QuestionType } from "@/ui/ai/types";

// ── Option icon mapping ───────────────────────────────────────────────────────

function getTemperatureIcon(t: string): ReactNode | null {
    if (t.startsWith("normal")) return <IconThermometer size={14} />;
    if (t.startsWith("low-grade")) return <IconThermometer size={14} />;
    if (t.startsWith("high fever")) return <IconFlame size={14} />;
    if (t.startsWith("very high")) return <IconAlertTriangle size={14} />;
    if (/haven.?t measured|haven.?t checked|not measured|didn.?t check/.test(t)) return <IconQuestionMark size={14} />;
    return null;
}

function getPainIcon(t: string): ReactNode | null {
    if (t.startsWith("sharp")) return <IconAlertTriangle size={14} />;
    if (t.startsWith("dull")) return <IconScale size={14} />;
    if (t.startsWith("burning")) return <IconFlame size={14} />;
    if (t.startsWith("throbbing")) return <IconHeartbeat size={14} />;
    if (t.startsWith("cramping")) return <IconDroplet size={14} />;
    if (t.startsWith("pressure")) return <IconHeartbeat size={14} />;
    return null;
}

function getSeverityIcon(t: string): ReactNode | null {
    if (t === "mild") return <IconMoodSmile size={14} />;
    if (t === "moderate") return <IconScale size={14} />;
    if (t === "severe") return <IconMoodSad size={14} />;
    if (t.startsWith("sudden")) return <IconAlertTriangle size={14} />;
    if (t.startsWith("gradual") || t.startsWith("chronic")) return <IconClock size={14} />;
    return null;
}

export function getOptionIcon(opt: string): ReactNode | null {
    const t = opt.toLowerCase();
    return getTemperatureIcon(t) ?? getPainIcon(t) ?? getSeverityIcon(t);
}

// ── Type-specific question icon ───────────────────────────────────────────────

export function getTypeIcon(type: QuestionType): ReactNode {
    switch (type) {
        case "yes_no": return <IconHandClick size={16} />;
        case "single_choice": return <IconCircleDot size={16} />;
        case "multi_choice": return <IconChecklist size={16} />;
        case "scale": return <IconAdjustments size={16} />;
        case "free_text": return <IconPencil size={16} />;
    }
}
