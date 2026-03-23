import {
  knowledgeBaseService,
  type KnowledgeBaseService,
  type KBSearchResult,
} from "../service/knowledge-base.service";
import {
  SearchKnowledgeBaseSchema,
  type SearchKnowledgeBaseInput,
} from "../models/knowledge-base.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class SearchKnowledgeBaseUseCase extends UseCase<
  SearchKnowledgeBaseInput,
  KBSearchResult[]
> {
  constructor(
    private readonly service: KnowledgeBaseService = knowledgeBaseService,
  ) {
    super();
  }

  static validate(input: unknown): SearchKnowledgeBaseInput {
    return SearchKnowledgeBaseSchema.parse(input);
  }

  protected async run(
    input: SearchKnowledgeBaseInput,
  ): Promise<KBSearchResult[]> {
    return this.service.search(input.query, {
      topK: input.topK,
      category: input.category,
      type: input.type,
    });
  }
}
