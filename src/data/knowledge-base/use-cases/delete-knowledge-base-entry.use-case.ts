import {
  knowledgeBaseService,
  type KnowledgeBaseService,
} from "../service/knowledge-base.service";
import {
  KnowledgeBaseRefSchema,
  type KnowledgeBaseRefInput,
} from "../models/knowledge-base.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class DeleteKnowledgeBaseEntryUseCase extends UseCase<
  KnowledgeBaseRefInput,
  void
> {
  constructor(
    private readonly service: KnowledgeBaseService = knowledgeBaseService,
  ) {
    super();
  }

  static validate(input: unknown): KnowledgeBaseRefInput {
    return KnowledgeBaseRefSchema.parse(input);
  }

  protected async run(input: KnowledgeBaseRefInput): Promise<void> {
    await this.service.delete(input);
  }
}
