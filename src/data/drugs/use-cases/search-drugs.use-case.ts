import { drugService, type DrugService } from "../service/drug.service";
import {
  SearchDrugsSchema,
  type SearchDrugsInput,
  type DrugDto,
} from "../models/drug.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class SearchDrugsUseCase extends UseCase<SearchDrugsInput, DrugDto[]> {
  constructor(private readonly service: DrugService = drugService) {
    super();
  }

  static validate(input: unknown): SearchDrugsInput {
    return SearchDrugsSchema.parse(input);
  }

  protected async run(input: SearchDrugsInput): Promise<DrugDto[]> {
    return this.service.search(input);
  }
}
