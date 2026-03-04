import {
  bloodTestService,
  type BloodTestService,
} from "../service/blood-test.service";
import {
  BloodTestRefSchema,
  type BloodTestRefInput,
} from "../models/blood-test.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class DeleteBloodTestUseCase extends UseCase<BloodTestRefInput, void> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: BloodTestService = bloodTestService,
  ) {
    super();
  }

  static validate(input: unknown): BloodTestRefInput {
    return BloodTestRefSchema.parse(input);
  }

  protected async run(input: BloodTestRefInput): Promise<void> {
    return this.service.delete(input, this.dependentId);
  }
}
