import { z } from "zod";
import {
  prescriptionService,
  type PrescriptionService,
} from "../service/prescription.service";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

const DeletePrescriptionByFileSchema = z.object({
  userId: z.string().min(1),
  profileId: z.string().min(1),
  fileId: z.string().min(1),
});

type DeletePrescriptionByFileInput = z.infer<
  typeof DeletePrescriptionByFileSchema
>;

export class DeletePrescriptionByFileUseCase extends UseCase<
  DeletePrescriptionByFileInput,
  void
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: PrescriptionService = prescriptionService,
  ) {
    super();
  }

  static validate(input: unknown): DeletePrescriptionByFileInput {
    return DeletePrescriptionByFileSchema.parse(input);
  }

  protected async run(input: DeletePrescriptionByFileInput): Promise<void> {
    return this.service.deleteByFileId(
      input.userId,
      input.profileId,
      input.fileId,
      this.dependentId,
    );
  }
}
