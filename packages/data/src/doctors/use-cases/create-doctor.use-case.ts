import { doctorService, type DoctorService } from "../service/doctor.service";
import {
  CreateDoctorSchema,
  type CreateDoctorInput,
  type DoctorDto,
} from "../models/doctor.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class CreateDoctorUseCase extends UseCase<CreateDoctorInput, DoctorDto> {
  constructor(private readonly service: DoctorService = doctorService) {
    super();
  }

  static validate(input: unknown): CreateDoctorInput {
    return CreateDoctorSchema.parse(input);
  }

  protected async run(input: CreateDoctorInput): Promise<DoctorDto> {
    return this.service.create(input);
  }
}
