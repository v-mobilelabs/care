import type { UserKind } from "@/lib/auth/jwt";
import {
    IconAdjustments,
    IconAi,
    IconArrowForwardUp,
    IconBrain,
    IconBook2,
    IconCalendarStats,
    IconChartBar,
    IconFiles,
    IconHeartbeat,
    IconHistory,
    IconLayoutDashboard,
    IconPhone,
    IconSparkles,
    IconStethoscope,
    IconUserCircle,
    IconUsers,
    IconUsersGroup,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

/**
 * Navigation menu item structure
 */
export type NavigationItem = {
    label: string;
    icon: ReactNode;
    href: string;
    beta?: boolean;
    children?: NavigationItem[];
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

const ICON_SIZE = 14;
const ICON_SIZE_PROFILE = 16;

function getAdminMenus(): NavigationMenus {
    return {
        navigation: [
            {
                label: "Overview",
                icon: <IconLayoutDashboard size={ICON_SIZE} />,
                href: "/console",
            },
            {
                label: "Knowledge Base",
                icon: <IconBook2 size={ICON_SIZE} />,
                href: "/console/knowledge-base",
            },
            {
                label: "Evidence",
                icon: <IconFiles size={ICON_SIZE} />,
                href: "/console/evidence",
            },
            {
                label: "Metrics",
                icon: <IconChartBar size={ICON_SIZE} />,
                href: "/console/metrics",
            },
        ],
        header: [],
        profile: [
            {
                label: "Profile",
                icon: <IconUserCircle size={ICON_SIZE_PROFILE} />,
                href: "/profile",
            },
            {
                label: "Settings",
                icon: <IconAdjustments size={ICON_SIZE_PROFILE} />,
                href: "/profile",
            },
        ],
    };
}

function getDoctorMenus(): NavigationMenus {
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

function getUserMenus(): NavigationMenus {
    return {
        navigation: [
            {
                label: "Home",
                icon: <IconLayoutDashboard size={ICON_SIZE} />,
                href: "/user",
            },
            {
                label: "History",
                icon: <IconHistory size={ICON_SIZE} />,
                href: "/user/history",
            },
            {
                label: "Health",
                icon: <IconHeartbeat size={ICON_SIZE} />,
                href: "/user/health",
            },
            {
                label: "Referrals",
                icon: <IconArrowForwardUp size={ICON_SIZE} />,
                href: "/user/referrals",
            },
        ],
        header: [
            {
                label: "Ask AI",
                icon: <IconSparkles size={ICON_SIZE} />,
                href: "/user/assistant",
            },
        ],
        profile: [
            {
                label: "Profile",
                icon: <IconUserCircle size={ICON_SIZE_PROFILE} />,
                href: "/profile",
            },
            {
                label: "Physical Details",
                icon: <IconHeartbeat size={ICON_SIZE_PROFILE} />,
                href: "/user/details",
            },
            {
                label: "Memories",
                icon: <IconBrain size={ICON_SIZE_PROFILE} />,
                href: "/user/memories",
            },
            {
                label: "Usage",
                icon: <IconChartBar size={ICON_SIZE_PROFILE} />,
                href: "/user/usage",
            },
        ],
    };
}

export function getNavigationMenus(userKind: UserKind): NavigationMenus {
    if (userKind === "admin") {
        return getAdminMenus();
    }

    if (userKind === "doctor") {
        return getDoctorMenus();
    }

    return getUserMenus();
}

export function getApplicationInfo(userKind: UserKind): ApplicationInfo {
    if (userKind === "admin") {
        return {
            id: "admin-console",
            name: "Admin Console",
            url: "/console",
            icon: <IconLayoutDashboard size={ICON_SIZE} />,
        };
    }

    if (userKind === "doctor") {
        return {
            id: "doctor-portal",
            name: "Doctor Portal",
            url: "/doctor/dashboard",
            icon: <IconStethoscope size={ICON_SIZE} />,
        };
    }

    return {
        id: "careai-portal",
        name: "CareAI",
        url: "/user",
        icon: <IconAi size={ICON_SIZE} />,
    };
}
