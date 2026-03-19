import {
  bloodTestService,
  type BloodTestService,
} from "../service/blood-test.service";
import {
  BloodTestRefSchema,
  type BloodTestRefInput,
  type BloodTestDto,
} from "../models/blood-test.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class GetBloodTestUseCase extends UseCase<
  BloodTestRefInput,
  BloodTestDto | null
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: BloodTestService = bloodTestService,
  ) {
    super();
  }

  static validate(input: unknown): BloodTestRefInput {
    return BloodTestRefSchema.parse(input);
  }

  protected async run(input: BloodTestRefInput): Promise<BloodTestDto | null> {
    return this.service.getById(input, this.dependentId);
  }
}
