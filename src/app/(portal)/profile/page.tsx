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
