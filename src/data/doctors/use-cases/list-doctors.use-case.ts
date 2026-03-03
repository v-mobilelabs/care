import { doctorService, type DoctorService } from "../service/doctor.service";
import {
  ListDoctorsSchema,
  type ListDoctorsInput,
  type DoctorDto,
} from "../models/doctor.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ListDoctorsUseCase extends UseCase<ListDoctorsInput, DoctorDto[]> {
  constructor(private readonly service: DoctorService = doctorService) {
    super();
  }

  static validate(input: unknown): ListDoctorsInput {
    return ListDoctorsSchema.parse(input);
  }

  protected async run(input: ListDoctorsInput): Promise<DoctorDto[]> {
    return this.service.list(input);
  }
}
