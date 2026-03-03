"use client";

import { Anchor, Breadcrumbs, Text } from "@mantine/core";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

type Application = {
    name: string;
    url: string;
};

type MenuItem = {
    label: string;
    href: string;
    children?: MenuItem[];
};

type BreadcrumbsBarProps = {
    application?: Application;
    menus?: MenuItem[];
};

function formatSegment(segment: string): string {
    const decoded = decodeURIComponent(segment);
    if (decoded === "new") return "Create";
    if (decoded === "edit") return "Edit";
    const isId = /^[0-9a-fA-F-]{8,}$/.test(decoded) || /^\d+$/.test(decoded);
    if (isId) return "Details";

    return decoded
        .replaceAll(/[-_]+/g, " ")
        .replaceAll(/\b\w/g, (char) => char.toUpperCase());
}

export function BreadcrumbsBar({
    application,
    menus,
}: Readonly<BreadcrumbsBarProps>) {
    const pathname = usePathname();

    const items = useMemo(() => {
        const segments = pathname.split("/").filter(Boolean);
        const lookup = new Map<string, string>();

        menus?.forEach((menu) => {
            lookup.set(menu.href, menu.label);
            menu.children?.forEach((child) => {
                lookup.set(child.href, child.label);
            });
        });

        const crumbs: { label: string; href?: string }[] = [];

        if (application) {
            crumbs.push({ label: application.name, href: application.url });
        }

        let startIndex = 0;
        if (application && segments.length > 0) {
            const firstHref = `/${segments[0]}`;
            if (firstHref === application.url) {
                startIndex = 1;
            }
        }

        let href = "";
        for (let i = 0; i < segments.length; i += 1) {
            href += `/${segments[i]}`;
            if (i < startIndex) continue;
            const label = lookup.get(href) ?? formatSegment(segments[i]);
            const isLast = i === segments.length - 1;
            crumbs.push({ label, href: isLast ? undefined : href });
        }

        return crumbs;
    }, [application, menus, pathname]);

    if (items.length <= 1) return null;

    return (
        <Breadcrumbs>
            {items.map((item, index) =>
                item.href ? (
                    <Anchor key={`${item.href}-${index}`} href={item.href} size="sm">
                        {item.label}
                    </Anchor>
                ) : (
                    <Text key={`${item.label}-${index}`} size="sm" c="dimmed">
                        {item.label}
                    </Text>
                ),
            )}
        </Breadcrumbs>
    );
}
