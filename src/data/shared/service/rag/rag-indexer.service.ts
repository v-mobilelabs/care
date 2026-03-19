/**
 * RAG Indexer — Automatically index documents when created/updated.
 *
 * Call these methods from your use-case classes (e.g. CreateConditionUseCase)
 * to keep embeddings in sync with Firestore data.
 *
 * Example:
 * ```ts
 * const condition = await conditionRepository.create(data);
 * await ragIndexer.indexCondition(userId, profileId, condition);
 * ```
 */

import { ragService } from "./rag.service";
import type { ConditionDto } from "@/data/conditions/models/condition.model";
import type { VitalDto } from "@/data/vitals/models/vital.model";
import type {
  AssessmentDto,
  QaPair,
} from "@/data/assessments/models/assessment.model";
import type { SoapNoteDto } from "@/data/soap-notes/models/soap-note.model";
import type { MedicationDto } from "@/data/medications/models/medication.model";
import type { LabReportDto } from "@/data/lab-reports/models/lab-report.model";
import type { PrescriptionDto } from "@/data/prescriptions/models/prescription.model";
import type { ProfileDto } from "@/data/profile/models/profile.model";
import type { PatientDto } from "@/data/patients/models/patient.model";

export class RAGIndexerService {
  /**
   * Index a medical condition.
   */
  async indexCondition(
    userId: string,
    profileId: string,
    condition: ConditionDto,
  ): Promise<void> {
    const content = [
      `Condition: ${condition.name}`,
      condition.icd10 ? `ICD-10: ${condition.icd10}` : "",
      `Severity: ${condition.severity}`,
      `Status: ${condition.status}`,
      condition.description ? `Description: ${condition.description}` : "",
      condition.symptoms?.length
        ? `Symptoms: ${condition.symptoms.join(", ")}`
        : "",
      `Created on: ${new Date(condition.createdAt).toLocaleDateString()}`,
    ]
      .filter(Boolean)
      .join("\n");

    await ragService.indexDocument({
      userId,
      profileId,
      type: "condition",
      sourceId: condition.id,
      content,
      metadata: {
        title: condition.name,
        severity: condition.severity,
        status: condition.status,
        createdAt: condition.createdAt,
      },
    });
  }

