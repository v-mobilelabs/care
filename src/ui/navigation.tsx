import type { UserKind } from "@/lib/auth/jwt";
import {
    IconAi,
    IconCalendarStats,
    IconChartBar,
    IconFiles,
    IconHistory,
    IconLayoutDashboard,
    IconPhone,
    IconPill,
    IconStethoscope,
    IconUserCircle,
    IconUsers,
    IconUsersGroup,
    IconVideo,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

/**
 * Navigation menu item structure
 */
export type NavigationItem = {
    label: string;
    icon: ReactNode;
    href: string;
};

/**
 * Complete menu structure with navigation, header, and profile sections
 */
export type NavigationMenus = {
    navigation: NavigationItem[];
    header: NavigationItem[];
    profile: NavigationItem[];
};

/**
 * Application metadata
 */
export type ApplicationInfo = {
    id: string;
    name: string;
    url: string;
    icon: ReactNode;
};

/**
 * Returns navigation menu items based on user kind
 *
 * @param userKind - The type of user ("user" for patients or "doctor")
 * @returns Navigation menus structure with navigation, header, and profile items
 *
 * @example
 * ```tsx
 * const menus = getNavigationMenus(user.kind);
 * <PortalLayout menus={menus} application={getApplicationInfo(user.kind)}>
 *   {children}
 * </PortalLayout>
 * ```
 */

const ICON_SIZE = "xs";
export function getNavigationMenus(userKind: UserKind): NavigationMenus {
    if (userKind === "doctor") {
        return {
            navigation: [
                {
                    label: "Dashboard",
                    icon: <IconLayoutDashboard size={ICON_SIZE} />,
                    href: "/doctor/dashboard",
                },
                {
                    label: "Patients",
                    icon: <IconUsersGroup size={ICON_SIZE} />,
                    href: "/doctor/patients",
                },
                {
                    label: "Schedule",
                    icon: <IconCalendarStats size={ICON_SIZE} />,
                    href: "/doctor/schedule",
                },
                {
                    label: "Calls",
                    icon: <IconPhone size={ICON_SIZE} />,
                    href: "/doctor/calls",
                },
                {
                    label: "Encounters",
                    icon: <IconStethoscope size={ICON_SIZE} />,
                    href: "/doctor/encounters",
                },
            ],
            header: [],
            profile: [
                {
                    label: "Profile",
                    icon: <IconUserCircle size={ICON_SIZE} />,
                    href: "/doctor/profile",
                },
                {
                    label: "Settings",
                    icon: <IconUsers size={ICON_SIZE} />,
                    href: "/doctor/settings",
                },
            ],
        };
    }

    // User (patient) navigation
    return {
        navigation: [
            {
                label: "Assistant",
                icon: <IconAi size={ICON_SIZE} />,
                href: "/patient/assistant",
            },
            {
                label: "History",
                icon: <IconHistory size={ICON_SIZE} />,
                href: "/patient/history",
            },
            // {
            //     label: "Doctors",
            //     icon: <IconStethoscope size={ICON_SIZE} />,
            //     href: "/patient/doctors",
            // },
            // {
            //     label: "Consult",
            //     icon: <IconVideo size={ICON_SIZE} />,
            //     href: "/patient/connect",
            // },
            {
                label: "Prescriptions",
                icon: <IconPill size={ICON_SIZE} />,
                href: "/patient/prescriptions",
            },
            {
                label: "Files",
                icon: <IconFiles size={ICON_SIZE} />,
                href: "/patient/files",
            },
        ],
        header: [],
        profile: [
            {
                label: "Profile",
                icon: <IconUserCircle size={ICON_SIZE} />,
                href: "/profile",
            },
            {
                label: "Usage",
                icon: <IconChartBar size={ICON_SIZE} />,
                href: "/patient/usage",
            },
        ],
    };
}

/**
 * Returns application metadata based on user kind
 *
 * @param userKind - The type of user ("user" for patients or "doctor")
 * @returns Application info including id, name, default url, and icon
 *
 * @example
 * ```tsx
 * const application = getApplicationInfo(user.kind);
 * ```
 */
export function getApplicationInfo(userKind: UserKind): ApplicationInfo {
    if (userKind === "doctor") {
        return {
            id: "doctor-portal",
            name: "Doctor Portal",
            url: "/doctor/dashboard",
            icon: <IconStethoscope size={ICON_SIZE} />,
        };
    }

    // User (patient) application
    return {
        id: "careai-portal",
        name: "CareAI",
        url: "/patient/assistant",
        icon: <IconAi size={ICON_SIZE} />,
    };
}
