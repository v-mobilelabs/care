import { artifactShareRepository } from "../repositories/artifact-share.repository";
import type {
  ArtifactShareDto,
  CreateArtifactShareInput,
} from "../models/artifact-share.model";

/**
 * Service for managing artifact shares.
 * Orchestrates repository operations and business logic.
 */
export const artifactShareService = {
  async shareArtifact(
    profileId: string,
    input: CreateArtifactShareInput,
  ): Promise<ArtifactShareDto> {
    // Create the share record
    const share = await artifactShareRepository.create(profileId, {
      artifactType: input.artifactType,
      artifactId: input.artifactId,
      doctorId: input.doctorId,
      shareStatus: "pending",
      message: input.message,
    });

    // TODO: Send doctor notification
    // Once notifications service is integrated:
    // await notificationService.sendDoctorNotification({
    //   doctorId: input.doctorId,
    //   message: `Patient shared ${input.artifactType} with you`,
    //   shareId: share.id,
    // });

    return share;
  },

  async getShare(
    profileId: string,
    shareId: string,
  ): Promise<ArtifactShareDto | null> {
    return artifactShareRepository.findById(profileId, shareId);
  },

  async listShares(
    profileId: string,
    limit?: number,
  ): Promise<ArtifactShareDto[]> {
    return artifactShareRepository.listByProfile(profileId, limit);
  },

  async updateShareStatus(
    profileId: string,
    shareId: string,
    status: "pending" | "accepted" | "declined",
  ): Promise<void> {
    return artifactShareRepository.updateStatus(profileId, shareId, status);
  },

  async deleteShare(profileId: string, shareId: string): Promise<void> {
    return artifactShareRepository.delete(profileId, shareId);
  },
};
