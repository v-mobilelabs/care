"use client";
import {
    IconLayoutDashboard,
    IconUserCircle,
    IconCalendarStats,
    IconPhone,
    IconStethoscope,
    IconUsers,
} from "@tabler/icons-react";
import { PortalLayout } from "@/ui/layouts/portal";
import { useQuery } from "@tanstack/react-query";
import type { ProfileDto } from "@/data/profile";
import { IncomingCallNotifications } from "./_incoming-call-toast";

const menus = [
    {
        label: "Dashboard",
        icon: <IconLayoutDashboard size={18} />,
        href: "/doctor/dashboard",
    },
    {
        label: "Schedule",
        icon: <IconCalendarStats size={18} />,
        href: "/doctor/schedule",
    },
    {
        label: "Calls",
        icon: <IconPhone size={18} />,
        href: "/doctor/calls",
    },
    {
        label: "Encounters",
        icon: <IconStethoscope size={18} />,
        href: "/doctor/encounters",
    },
    {
        label: "Patients",
        icon: <IconUsers size={18} />,
        href: "/doctor/patients",
    },
    {
        label: "Profile",
        icon: <IconUserCircle size={18} />,
        href: "/doctor/profile",
    },
];

const application = {
    id: "doctor-portal",
    name: "Doctor Portal",
    url: "/doctor/dashboard",
    icon: <IconStethoscope size={20} />,
};

export function DoctorPortalShell({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    const { data: myProfile } = useQuery<ProfileDto>({
        queryKey: ["profile"],
        queryFn: async () => {
            const res = await fetch("/api/profile");
            if (!res.ok) throw new Error("Failed to load profile");
            return res.json() as Promise<ProfileDto>;
        },
        staleTime: Infinity,
    });

    return (
        <>
            <PortalLayout menus={menus} application={application} profileHref="/doctor/profile" avatarSrc={myProfile?.photoUrl ?? null} avatarName={myProfile?.name ?? null}>
                {children}
            </PortalLayout>
            <IncomingCallNotifications />
        </>
    );
}
