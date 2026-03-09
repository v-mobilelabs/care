// Root doctor layout — just a passthrough.
// Sub-layouts ((auth) and (portal)) handle the visual chrome.

import { PortalLayout } from "@/ui/layouts/portal";
import { IconLayoutDashboard, IconCalendarStats, IconPhone, IconStethoscope, IconUsers, IconUserCircle, IconUsersGroup } from "@tabler/icons-react";
import { IncomingCallNotifications } from "./(portal)/_incoming-call-toast";

const menus = {
    navigation: [
        {
            label: "Dashboard",
            icon: <IconLayoutDashboard size={18} />,
            href: "/doctor/dashboard",
        },
        {
            label: "Patients",
            icon: <IconUsersGroup size={18} />,
            href: "/doctor/patients",
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
    ],
    header: [],
    profile: [
        {
            label: "Profile",
            icon: <IconUserCircle size={18} />,
            href: "/doctor/profile",
        },
        {
            label: "Settings",
            icon: <IconUsers size={18} />,
            href: "/doctor/settings",
        },
    ],
}

const application = {
    id: "doctor-portal",
    name: "Doctor Portal",
    url: "/doctor/dashboard",
    icon: <IconStethoscope size={20} />,
};

export default function DoctorRootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return <PortalLayout menus={menus} application={application}>
        {children}
        <IncomingCallNotifications />
    </PortalLayout>
}
