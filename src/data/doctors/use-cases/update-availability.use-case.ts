import { UseCase } from "@/data/shared/use-cases/base.use-case";
import {
  doctorProfileService,
  type DoctorProfileService,
} from "../service/doctor-profile.service";
import {
  UpdateAvailabilitySchema,
  type UpdateAvailabilityInput,
  type DoctorProfileDto,
} from "../models/doctor-profile.model";

export class UpdateAvailabilityUseCase extends UseCase<
  UpdateAvailabilityInput,
  DoctorProfileDto
> {
  constructor(
    private readonly service: DoctorProfileService = doctorProfileService,
  ) {
    super();
  }

  static validate(input: unknown): UpdateAvailabilityInput {
    return UpdateAvailabilitySchema.parse(input);
  }

  protected async run(
    input: UpdateAvailabilityInput,
  ): Promise<DoctorProfileDto> {
    return this.service.updateAvailability(input);
  }
}
