import { db, rtdb } from "@/lib/firebase/admin";
import type { DoctorProfileDocument } from "@/data/doctors/models/doctor-profile.model";

export interface OnlineDoctorDto {
  uid: string;
  name: string;
  email: string;
  photoUrl?: string;
  specialty: string;
  bio?: string;
  availability: "available" | "unavailable";
}

export class ListOnlineDoctorsUseCase {
  async execute(): Promise<OnlineDoctorDto[]> {
    // 1. RTDB filtered query — only fetch doctor presence nodes (requires
    //    .indexOn:["kind"] on the /presence path in database.rules.json).
    const presenceSnap = await rtdb
      .ref("presence")
      .orderByChild("kind")
      .equalTo("doctor")
      .get();

    const presenceData = presenceSnap.val() as Record<
      string,
      { online?: boolean; kind?: string }
    > | null;

    if (!presenceData) return [];

    const onlineDoctorUids = Object.entries(presenceData)
      .filter(([, v]) => v.online)
      .map(([uid]) => uid);

    if (onlineDoctorUids.length === 0) return [];

    // 2. Batch-fetch doctor + identity profiles in a single Firestore RPC
    //    using getAll() instead of N individual doc().get() calls.
    const doctorRefs = onlineDoctorUids.map((uid) =>
      db.collection("doctors").doc(uid),
    );
    const profileRefs = onlineDoctorUids.map((uid) =>
      db.collection("profiles").doc(uid),
    );
    const allSnaps = await db.getAll(...doctorRefs, ...profileRefs);

    // First half = doctor docs, second half = profile docs.
    const doctorSnaps = allSnaps.slice(0, onlineDoctorUids.length);
    const profileSnaps = allSnaps.slice(onlineDoctorUids.length);

    const results: OnlineDoctorDto[] = [];

    for (let i = 0; i < onlineDoctorUids.length; i++) {
      const doctorSnap = doctorSnaps[i];
      if (!doctorSnap.exists) continue;

      const doctorData = doctorSnap.data() as DoctorProfileDocument;
      const profileData = profileSnaps[i]?.data() as
        | { name?: string; email?: string; photoUrl?: string }
        | undefined;

      results.push({
        uid: onlineDoctorUids[i],
        name: profileData?.name ?? "Doctor",
        email: profileData?.email ?? "",
        photoUrl: profileData?.photoUrl,
        specialty: doctorData.specialty,
        bio: doctorData.bio,
        availability: doctorData.availability,
      });
    }

    return results;
  }
}
