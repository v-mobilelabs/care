import type { ReferralSortDir, ReferralStatus } from "./referral.model";

export interface ReferralListQueryParams {
  status?: ReferralStatus;
  specialist?: string;
  q?: string;
  sortDir?: ReferralSortDir;
  limit?: number;
  cursor?: string;
}

export function buildReferralListSearchParams(
  input: ReferralListQueryParams,
): URLSearchParams {
  const params = new URLSearchParams();

  if (input.status) params.set("status", input.status);
  if (input.specialist) params.set("specialist", input.specialist);
  if (input.q) params.set("q", input.q);
  if (input.sortDir) params.set("sortDir", input.sortDir);
  if (input.limit) params.set("limit", String(input.limit));
  if (input.cursor) params.set("cursor", input.cursor);

  return params;
}

export function buildReferralListQueryString(
  input: ReferralListQueryParams,
): string {
  return buildReferralListSearchParams(input).toString();
}
