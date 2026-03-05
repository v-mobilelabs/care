import { db } from "@/lib/firebase/admin";
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
    // Fetch all available doctors from doctors/{uid}
    const snap = await db
      .collection("doctors")
      .where("availability", "==", "available")
      .get();

    if (snap.empty) return [];

    // Batch-fetch their profiles for name/photo
    const uids = snap.docs.map((d) => d.id);
    const profileSnaps = await Promise.all(
      uids.map((uid) => db.collection("profiles").doc(uid).get()),
    );

    return snap.docs
      .map((doc, i) => {
        const doctorData = doc.data() as DoctorProfileDocument;
        const profileData = profileSnaps[i]?.data() as
          | { name?: string; email?: string; photoUrl?: string }
          | undefined;

        return {
          uid: doc.id,
          name: profileData?.name ?? "Doctor",
          email: profileData?.email ?? "",
          photoUrl: profileData?.photoUrl,
          specialty: doctorData.specialty,
          bio: doctorData.bio,
          availability: doctorData.availability,
        };
      })
      .filter((d) => d.name !== undefined);
  }
}
