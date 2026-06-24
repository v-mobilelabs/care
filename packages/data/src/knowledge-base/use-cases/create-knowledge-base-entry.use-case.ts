import {
  knowledgeBaseService,
  type KnowledgeBaseService,
} from "../service/knowledge-base.service";
import {
  CreateKnowledgeBaseSchema,
  type CreateKnowledgeBaseInput,
  type KnowledgeBaseDto,
} from "../models/knowledge-base.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class CreateKnowledgeBaseEntryUseCase extends UseCase<
  CreateKnowledgeBaseInput,
  KnowledgeBaseDto
> {
  constructor(
    private readonly service: KnowledgeBaseService = knowledgeBaseService,
  ) {
    super();
  }

  static validate(input: unknown): CreateKnowledgeBaseInput {
    return CreateKnowledgeBaseSchema.parse(input);
  }

  protected async run(
    input: CreateKnowledgeBaseInput,
  ): Promise<KnowledgeBaseDto> {
    return this.service.create(input);
  }
}
