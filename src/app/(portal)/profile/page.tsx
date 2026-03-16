import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import {
    ProfileContent
} from "./_content";

/**
 * Shared profile page — renders the correct profile UI based on user kind.
 * Prefetches patient health profile on the server when the user is a patient.
 */
export default async function ProfilePage() {

    return (
        <ProfileContent />
    );
}
