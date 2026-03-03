import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

export function Hydrate({
  children,
  client,
}: {
  readonly children: React.ReactNode;
  readonly client: QueryClient;
}) {
  return (
    <HydrationBoundary state={dehydrate(client)}>{children}</HydrationBoundary>
  );
}
