import { z } from "zod";
import { meetRepository } from "../repositories/meet.repository";
import { rtdb } from "@/lib/firebase/admin";
import type { CallRequestDto } from "../models/meet.model";
import { CreateCallRequestSchema } from "../models/meet.model";

interface Input {
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
}

export class CreateCallRequestUseCase {
  static validate(input: unknown): Input {
    const base = CreateCallRequestSchema.parse(input);
    const full = input as Input;
    return z
      .object({
        patientId: z.string().min(1),
        patientName: z.string().min(1),
        doctorId: z.string().min(1),
        doctorName: z.string().min(1),
      })
      .parse({
        ...base,
        patientId: full.patientId,
        patientName: full.patientName,
        doctorName: full.doctorName,
      });
  }

  async execute(input: Input): Promise<CallRequestDto> {
    // Cancel any existing pending request from this patient
    const existing = await meetRepository.getActiveForPatient(input.patientId);
    if (existing?.status === "pending") {
      await meetRepository.updateStatus(existing.id, "cancelled");
      await rtdb
        .ref(`call-requests/${existing.doctorId}/${existing.id}`)
        .remove();
      await rtdb.ref(`call-state/${input.patientId}`).remove();
    }

    // Create the new call request
    const request = await meetRepository.create(input);

    // Push live notification to doctor via RTDB
    await rtdb.ref(`call-requests/${input.doctorId}/${request.id}`).set({
      requestId: request.id,
      patientId: input.patientId,
      patientName: input.patientName,
      status: "pending",
      createdAt: Date.now(),
    });

    // Set patient call state to "waiting"
    await rtdb.ref(`call-state/${input.patientId}`).set({
      requestId: request.id,
      doctorId: input.doctorId,
      status: "pending",
      createdAt: Date.now(),
    });

    return request;
  }
}
