import { Usage } from "../models/usage.model";
import { UsageRepository } from "../repositories/usage.repository";

const USAGE_DEFAULTS = {
  credits: 100,
  minutes: 1000,
  storage: 1024,
};

export class UsageService {
  constructor(private repo: UsageRepository) {}

  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  async getUsage(profile: string): Promise<Usage> {
    let usage = await this.repo.getUsage(profile);
    const currentMonth = this.getCurrentMonth();
    if (!usage || usage.lastReset !== currentMonth) {
      usage = {
        profile,
        credits: USAGE_DEFAULTS.credits,
        minutes: USAGE_DEFAULTS.minutes,
        storage: USAGE_DEFAULTS.storage,
        lastReset: currentMonth,
      };
      await this.repo.setUsage(profile, usage);
    }
    return usage;
  }

  async updateUsage(profile: string, partial: Partial<Usage>): Promise<Usage> {
    const usage = await this.getUsage(profile);
    const updated: Usage = { ...usage, ...partial };
    await this.repo.setUsage(profile, updated);
    return updated;
  }
}
