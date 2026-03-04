import { vitalService, type VitalService } from "../service/vital.service";
import {
  ListVitalsSchema,
  type ListVitalsInput,
  type VitalDto,
} from "../models/vital.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ListVitalsUseCase extends UseCase<ListVitalsInput, VitalDto[]> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: VitalService = vitalService,
  ) {
    super();
  }

  static validate(input: unknown): ListVitalsInput {
    return ListVitalsSchema.parse(input);
  }

  protected async run(input: ListVitalsInput): Promise<VitalDto[]> {
    return this.service.list(input, this.dependentId);
  }
}
