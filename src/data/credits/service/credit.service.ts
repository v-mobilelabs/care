import { creditRepository } from "../repositories/credit.repository";
import type { CreditDto } from "../models/credit.model";

export class CreditService {
  constructor(private readonly repo = creditRepository) {}

  get(userId: string): Promise<CreditDto> {
    return this.repo.get(userId);
  }

  /** Atomically consume 1 credit. Returns the result of the transaction. */
  consume(userId: string): Promise<{ ok: boolean; remaining: number }> {
    return this.repo.consume(userId);
  }
}

export const creditService = new CreditService();
