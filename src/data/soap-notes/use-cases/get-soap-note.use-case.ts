import {
  soapNoteService,
  type SoapNoteService,
} from "../service/soap-note.service";
import {
  SoapNoteRefSchema,
  type SoapNoteRefInput,
  type SoapNoteDto,
} from "../models/soap-note.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class GetSoapNoteUseCase extends UseCase<
  SoapNoteRefInput,
  SoapNoteDto | null
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: SoapNoteService = soapNoteService,
  ) {
    super();
  }

  static validate(input: unknown): SoapNoteRefInput {
    return SoapNoteRefSchema.parse(input);
  }

  protected async run(input: SoapNoteRefInput): Promise<SoapNoteDto | null> {
    return this.service.getById(input, this.dependentId);
  }
}
