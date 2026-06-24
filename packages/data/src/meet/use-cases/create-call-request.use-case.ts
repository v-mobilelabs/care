import { z } from "zod";
import { meetRepository } from "../repositories/meet.repository";
import { rtdb } from "@/lib/firebase/admin";
import type { CallRequestDto } from "../models/meet.model";
import { CreateCallRequestSchema } from "../models/meet.model";
import { recomputeQueuePositions } from "./recompute-queue";

interface Input {
  patientId: string;
  patientName: string;
  patientPhotoUrl?: string | null;
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
      // Recompute queue for the old doctor (updates positions + public queue-size)
      await recomputeQueuePositions(existing.doctorId);
    }

    // Create the new call request
    const request = await meetRepository.create({
      patientId: input.patientId,
      patientName: input.patientName,
      patientPhotoUrl: input.patientPhotoUrl ?? null,
      doctorId: input.doctorId,
      doctorName: input.doctorName,
    });

    // Compute the queue position — count existing pending requests for this doctor
    const queueSnap = await rtdb.ref(`call-requests/${input.doctorId}`).get();
    const queueData = queueSnap.val() as Record<
      string,
      { status?: string }
    > | null;
    const pendingCount = queueData
      ? Object.values(queueData).filter((e) => e.status === "pending").length
      : 0;
    // New patient goes to the end: position = pendingCount + 1
    const queuePosition = pendingCount + 1;

    // Push live notification to doctor via RTDB
    await rtdb.ref(`call-requests/${input.doctorId}/${request.id}`).set({
      requestId: request.id,
      patientId: input.patientId,
      patientName: input.patientName,
      patientPhotoUrl: input.patientPhotoUrl ?? null,
      status: "pending",
      createdAt: Date.now(),
      queuePosition,
    });

    // Set patient call state to "waiting" with their queue position
    await rtdb.ref(`call-state/${input.patientId}`).set({
      requestId: request.id,
      doctorId: input.doctorId,
      doctorName: input.doctorName,
      status: "pending",
      createdAt: Date.now(),
      queuePosition,
    });

    // Update the public queue-size counter so patients can see how many are waiting
    await rtdb.ref(`queue-size/${input.doctorId}`).set(queuePosition);

    return request;
  }
}
