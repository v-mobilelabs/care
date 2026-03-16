/**
 * RAG Backfill — Index existing patient data into the embeddings collection.
 *
 * Iterates all profiles in Firestore and indexes any existing health records
 * that were created before the ragIndexer hooks were added to use-cases.
 *
 * Run: npx tsx scripts/seed/backfill-rag.ts
 * Run for one profile: PROFILE_ID=<uid> npx tsx scripts/seed/backfill-rag.ts
 *
 * WARNING: This will call the Gemini embedding API for every un-indexed record.
 * Each call costs credits. Run once and check the embeddings collection after.
 */

// Load environment variables before any imports
import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });

import { db } from "@/lib/firebase/admin";
import { ragIndexer } from "@/data/shared/service";
import {
  toConditionDto,
  type ConditionDocument,
} from "@/data/conditions/models/condition.model";
import {
  toVitalDto,
  type VitalDocument,
} from "@/data/vitals/models/vital.model";
import {
  toMedicationDto,
  type MedicationDocument,
} from "@/data/medications/models/medication.model";
import {
  toSoapNoteDto,
  type SoapNoteDocument,
} from "@/data/soap-notes/models/soap-note.model";
import {
  toBloodTestDto,
  type BloodTestDocument,
} from "@/data/blood-tests/models/blood-test.model";
import {
  toAssessmentDto,
  type AssessmentDocument,
} from "@/data/assessments/models/assessment.model";
import type { ExtractedPrescriptionData } from "@/data/sessions/models/file.model";
import type { PrescriptionDto } from "@/data/prescriptions/models/prescription.model";

// ── Concurrency limiter ───────────────────────────────────────────────────────

async function runInBatches<T>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(fn));
  }
}

// ── Skip check ────────────────────────────────────────────────────────────────

/** Returns true if an embedding already exists for this sourceId */
async function isAlreadyIndexed(
  profileId: string,
  sourceId: string,
): Promise<boolean> {
  const snap = await db
    .collection("profiles")
    .doc(profileId)
    .collection("embeddings")
    .where("sourceId", "==", sourceId)
    .limit(1)
    .get();
  return !snap.empty;
}

// ── Per-collection indexers ───────────────────────────────────────────────────

async function backfillConditions(
  profileRef: FirebaseFirestore.DocumentReference,
  profileId: string,
): Promise<void> {
  const snap = await profileRef.collection("conditions").get();
  let count = 0;
  for (const doc of snap.docs) {
    const data = doc.data() as ConditionDocument;
    if (await isAlreadyIndexed(profileId, doc.id)) continue;
    await ragIndexer.indexCondition(
      data.userId,
      profileId,
      toConditionDto(doc.id, data),
    );
    count++;
  }
  if (snap.size > 0) console.log(`  conditions: ${count}/${snap.size} indexed`);
}

async function backfillVitals(
  profileRef: FirebaseFirestore.DocumentReference,
  profileId: string,
): Promise<void> {
  const snap = await profileRef.collection("vitals").get();
  let count = 0;
  for (const doc of snap.docs) {
    const data = doc.data() as VitalDocument;
    if (await isAlreadyIndexed(profileId, doc.id)) continue;
    await ragIndexer.indexVital(
      data.userId,
      profileId,
      toVitalDto(doc.id, data),
    );
    count++;
  }
  if (snap.size > 0) console.log(`  vitals: ${count}/${snap.size} indexed`);
}

async function backfillMedications(
  profileRef: FirebaseFirestore.DocumentReference,
  profileId: string,
): Promise<void> {
  const snap = await profileRef.collection("medications").get();
  let count = 0;
  for (const doc of snap.docs) {
    const data = doc.data() as MedicationDocument;
    if (await isAlreadyIndexed(profileId, doc.id)) continue;
    await ragIndexer.indexMedication(
      data.userId,
      profileId,
      toMedicationDto(doc.id, data),
    );
    count++;
  }
  if (snap.size > 0)
    console.log(`  medications: ${count}/${snap.size} indexed`);
}

async function backfillSoapNotes(
  profileRef: FirebaseFirestore.DocumentReference,
  profileId: string,
): Promise<void> {
  const snap = await profileRef.collection("soapNotes").get();
  let count = 0;
  for (const doc of snap.docs) {
    const data = doc.data() as SoapNoteDocument;
    if (await isAlreadyIndexed(profileId, doc.id)) continue;
    await ragIndexer.indexSoapNote(
      data.userId,
      profileId,
      toSoapNoteDto(doc.id, data),
    );
    count++;
  }
  if (snap.size > 0) console.log(`  soapNotes: ${count}/${snap.size} indexed`);
}

