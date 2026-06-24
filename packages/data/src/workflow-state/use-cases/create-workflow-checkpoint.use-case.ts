import { UseCase } from "@/data/shared/use-cases/base.use-case";
import {
  CreateWorkflowCheckpointSchema,
  type CreateWorkflowCheckpointInput,
  type WorkflowCheckpointDto,
} from "../models/workflow-state.model";
import {
  workflowStateService,
  type WorkflowStateService,
} from "../service/workflow-state.service";

export class CreateWorkflowCheckpointUseCase extends UseCase<
  CreateWorkflowCheckpointInput,
  WorkflowCheckpointDto
> {
  constructor(
    private readonly service: WorkflowStateService = workflowStateService,
  ) {
    super();
  }

  static validate(input: unknown): CreateWorkflowCheckpointInput {
    return CreateWorkflowCheckpointSchema.parse(input);
  }

  protected async run(
    input: CreateWorkflowCheckpointInput,
  ): Promise<WorkflowCheckpointDto> {
    return this.service.createCheckpoint(input);
  }
}
