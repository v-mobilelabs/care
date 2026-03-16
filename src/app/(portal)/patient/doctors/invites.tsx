"use client";
import { useInvitesQuery } from "./_query";
import type { PatientInviteDto } from "@/data/doctor-patients";

export function Invites({
    children,
    render,
}: {
    children?: (invites: PatientInviteDto[]) => React.ReactNode;
    render?: (invites: PatientInviteDto[]) => React.ReactNode;
}) {
    const { data: invites = [], isLoading, isError } = useInvitesQuery();
    if (isLoading) return null;
    if (isError) return null;
    if (render) return <>{render(invites)}</>;
    if (children) return <>{children(invites)}</>;
    return null;
}
