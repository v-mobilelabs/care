import { formatDate } from "@/lib/format";

export type DateTextProps = Readonly<{
    date: string | Date;
}>;

export function DateText({ date }: DateTextProps) {
    const iso = typeof date === "string" ? date : date.toISOString();
    return (
        formatDate(iso)
    );
}
