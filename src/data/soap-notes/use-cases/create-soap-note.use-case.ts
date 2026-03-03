import {
  soapNoteService,
  type SoapNoteService,
} from "../service/soap-note.service";
import {
  CreateSoapNoteSchema,
  type CreateSoapNoteInput,
  type SoapNoteDto,
} from "../models/soap-note.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class CreateSoapNoteUseCase extends UseCase<
  CreateSoapNoteInput,
  SoapNoteDto
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: SoapNoteService = soapNoteService,
  ) {
    super();
  }

  static validate(input: unknown): CreateSoapNoteInput {
    return CreateSoapNoteSchema.parse(input);
  }

  protected async run(input: CreateSoapNoteInput): Promise<SoapNoteDto> {
    return this.service.upsertBySession(input, this.dependentId);
  }
}
