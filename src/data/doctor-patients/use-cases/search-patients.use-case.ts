import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { z } from "zod";
import { db } from "@/lib/firebase/admin";

const SearchPatientsInputSchema = z.object({
  query: z.string().min(1).max(80),
});

export type SearchPatientsInput = z.infer<typeof SearchPatientsInputSchema>;

export interface PatientSearchResultDto {
  userId: string;
  name: string;
  email?: string;
  photoUrl?: string;
}

export class SearchPatientsUseCase extends UseCase<
  SearchPatientsInput,
  PatientSearchResultDto[]
> {
  static validate(input: unknown): SearchPatientsInput {
    return SearchPatientsInputSchema.parse(input);
  }

  protected async run(
    input: SearchPatientsInput,
  ): Promise<PatientSearchResultDto[]> {
    const term = input.query.trim();
    // Firestore prefix range query — case sensitive; name field must be indexed
    const snap = await db
      .collection("profiles")
      .where("kind", "in", ["user"])
      .where("name", ">=", term)
      .where("name", "<=", term + "\uf8ff")
      .limit(20)
      .get();

    return snap.docs.map((d) => {
      const data = d.data() as {
        userId: string;
        name?: string;
        email?: string;
        photoUrl?: string;
      };
      return {
        userId: data.userId,
        name: data.name ?? "Unknown",
        email: data.email,
        photoUrl: data.photoUrl,
      };
    });
  }
}
