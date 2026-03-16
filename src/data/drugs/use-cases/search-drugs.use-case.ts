import { drugRepository } from "../repositories/drug.repository";
import {
  SearchDrugsSchema,
  type SearchDrugsInput,
  type DrugDto,
} from "../models/drug.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class SearchDrugsUseCase extends UseCase<SearchDrugsInput, DrugDto[]> {
  static validate(input: unknown): SearchDrugsInput {
    return SearchDrugsSchema.parse(input);
  }

  protected async run(input: SearchDrugsInput): Promise<DrugDto[]> {
    return drugRepository.search(input.q, input.limit);
  }
}
