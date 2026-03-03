import {
  soapNoteService,
  type SoapNoteService,
} from "../service/soap-note.service";
import {
  ListSoapNotesSchema,
  type ListSoapNotesInput,
  type SoapNoteDto,
} from "../models/soap-note.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ListSoapNotesUseCase extends UseCase<
  ListSoapNotesInput,
  SoapNoteDto[]
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: SoapNoteService = soapNoteService,
  ) {
    super();
  }

  static validate(input: unknown): ListSoapNotesInput {
    return ListSoapNotesSchema.parse(input);
  }

  protected async run(input: ListSoapNotesInput): Promise<SoapNoteDto[]> {
    return this.service.list(input, this.dependentId);
  }
}
