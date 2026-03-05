import { UseCase } from "@/data/shared/use-cases/base.use-case";
import {
  doctorProfileService,
  type DoctorProfileService,
} from "../service/doctor-profile.service";
import {
  GetDoctorProfileSchema,
  type GetDoctorProfileInput,
  type DoctorProfileDto,
} from "../models/doctor-profile.model";

export class GetDoctorProfileUseCase extends UseCase<
  GetDoctorProfileInput,
  DoctorProfileDto | null
> {
  constructor(
    private readonly service: DoctorProfileService = doctorProfileService,
  ) {
    super();
  }

  static validate(input: unknown): GetDoctorProfileInput {
    return GetDoctorProfileSchema.parse(input);
  }

  protected async run(
    input: GetDoctorProfileInput,
  ): Promise<DoctorProfileDto | null> {
    return this.service.getProfile(input);
  }
}
