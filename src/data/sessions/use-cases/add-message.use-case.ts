import { z } from "zod";
import {
  messageService,
  type MessageService,
} from "../service/message.service";
import { type MessageDto } from "../models/message.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { FindOrCreateSessionUseCase } from "./find-or-create-session.use-case";
import { CreateSessionUseCase } from "./create-session.use-case";

// Extends the base message schema: sessionId is optional (resolved internally).
const AddMessageUseCaseSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  profileId: z.string().min(1, { message: "profileId is required" }),
  sessionId: z.string().min(1).optional(),
  title: z.string().min(1).max(120).optional().default("New Session"),
  role: z.enum(["user", "assistant"], {
    error: "role must be 'user' or 'assistant'",
  }),
  /** UIMessage parts serialised to JSON string, or a plain text string */
  content: z.string().min(1, { message: "content must not be empty" }),
});

export type AddMessageUseCaseInput = z.infer<typeof AddMessageUseCaseSchema>;

export class AddMessageUseCase extends UseCase<
  AddMessageUseCaseInput,
  MessageDto
> {
  constructor(
    private readonly service: MessageService = messageService,
    private readonly findOrCreateSession: FindOrCreateSessionUseCase = new FindOrCreateSessionUseCase(),
    private readonly createSession: CreateSessionUseCase = new CreateSessionUseCase(),
  ) {
    super();
  }

  static validate(input: unknown): AddMessageUseCaseInput {
    return AddMessageUseCaseSchema.parse(input);
  }

  protected async run(input: AddMessageUseCaseInput): Promise<MessageDto> {
    // ── 1. Resolve session ────────────────────────────────────────────────────
    let sessionId: string;
    if (input.sessionId) {
      const session = await this.findOrCreateSession.execute(
        FindOrCreateSessionUseCase.validate({
          userId: input.userId,
          profileId: input.profileId,
          sessionId: input.sessionId,
          title: input.title,
        }),
      );
      sessionId = session.id;
    } else {
      const session = await this.createSession.execute(
        CreateSessionUseCase.validate({
          userId: input.userId,
          profileId: input.profileId,
          title: input.title,
        }),
      );
      sessionId = session.id;
    }

    // ── 2. Persist message ────────────────────────────────────────────────────
    return this.service.add({
      userId: input.userId,
      profileId: input.profileId,
      sessionId,
      role: input.role,
      content: input.content,
    });
  }
}
