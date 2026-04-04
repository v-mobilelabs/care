"use client";

import { Box, Group, Select, TextInput } from "@mantine/core";
import { IconSearch, IconSortAscending, IconSortDescending } from "@tabler/icons-react";
import { useDebouncedValue } from "@mantine/hooks";
import { useEffect, useState, useRef } from "react";

export interface ListToolbarProps<TFilter extends string, TSortField extends string = "date"> {
    // Search
    search: string;
    onSearchChange: (q: string) => void;
    searchPlaceholder?: string;

    // Filter
    filter: TFilter;
    onFilterChange: (f: TFilter) => void;
    filterData?: { label: string; value: TFilter }[];

    // Sort Field
    sortField?: TSortField;
    onSortFieldChange?: (f: TSortField) => void;
    sortFieldData?: { label: string; value: TSortField }[];

    // Sort Dir
    sortAsc: boolean;
    onSortAscChange: (asc: boolean) => void;

    // Optional Add/Action area
    actions?: React.ReactNode;
}

export function ListToolbar<TFilter extends string, TSortField extends string = "date">({
    search,
    onSearchChange,
    searchPlaceholder = "Search...",
    filter,
    onFilterChange,
    filterData,
    sortField,
    onSortFieldChange,
    sortFieldData,
    sortAsc,
    onSortAscChange,
    actions,
}: ListToolbarProps<TFilter, TSortField>) {
    // Local state for debounced searching
    const [localSearch, setLocalSearch] = useState(search);
    const [debouncedSearch] = useDebouncedValue(localSearch, 300);
    const isMounted = useRef(false);

    // Sync external search prop into local if changed outside
    useEffect(() => {
        setLocalSearch(search);
    }, [search]);

    // Push debounced search out
    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true;
            return;
        }
        if (debouncedSearch !== search) {
            onSearchChange(debouncedSearch);
        }
    }, [debouncedSearch, search, onSearchChange]);

    return (
        <Group justify="space-between" align="center" mt="md" mb="md" gap="md">
            {/* Left side: Search, Filter, Sort inline */}
            <Group gap="sm" flex={1} wrap="nowrap">
                {/* Search Input */}
                <TextInput
                    placeholder={searchPlaceholder}
                    leftSection={<IconSearch size={16} />}
                    size="sm"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.currentTarget.value)}
                    style={{ flex: 1, minWidth: 200, maxWidth: 350 }}
                />

                {/* Filter Dropdown */}
                {filterData && filterData.length > 0 && (
                    <Select
                        size="sm"
                        value={filter}
                        onChange={(v) => onFilterChange(v as TFilter)}
                        data={filterData}
                        allowDeselect={false}
                        style={{ flexShrink: 0, width: 140 }}
                    />
                )}

                {/* Sort Field Dropdown */}
                {sortFieldData && sortField && onSortFieldChange && sortFieldData.length > 0 && (
                    <Select
                        size="sm"
                        value={sortField}
                        onChange={(v) => onSortFieldChange(v as TSortField)}
                        data={sortFieldData}
                        allowDeselect={false}
                        style={{ flexShrink: 0, width: 140 }}
                    />
                )}

                {/* Sort Togggle Button */}
                <Box
                    component="button"
                    onClick={() => onSortAscChange(!sortAsc)}
                    style={{
                        all: "unset",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        height: 36,
                        padding: "0 12px",
                        fontSize: "var(--mantine-font-size-sm)",
                        fontWeight: 500,
                        color: "var(--mantine-color-text)",
                        background: "light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))",
                        borderRadius: "var(--mantine-radius-md)",
                        transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))";
                    }}
                >
                    {sortAsc ? <IconSortAscending size={16} /> : <IconSortDescending size={16} />}
                    {sortAsc ? "Oldest" : "Newest"}
                </Box>
            </Group>

            {/* Right side: Actions (Add button, etc) */}
            {actions && (
                <Group gap="sm">
                    {actions}
                </Group>
            )}
        </Group>
    );
}
