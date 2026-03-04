import { vitalService, type VitalService } from "../service/vital.service";
import { VitalRefSchema, type VitalRefInput } from "../models/vital.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class DeleteVitalUseCase extends UseCase<VitalRefInput, void> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: VitalService = vitalService,
  ) {
    super();
  }

  static validate(input: unknown): VitalRefInput {
    return VitalRefSchema.parse(input);
  }

  protected async run(input: VitalRefInput): Promise<void> {
    return this.service.delete(input, this.dependentId);
  }
}
