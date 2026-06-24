import {
  knowledgeBaseService,
  type KnowledgeBaseService,
} from "../service/knowledge-base.service";
import {
  UpdateKnowledgeBaseSchema,
  type UpdateKnowledgeBaseInput,
  type KnowledgeBaseDto,
} from "../models/knowledge-base.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class UpdateKnowledgeBaseEntryUseCase extends UseCase<
  UpdateKnowledgeBaseInput,
  KnowledgeBaseDto | null
> {
  constructor(
    private readonly service: KnowledgeBaseService = knowledgeBaseService,
  ) {
    super();
  }

  static validate(input: unknown): UpdateKnowledgeBaseInput {
    return UpdateKnowledgeBaseSchema.parse(input);
  }

  protected async run(
    input: UpdateKnowledgeBaseInput,
  ): Promise<KnowledgeBaseDto | null> {
    return this.service.update(input);
  }
}
