import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { dependentRepository } from "../repositories/dependent.repository";
import {
  CreateDependentSchema,
  type CreateDependentInput,
  type DependentDto,
} from "../models/dependent.model";

// ── Use case ──────────────────────────────────────────────────────────────────

/**
 * Creates a new dependent profile. This also creates a dedicated
 * Firebase Auth account for the dependent.
 */
export class CreateDependentUseCase extends UseCase<
  CreateDependentInput,
  DependentDto
> {
  static validate(input: unknown): CreateDependentInput {
    return CreateDependentSchema.parse(input);
  }

  protected async run(input: CreateDependentInput): Promise<DependentDto> {
    return dependentRepository.create(input);
  }
}
