import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { ApiError } from "@/lib/api/with-context";
import { dependentRepository } from "../repositories/dependent.repository";
import {
  DeleteDependentSchema,
  type DeleteDependentInput,
} from "../models/dependent.model";

// ── Use case ──────────────────────────────────────────────────────────────────

/**
 * Deletes a dependent profile and its associated Firebase Auth account.
 * Verifies ownership before deletion.
 */
export class DeleteDependentUseCase extends UseCase<
  DeleteDependentInput,
  void
> {
  static validate(input: unknown): DeleteDependentInput {
    return DeleteDependentSchema.parse(input);
  }

  protected async run(input: DeleteDependentInput): Promise<void> {
    // Verify the dependent exists and belongs to the owner
    const existing = await dependentRepository.findById(
      input.ownerId,
      input.dependentId,
    );
    if (!existing) {
      throw ApiError.notFound("Dependent not found.");
    }

    await dependentRepository.delete(input.ownerId, input.dependentId);
  }
}
