import type { SessionPayload, UserKind } from "@/lib/auth/jwt";

export const ADMIN_HOME_PATH = "/console";

export function isAdminKind(kind: UserKind): boolean {
  return kind === "admin";
}

export function isAdminUser(
  user: Pick<SessionPayload, "kind"> | null | undefined,
): boolean {
  return user?.kind === "admin";
}

export function isConsolePath(pathname: string): boolean {
  return pathname === "/console" || pathname.startsWith("/console/");
}

export function getHomePathForKind(kind: UserKind): string {
  if (kind === "doctor") {
    return "/doctor/dashboard";
  }

  if (kind === "admin") {
    return ADMIN_HOME_PATH;
  }

  return "/user/assistant";
}
