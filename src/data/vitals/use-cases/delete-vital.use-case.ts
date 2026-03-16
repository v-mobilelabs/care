import { vitalRepository } from "../repositories/vital.repository";
import { VitalRefSchema, type VitalRefInput } from "../models/vital.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { Indexable } from "@/data/shared/use-cases/indexable.decorator";

@Indexable({ sourceIdField: "vitalId", remove: true })
export class DeleteVitalUseCase extends UseCase<VitalRefInput, void> {
  constructor(private readonly dependentId?: string) {
    super();
  }

  static validate(input: unknown): VitalRefInput {
    return VitalRefSchema.parse(input);
  }

  protected async run(input: VitalRefInput): Promise<void> {
    await vitalRepository.delete(input.userId, input.vitalId, this.dependentId);
  }
}
