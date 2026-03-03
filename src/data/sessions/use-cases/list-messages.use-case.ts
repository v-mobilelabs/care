import {
  messageService,
  type MessageService,
} from "../service/message.service";
import {
  ListMessagesSchema,
  type ListMessagesInput,
  type MessageDto,
} from "../models/message.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ListMessagesUseCase extends UseCase<
  ListMessagesInput,
  MessageDto[]
> {
  constructor(private readonly service: MessageService = messageService) {
    super();
  }

  static validate(input: unknown): ListMessagesInput {
    return ListMessagesSchema.parse(input);
  }

  protected async run(input: ListMessagesInput): Promise<MessageDto[]> {
    return this.service.list(input);
  }
}
