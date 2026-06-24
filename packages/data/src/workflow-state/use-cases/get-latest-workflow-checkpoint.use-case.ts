import { UseCase } from "@/data/shared/use-cases/base.use-case";
import {
  GetLatestWorkflowCheckpointSchema,
  type GetLatestWorkflowCheckpointInput,
  type WorkflowCheckpointDto,
} from "../models/workflow-state.model";
import {
  workflowStateService,
  type WorkflowStateService,
} from "../service/workflow-state.service";

export class GetLatestWorkflowCheckpointUseCase extends UseCase<
  GetLatestWorkflowCheckpointInput,
  WorkflowCheckpointDto | null
> {
  constructor(
    private readonly service: WorkflowStateService = workflowStateService,
  ) {
    super();
  }

  static validate(input: unknown): GetLatestWorkflowCheckpointInput {
    return GetLatestWorkflowCheckpointSchema.parse(input);
  }

  protected async run(
    input: GetLatestWorkflowCheckpointInput,
  ): Promise<WorkflowCheckpointDto | null> {
    return this.service.getLatestActiveCheckpoint(input);
  }
}