  /**
   * Index a vitals record.
   */
  async indexVital(
    userId: string,
    profileId: string,
    vital: VitalDto,
  ): Promise<void> {
    const content = [
      `Vital Signs recorded on ${new Date(vital.createdAt).toLocaleDateString()}`,
      vital.systolicBp && vital.diastolicBp
        ? `Blood Pressure: ${vital.systolicBp}/${vital.diastolicBp} mmHg`
        : "",
      vital.restingHr ? `Heart Rate: ${vital.restingHr} bpm` : "",
      vital.temperatureC ? `Temperature: ${vital.temperatureC}°C` : "",
      vital.spo2 ? `Oxygen Saturation: ${vital.spo2}%` : "",
      vital.respiratoryRate
        ? `Respiratory Rate: ${vital.respiratoryRate} bpm`
        : "",
      vital.glucoseMmol ? `Blood Glucose: ${vital.glucoseMmol} mmol/L` : "",
      vital.waistCm ? `Waist: ${vital.waistCm} cm` : "",
      vital.hipCm ? `Hip: ${vital.hipCm} cm` : "",
      vital.neckCm ? `Neck: ${vital.neckCm} cm` : "",
      vital.note ? `Notes: ${vital.note}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    await ragService.indexDocument({
      userId,
      profileId,
      type: "vital",
      sourceId: vital.id,
      content,
      metadata: {
        title: "Vitals",
        recordedAt: vital.createdAt,
      },
    });
  }

  /**
   * Index a health assessment.
   */
  async indexAssessment(
    userId: string,
    profileId: string,
    assessment: AssessmentDto,
  ): Promise<void> {
    const qaText = assessment.qa
      ?.map((qa: QaPair) => `Q: ${qa.question}\nA: ${qa.answer}`)
      .join("\n\n");

    const content = [
      `Assessment: ${assessment.title}`,
      `Date: ${new Date(assessment.createdAt).toLocaleDateString()}`,
      assessment.condition ? `Condition: ${assessment.condition}` : "",
      assessment.riskLevel ? `Risk Level: ${assessment.riskLevel}` : "",
      assessment.summary ? `Summary: ${assessment.summary}` : "",
      qaText ? `\n${qaText}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    await ragService.indexDocument({
      userId,
      profileId,
      type: "assessment",
      sourceId: assessment.id,
      content,
      metadata: {
        title: assessment.title,
        condition: assessment.condition,
        createdAt: assessment.createdAt,
      },
    });
  }

  /**
   * Index a SOAP note.
   */
  async indexSoapNote(
    userId: string,
    profileId: string,
    soap: SoapNoteDto,
  ): Promise<void> {
    const content = [
      `SOAP Note for ${soap.condition}`,
      `Date: ${new Date(soap.createdAt).toLocaleDateString()}`,
      `Risk Level: ${soap.riskLevel}`,
      soap.subjective ? `Subjective: ${soap.subjective}` : "",
      soap.objective ? `Objective: ${soap.objective}` : "",
      soap.assessment ? `Assessment: ${soap.assessment}` : "",
      soap.plan?.length ? `Plan: ${soap.plan.join("; ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    await ragService.indexDocument({
      userId,
      profileId,
      type: "soap",
      sourceId: soap.id,
      content,
      metadata: {
        title: soap.condition,
        riskLevel: soap.riskLevel,
        createdAt: soap.createdAt,
      },
    });
  }

  /**
   * Index a medication.
   */
  async indexMedication(
    userId: string,
    profileId: string,
    med: MedicationDto,
    dependentId?: string,
  ): Promise<void> {
    const content = [
      `Medication: ${med.name}`,
      `Status: ${med.status}`,
      med.dosage ? `Dosage: ${med.dosage}` : "",
      med.form ? `Form: ${med.form}` : "",
      med.frequency ? `Frequency: ${med.frequency}` : "",
      med.duration ? `Duration: ${med.duration}` : "",
      med.condition ? `For condition: ${med.condition}` : "",
      med.instructions ? `Instructions: ${med.instructions}` : "",
      `Recorded on: ${new Date(med.createdAt).toLocaleDateString()}`,
    ]
      .filter(Boolean)
      .join("\n");

    await ragService.indexDocument({
      userId,
      profileId,
      dependentId,
      type: "medication",
      sourceId: med.id,
      content,
      metadata: {
        title: med.name,
        status: med.status,
        createdAt: med.createdAt,
      },
    });
  }

  /**
   * Index a lab report with its biomarker results.
   */
  async indexLabReport(
    userId: string,
    profileId: string,
    test: LabReportDto,
    dependentId?: string,
  ): Promise<void> {
    const biomarkerLines = test.biomarkers
      .map(
        (b) =>
          `${b.name}: ${b.value} ${b.unit}${b.referenceRange ? ` (ref: ${b.referenceRange})` : ""} — ${b.status}`,
      )
      .join("\n");

    const content = [
      `Blood Test: ${test.testName}`,
      test.labName ? `Lab: ${test.labName}` : "",
      test.orderedBy ? `Ordered by: ${test.orderedBy}` : "",
      test.testDate
        ? `Test date: ${new Date(test.testDate).toLocaleDateString()}`
        : "",
      test.notes ? `Notes: ${test.notes}` : "",
      biomarkerLines ? `\nBiomarkers:\n${biomarkerLines}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    await ragService.indexDocument({
      userId,
      profileId,
      dependentId,
      type: "bloodtest",
      sourceId: test.id,
      content,
      metadata: {
        title: test.testName,
        testDate: test.testDate,
        createdAt: test.createdAt,
      },
    });
  }

  /**
   * Remove indexed document when deleted.
   */
  async removeDocument(
    userId: string,
    profileId: string,
    sourceId: string,
  ): Promise<void> {
    await ragService.removeDocument({ userId, profileId, sourceId });
  }

  /**
   * Index a prescription record for RAG retrieval.
   * Uses `prescription.id` as the sourceId.
   */
  async indexPrescription(
    userId: string,
    profileId: string,
    prescription: PrescriptionDto,
    dependentId?: string,
  ): Promise<void> {
    const medLines = prescription.medications
      .map((m) => {
        const parts = [
          `- ${m.name}`,
          m.dosage,
          m.form ? `(${m.form})` : "",
          m.frequency ? `— ${m.frequency}` : "",
          m.duration ? `for ${m.duration}` : "",
          m.indication ? `[for: ${m.indication}]` : "",
          m.instructions ? `Instructions: ${m.instructions}` : "",
        ].filter(Boolean);
        return parts.join(" ");
      })
      .join("\n");

    const content = [
      "Prescription",
      prescription.prescribedBy
        ? `Prescribed by: ${prescription.prescribedBy}`
        : "",
      prescription.prescriptionDate
        ? `Date: ${prescription.prescriptionDate}`
        : "",
      medLines ? `\nMedications:\n${medLines}` : "",
      prescription.notes ? `Notes: ${prescription.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    await ragService.indexDocument({
      userId,
      profileId,
      dependentId,
      type: "prescription",
      sourceId: prescription.id,
      content,
      metadata: {
        title: "Prescription",
        prescribedBy: prescription.prescribedBy,
        date: prescription.prescriptionDate,
        createdAt: prescription.createdAt,
      },
    });
  }

  /**
   * Index a user profile (identity: name, gender, location, DOB).
   * Uses `userId` as sourceId — one embedding per profile, upserted on update.
   */
  async indexProfile(
    userId: string,
    profileId: string,
    profile: ProfileDto,
  ): Promise<void> {
    const age = profile.dateOfBirth
      ? `${Math.floor((Date.now() - new Date(profile.dateOfBirth).getTime()) / 31_557_600_000)} years old`
      : "";

    const content = [
      `Patient Profile: ${profile.name ?? "Unknown"}`,
      profile.gender ? `Gender: ${profile.gender}` : "",
      age ? `Age: ${age}` : "",
      profile.dateOfBirth ? `Date of birth: ${profile.dateOfBirth}` : "",
      profile.city || profile.country
        ? `Location: ${[profile.city, profile.country].filter(Boolean).join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    await ragService.indexDocument({
      userId,
      profileId,
      type: "profile",
      sourceId: `profile:${userId}`,
      content,
      metadata: {
        title: profile.name ?? "Patient Profile",
        createdAt: profile.updatedAt,
      },
    });
  }

  /**
   * Index a patient's health data (biometrics, preferences, blood group).
   * Uses `userId` as sourceId — one embedding per patient, upserted on update.
   */
  async indexPatient(
    userId: string,
    profileId: string,
    patient: PatientDto,
  ): Promise<void> {
    const content = [
      "Patient Health Data",
      patient.sex ? `Sex: ${patient.sex}` : "",
      patient.height ? `Height: ${patient.height} cm` : "",
      patient.weight ? `Weight: ${patient.weight} kg` : "",
      patient.height && patient.weight
        ? `BMI: ${(patient.weight / (patient.height / 100) ** 2).toFixed(1)}`
        : "",
      patient.bloodGroup ? `Blood group: ${patient.bloodGroup}` : "",
      patient.activityLevel
        ? `Activity level: ${patient.activityLevel.replace("_", " ")}`
        : "",
      patient.foodPreferences?.length
        ? `Food preferences: ${patient.foodPreferences.join(", ")}`
        : "",
      patient.waistCm ? `Waist: ${patient.waistCm} cm` : "",
      patient.hipCm ? `Hip: ${patient.hipCm} cm` : "",
      patient.neckCm ? `Neck: ${patient.neckCm} cm` : "",
    ]
      .filter(Boolean)
      .join("\n");

    await ragService.indexDocument({
      userId,
      profileId,
      type: "patient",
      sourceId: `patient:${userId}`,
      content,
      metadata: {
        title: "Patient Health Data",
        createdAt: patient.updatedAt,
      },
    });
  }
}

/** Singleton instance */
export const ragIndexer = new RAGIndexerService();
