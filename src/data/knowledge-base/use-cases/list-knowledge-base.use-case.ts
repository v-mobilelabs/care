import {
  knowledgeBaseService,
  type KnowledgeBaseService,
} from "../service/knowledge-base.service";
import {
  ListKnowledgeBaseSchema,
  type ListKnowledgeBaseInput,
  type PaginatedKnowledgeBase,
} from "../models/knowledge-base.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ListKnowledgeBaseUseCase extends UseCase<
  ListKnowledgeBaseInput,
  PaginatedKnowledgeBase
> {
  constructor(
    private readonly service: KnowledgeBaseService = knowledgeBaseService,
  ) {
    super();
  }

  static validate(input: unknown): ListKnowledgeBaseInput {
    return ListKnowledgeBaseSchema.parse(input);
  }

  protected async run(
    input: ListKnowledgeBaseInput,
  ): Promise<PaginatedKnowledgeBase> {
    return this.service.list(input);
  }
}
