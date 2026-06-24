import { UseCase } from "@/data/shared/use-cases/base.use-case";
import {
  doctorProfileService,
  type DoctorProfileService,
} from "../service/doctor-profile.service";
import {
  RegisterDoctorSchema,
  type RegisterDoctorInput,
  type DoctorProfileDto,
} from "../models/doctor-profile.model";

export class RegisterDoctorUseCase extends UseCase<
  RegisterDoctorInput,
  DoctorProfileDto
> {
  constructor(
    private readonly service: DoctorProfileService = doctorProfileService,
  ) {
    super();
  }

  static validate(input: unknown): RegisterDoctorInput {
    return RegisterDoctorSchema.parse(input);
  }

  protected async run(input: RegisterDoctorInput): Promise<DoctorProfileDto> {
    return this.service.register(input);
  }
}
