import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { artifactShareService } from "../service/artifact-share.service";
import {
  CreateArtifactShareInputSchema,
  type CreateArtifactShareInput,
  type ArtifactShareDto,
} from "../models/artifact-share.model";
import { z } from "zod";

const CreateArtifactShareWithProfileSchema =
  CreateArtifactShareInputSchema.extend({
    profileId: z.string().min(1),
  });

export class CreateArtifactShareUseCase extends UseCase<
  CreateArtifactShareInput & { profileId: string },
  ArtifactShareDto
> {
  static validate(
    input: unknown,
  ): CreateArtifactShareInput & { profileId: string } {
    return CreateArtifactShareWithProfileSchema.parse(input);
  }

  protected async run(
    input: CreateArtifactShareInput & { profileId: string },
  ): Promise<ArtifactShareDto> {
    const { profileId, ...shareInput } = input;
    return artifactShareService.shareArtifact(profileId, shareInput);
  }
}
