/**
 * Build a deterministic conversation ID from doctor and patient UIDs.
 * Format: `{doctorId}_{patientId}` — mirrors the doctor_patients collection key.
 *
 * Extracted to a standalone module so it can be imported from both client and
 * server code without pulling in client-only Firebase SDK dependencies.
 */
export function buildConversationId(
  doctorId: string,
  patientId: string,
): string {
  return `${doctorId}_${patientId}`;
}
