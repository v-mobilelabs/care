import { useQuery } from "@tanstack/react-query";
import { chatKeys } from "@/app/(portal)/patient/_keys";
import type { PatientInviteDto } from "@/data/doctor-patients";

export function useInvitesQuery() {
  return useQuery<PatientInviteDto[]>({
    queryKey: chatKeys.doctorInvites(),
    queryFn: async () => {
      const res = await fetch("/api/doctor-patients/invites");
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(body.error?.message ?? "Failed to load invites");
      }
      return res.json() as Promise<PatientInviteDto[]>;
    },
  });
}
