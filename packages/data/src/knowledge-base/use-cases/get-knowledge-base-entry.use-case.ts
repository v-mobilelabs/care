import {
  knowledgeBaseService,
  type KnowledgeBaseService,
} from "../service/knowledge-base.service";
import {
  KnowledgeBaseRefSchema,
  type KnowledgeBaseRefInput,
  type KnowledgeBaseDto,
} from "../models/knowledge-base.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class GetKnowledgeBaseEntryUseCase extends UseCase<
  KnowledgeBaseRefInput,
  KnowledgeBaseDto | null
> {
  constructor(
    private readonly service: KnowledgeBaseService = knowledgeBaseService,
  ) {
    super();
  }

  static validate(input: unknown): KnowledgeBaseRefInput {
    return KnowledgeBaseRefSchema.parse(input);
  }

  protected async run(
    input: KnowledgeBaseRefInput,
  ): Promise<KnowledgeBaseDto | null> {
    return this.service.get(input);
  }
}
