// ── Models ────────────────────────────────────────────────────────────────────
export * from "./models/encounter.model";

// ── Repository ────────────────────────────────────────────────────────────────
export { encounterRepository } from "./repositories/encounter.repository";

// ── Use Cases ─────────────────────────────────────────────────────────────────
export { CreateEncounterUseCase } from "./use-cases/create-encounter.use-case";
export { GetEncounterUseCase } from "./use-cases/get-encounter.use-case";
export { ListEncountersUseCase } from "./use-cases/list-encounters.use-case";
export { ListPatientEncountersUseCase } from "./use-cases/list-patient-encounters.use-case";
export { CompleteEncounterUseCase } from "./use-cases/complete-encounter.use-case";
export { UpdateEncounterNotesUseCase } from "./use-cases/update-encounter-notes.use-case";
