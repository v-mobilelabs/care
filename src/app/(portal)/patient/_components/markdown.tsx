"use client";
import { Divider, List, Stack, Text, Title } from "@mantine/core";
import { Fragment, useEffect, useState } from "react";

// ── Inline parser ─────────────────────────────────────────────────────────────

export function parseInline(text: string, baseKey = 0): React.ReactNode {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
    let last = 0;
    let match: RegExpExecArray | null;
    let key = baseKey;
    while ((match = regex.exec(text)) !== null) {
        if (match.index > last) parts.push(text.slice(last, match.index));
        const raw = match[0];
        if (raw.startsWith("***")) {
            parts.push(<span key={key++} style={{ fontWeight: 700, fontStyle: "italic" }}>{raw.slice(3, -3)}</span>);
        } else if (raw.startsWith("**")) {
            parts.push(<span key={key++} style={{ fontWeight: 700 }}>{raw.slice(2, -2)}</span>);
        } else if (raw.startsWith("*")) {
            parts.push(<span key={key++} style={{ fontStyle: "italic" }}>{raw.slice(1, -1)}</span>);
        } else if (raw.startsWith("`")) {
            parts.push(
                <code key={key++} style={{ fontFamily: "monospace", fontSize: "0.85em", padding: "1px 5px", borderRadius: 4 }}>
                    {raw.slice(1, -1)}
                </code>
            );
        }
        last = match.index + raw.length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts.length === 1 ? parts[0] : <>{parts}</>;
}

// ── Block parser ──────────────────────────────────────────────────────────────

export type MdBlock =
    | { type: "heading"; level: 1 | 2 | 3 | 4; text: string }
    | { type: "rule" }
    | { type: "list_item"; ordered: boolean; text: string }
    | { type: "paragraph"; text: string }
    | { type: "blank" };

export function parseMdBlocks(markdown: string): MdBlock[] {
    const blocks: MdBlock[] = [];
    for (const line of markdown.split("\n")) {
        if (/^####\s/.test(line)) { blocks.push({ type: "heading", level: 4, text: line.slice(5) }); continue; }
        if (/^###\s/.test(line)) { blocks.push({ type: "heading", level: 3, text: line.slice(4) }); continue; }
        if (/^##\s/.test(line)) { blocks.push({ type: "heading", level: 2, text: line.slice(3) }); continue; }
        if (/^#\s/.test(line)) { blocks.push({ type: "heading", level: 1, text: line.slice(2) }); continue; }
        if (/^(\*\*\*|---|___)\s*$/.test(line.trim())) { blocks.push({ type: "rule" }); continue; }
        const ordered = /^\s*\d+\.\s+(.*)$/.exec(line);
        if (ordered) { blocks.push({ type: "list_item", ordered: true, text: ordered[1] ?? "" }); continue; }
        const unordered = /^\s*[-*]\s+(.+)$/.exec(line);
        if (unordered) { blocks.push({ type: "list_item", ordered: false, text: unordered[1] ?? "" }); continue; }
        if (!line.trim()) { blocks.push({ type: "blank" }); continue; }
        blocks.push({ type: "paragraph", text: line });
    }
    return blocks;
}

// ── Typing animation hook ────────────────────────────────────────────────────

function useTypingEffect(text: string, speed = 15) {
    const [displayedText, setDisplayedText] = useState("");
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        if (text.length === 0) {
            setDisplayedText("");
            setIsComplete(true);
            return;
        }

        let index = 0;
        setDisplayedText("");
        setIsComplete(false);

        const timer = setInterval(() => {
            if (index < text.length) {
                setDisplayedText(text.slice(0, index + 1));
                index++;
            } else {
                setIsComplete(true);
                clearInterval(timer);
            }
        }, speed);

        return () => clearInterval(timer);
    }, [text, speed]);

    return { displayedText, isComplete };
}

// ── Renderer ──────────────────────────────────────────────────────────────────

export function MarkdownContent({ text }: Readonly<{ text: string }>) {
    const { displayedText } = useTypingEffect(text, 8);
    const blocks = parseMdBlocks(displayedText);
    const nodes: React.ReactNode[] = [];
    let i = 0;
    while (i < blocks.length) {
        const block = blocks[i];
        if (!block) { i++; continue; }

        if (block.type === "blank") { i++; continue; }

        if (block.type === "rule") {
            nodes.push(<Divider key={i} my="sm" />);
            i++; continue;
        }

        if (block.type === "heading") {
            const sizeMap = { 1: "lg", 2: "md", 3: "sm", 4: "xs" } as const;
            const orderMap = { 1: 4, 2: 5, 3: 6, 4: 6 } as const;
            nodes.push(
                <Title key={i} order={orderMap[block.level]} size={sizeMap[block.level]}
                    mt={block.level <= 2 ? "md" : "xs"} mb={2}>
                    {parseInline(block.text, i * 100)}
                </Title>
            );
            i++; continue;
        }

        if (block.type === "list_item") {
            const items: MdBlock[] = [];
            const ordered = block.ordered;
            while (i < blocks.length) {
                const b = blocks[i];
                if (!b) break;
                if (b.type === "list_item") { items.push(b); i++; }
                else if (b.type === "blank") {
                    i++;
                    if (blocks[i]?.type !== "list_item") break;
                } else break;
            }
            nodes.push(
                <List key={`list-${i}`} type={ordered ? "ordered" : "unordered"} size="sm" spacing={4} withPadding>
                    {items.map((it, j) => it.type === "list_item" && (
                        <List.Item key={j}>
                            <Text component="span" size="sm">{parseInline(it.text, j * 1000)}</Text>
                        </List.Item>
                    ))}
                </List>
            );
            continue;
        }

        if (block.type === "paragraph") {
            const lines: string[] = [];
            while (i < blocks.length && blocks[i]?.type === "paragraph") {
                const b = blocks[i];
                if (b?.type === "paragraph") lines.push(b.text);
                i++;
            }
            nodes.push(
                <Text key={`p-${i}`} size="sm" style={{ lineHeight: 1.8 }}>
                    {lines.map((ln, j) => (
                        <Fragment key={j}>{j > 0 && <br />}{parseInline(ln, j * 500)}</Fragment>
                    ))}
                </Text>
            );
            continue;
        }

        i++;
    }
    return <Stack gap={6}>{nodes}</Stack>;
}
