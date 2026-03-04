import {
  bloodTestExtractionService,
  type BloodTestExtractionService,
} from "../service/blood-test-extraction.service";
import {
  ExtractBloodTestInputSchema,
  type ExtractBloodTestInput,
  type BloodTestDto,
} from "../models/blood-test.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ExtractBloodTestUseCase extends UseCase<
  ExtractBloodTestInput,
  BloodTestDto
> {
  constructor(
    private readonly service: BloodTestExtractionService = bloodTestExtractionService,
  ) {
    super();
  }

  static validate(input: unknown): ExtractBloodTestInput {
    return ExtractBloodTestInputSchema.parse(input);
  }

  protected async run(input: ExtractBloodTestInput): Promise<BloodTestDto> {
    return this.service.extract(input);
  }
}
