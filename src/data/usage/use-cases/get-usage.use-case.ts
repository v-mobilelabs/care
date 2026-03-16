import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { Usage } from "../models/usage.model";

import { UsageService } from "../service/lazy-reset-usage.service";
import { UsageRepository } from "../repositories/usage.repository";

export class GetUsageUseCase extends UseCase<{ profile: string }, Usage> {
  static validate(input: { profile: string }) {
    // Add real validation if needed
    return input;
  }
  private readonly service = new UsageService(new UsageRepository());

  protected async run(input: { profile: string }): Promise<Usage> {
    return this.service.getUsage(input.profile);
  }
}
