"use client";
import { Avatar } from '@mantine/core';
import { usePresenceStatus } from '@/lib/presence/use-presence-status';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';

export type UserCardProps = ComponentPropsWithoutRef<'div'> & Readonly<{
    name?: string;
    image?: string;
    uid?: string;
}>;

export const UserCard = forwardRef<HTMLDivElement, UserCardProps>(
    function UserCard({ name, image, uid, style, ...props }, ref) {
        const { online } = usePresenceStatus(uid ?? '');
        const outlineColor = online
            ? 'var(--mantine-color-success-outline)'
            : 'var(--mantine-color-danger-outline)';

        return (
            <Avatar
                ref={ref}
                src={image ?? undefined}
                alt={name ?? 'User'}
                name={name ?? undefined}
                style={{
                    cursor: 'pointer',
                    outline: `1px solid ${outlineColor}`,
                    outlineOffset: 3,
                    transition: 'outline-color 0.25s',
                    ...style
                }}
                color='initials'
                size="sm"
                {...props}
            />
        );
    }
);
