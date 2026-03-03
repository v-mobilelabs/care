import {
  soapNoteService,
  type SoapNoteService,
} from "../service/soap-note.service";
import {
  DeleteSoapNoteSchema,
  type SoapNoteRefInput,
} from "../models/soap-note.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class DeleteSoapNoteUseCase extends UseCase<SoapNoteRefInput, void> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: SoapNoteService = soapNoteService,
  ) {
    super();
  }

  static validate(input: unknown): SoapNoteRefInput {
    return DeleteSoapNoteSchema.parse(input);
  }

  protected async run(input: SoapNoteRefInput): Promise<void> {
    await this.service.delete(input, this.dependentId);
  }
}
