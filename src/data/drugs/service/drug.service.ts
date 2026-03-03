import { drugRepository } from "../repositories/drug.repository";
import type { SearchDrugsInput, DrugDto } from "../models/drug.model";

export class DrugService {
  async search(input: SearchDrugsInput): Promise<DrugDto[]> {
    return drugRepository.search(input.q, input.limit);
  }
}

export const drugService = new DrugService();