async function backfillBloodTests(
  profileRef: FirebaseFirestore.DocumentReference,
  profileId: string,
): Promise<void> {
  const snap = await profileRef.collection("blood-tests").get();
  let count = 0;
  for (const doc of snap.docs) {
    const data = doc.data() as BloodTestDocument;
    if (await isAlreadyIndexed(profileId, doc.id)) continue;
    await ragIndexer.indexBloodTest(
      data.userId,
      profileId,
      toBloodTestDto(doc.id, data),
    );
    count++;
  }
  if (snap.size > 0)
    console.log(`  blood-tests: ${count}/${snap.size} indexed`);
}

async function backfillAssessments(
  profileRef: FirebaseFirestore.DocumentReference,
  profileId: string,
): Promise<void> {
  const snap = await profileRef.collection("assessments").get();
  let count = 0;
  for (const doc of snap.docs) {
    const data = doc.data() as AssessmentDocument;
    if (await isAlreadyIndexed(profileId, doc.id)) continue;
    await ragIndexer.indexAssessment(
      data.userId,
      profileId,
      toAssessmentDto(doc.id, data),
    );
    count++;
  }
  if (snap.size > 0)
    console.log(`  assessments: ${count}/${snap.size} indexed`);
}

async function backfillPrescriptions(
  profileRef: FirebaseFirestore.DocumentReference,
  profileId: string,
): Promise<void> {
  const sessionsSnap = await profileRef.collection("sessions").get();
  let rxCount = 0;
  let rxTotal = 0;
  for (const sessionDoc of sessionsSnap.docs) {
    const filesSnap = await sessionDoc.ref.collection("files").get();
    for (const fileDoc of filesSnap.docs) {
      const data = fileDoc.data() as {
        userId: string;
        name?: string;
        extractedData?: ExtractedPrescriptionData;
        label?: string;
      };
      if (!data.extractedData?.medications?.length) continue;
      if (data.label && data.label !== "prescription") continue;
      rxTotal++;
      if (await isAlreadyIndexed(profileId, fileDoc.id)) continue;
      const syntheticDto: PrescriptionDto = {
        id: fileDoc.id,
        userId: data.userId,
        fileId: fileDoc.id,
        source: "extracted",
        medications: (data.extractedData?.medications ?? []).map((m) => ({
          name: m.name,
          dosage: m.dosage ?? "",
          form:
            (m.form as PrescriptionDto["medications"][number]["form"]) ??
            "Other",
          frequency: m.frequency ?? "",
          duration: m.duration ?? "",
          instructions: m.instructions,
          indication: m.condition ?? "",
        })),
        prescribedBy: data.extractedData?.prescribedBy,
        prescriptionDate: data.extractedData?.date,
        notes: data.extractedData?.notes,
        createdAt: new Date().toISOString(),
      };
      await ragIndexer.indexPrescription(data.userId, profileId, syntheticDto);
      rxCount++;
    }
  }
  if (rxTotal > 0)
    console.log(`  prescriptions: ${rxCount}/${rxTotal} indexed`);
}

// ── Per-profile orchestrator ──────────────────────────────────────────────────

async function backfillProfile(profileId: string): Promise<void> {
  console.log(`\n[backfill] Profile: ${profileId}`);
  const profileRef = db.collection("profiles").doc(profileId);
  await backfillConditions(profileRef, profileId);
  await backfillVitals(profileRef, profileId);
  await backfillMedications(profileRef, profileId);
  await backfillSoapNotes(profileRef, profileId);
  await backfillBloodTests(profileRef, profileId);
  await backfillAssessments(profileRef, profileId);
  await backfillPrescriptions(profileRef, profileId);
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const specificProfileId = process.env.PROFILE_ID;

  if (specificProfileId) {
    console.log(`[backfill] Running for single profile: ${specificProfileId}`);
    await backfillProfile(specificProfileId);
  } else {
    console.log("[backfill] Listing all profiles…");
    const profilesSnap = await db.collection("profiles").get();
    console.log(`[backfill] Found ${profilesSnap.size} profiles`);

    await runInBatches(profilesSnap.docs, 3, async (doc) => {
      await backfillProfile(doc.id);
    });
  }

  console.log("\n[backfill] ✅ Done.");
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error("[backfill] ❌ Fatal:", err);
  process.exit(1);
});
