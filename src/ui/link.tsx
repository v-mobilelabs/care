import NextLink from "next/link";
import type { ComponentProps } from "react";

export { useLinkStatus } from "next/link";

type LinkProps = ComponentProps<typeof NextLink>;

/**
 * Thin wrapper around `next/link` that defaults `prefetch` to `false`.
 * Import this instead of `next/link` everywhere to disable automatic
 * route prefetching across the app.
 */
function Link({ prefetch = false, ...props }: LinkProps) {
    return <NextLink prefetch={prefetch} {...props} />;
}

export default Link;
