import { vitalRepository } from "../repositories/vital.repository";
import {
  ListVitalsSchema,
  type ListVitalsInput,
  type VitalDto,
} from "../models/vital.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ListVitalsUseCase extends UseCase<ListVitalsInput, VitalDto[]> {
  constructor(private readonly dependentId?: string) {
    super();
  }

  static validate(input: unknown): ListVitalsInput {
    return ListVitalsSchema.parse(input);
  }

  protected async run(input: ListVitalsInput): Promise<VitalDto[]> {
    return vitalRepository.list(input.userId, input.limit, this.dependentId);
  }
}
