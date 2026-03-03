import { doctorService, type DoctorService } from "../service/doctor.service";
import {
  DeleteDoctorSchema,
  type DeleteDoctorInput,
} from "../models/doctor.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class DeleteDoctorUseCase extends UseCase<DeleteDoctorInput, void> {
  constructor(private readonly service: DoctorService = doctorService) {
    super();
  }

  static validate(input: unknown): DeleteDoctorInput {
    return DeleteDoctorSchema.parse(input);
  }

  protected async run(input: DeleteDoctorInput): Promise<void> {
    await this.service.delete(input);
  }
}
