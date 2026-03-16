import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { dependentRepository } from "../repositories/dependent.repository";
import {
  ListDependentsSchema,
  type ListDependentsInput,
  type DependentDto,
} from "../models/dependent.model";

// ── Use case ──────────────────────────────────────────────────────────────────

/**
 * Lists all dependents for a given owner/user.
 */
export class ListDependentsUseCase extends UseCase<
  ListDependentsInput,
  DependentDto[]
> {
  static validate(input: unknown): ListDependentsInput {
    return ListDependentsSchema.parse(input);
  }

  protected async run(input: ListDependentsInput): Promise<DependentDto[]> {
    return dependentRepository.list(input.ownerId);
  }
}
