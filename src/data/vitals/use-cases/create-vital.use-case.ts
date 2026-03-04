import { vitalService, type VitalService } from "../service/vital.service";
import {
  CreateVitalSchema,
  type CreateVitalInput,
  type VitalDto,
} from "../models/vital.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class CreateVitalUseCase extends UseCase<CreateVitalInput, VitalDto> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: VitalService = vitalService,
  ) {
    super();
  }

  static validate(input: unknown): CreateVitalInput {
    return CreateVitalSchema.parse(input);
  }

  protected async run(input: CreateVitalInput): Promise<VitalDto> {
    return this.service.create(input, this.dependentId);
  }
}
