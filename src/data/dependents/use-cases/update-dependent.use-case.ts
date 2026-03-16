import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { dependentRepository } from "../repositories/dependent.repository";
import {
  UpdateDependentSchema,
  type UpdateDependentInput,
  type DependentDto,
} from "../models/dependent.model";

// ── Use case ──────────────────────────────────────────────────────────────────

/**
 * Updates an existing dependent profile.
 * Syncs displayName to Firebase Auth when name fields change.
 */
export class UpdateDependentUseCase extends UseCase<
  UpdateDependentInput,
  DependentDto
> {
  static validate(input: unknown): UpdateDependentInput {
    return UpdateDependentSchema.parse(input);
  }

  protected async run(input: UpdateDependentInput): Promise<DependentDto> {
    return dependentRepository.update(input);
  }
}
