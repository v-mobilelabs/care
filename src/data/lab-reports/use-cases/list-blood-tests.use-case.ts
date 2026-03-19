import {
  bloodTestService,
  type BloodTestService,
} from "../service/blood-test.service";
import {
  ListBloodTestsSchema,
  type ListBloodTestsInput,
  type BloodTestDto,
} from "../models/blood-test.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ListBloodTestsUseCase extends UseCase<
  ListBloodTestsInput,
  BloodTestDto[]
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: BloodTestService = bloodTestService,
  ) {
    super();
  }

  static validate(input: unknown): ListBloodTestsInput {
    return ListBloodTestsSchema.parse(input);
  }

  protected async run(input: ListBloodTestsInput): Promise<BloodTestDto[]> {
    return this.service.list(input, this.dependentId);
  }
}
