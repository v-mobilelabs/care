import { vitalService, type VitalService } from "../service/vital.service";
import {
  VitalRefSchema,
  type VitalRefInput,
  type VitalDto,
} from "../models/vital.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class GetVitalUseCase extends UseCase<VitalRefInput, VitalDto | null> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: VitalService = vitalService,
  ) {
    super();
  }

  static validate(input: unknown): VitalRefInput {
    return VitalRefSchema.parse(input);
  }

  protected async run(input: VitalRefInput): Promise<VitalDto | null> {
    return this.service.getById(input, this.dependentId);
  }
}
