import { UseCase } from "@/data/shared/use-cases/base.use-case";
import {
  SetWorkflowThreadStateSchema,
  type SetWorkflowThreadStateInput,
  type WorkflowThreadDto,
} from "../models/workflow-state.model";
import {
  workflowStateService,
  type WorkflowStateService,
} from "../service/workflow-state.service";

export class SetWorkflowThreadStateUseCase extends UseCase<
  SetWorkflowThreadStateInput,
  WorkflowThreadDto
> {
  constructor(
    private readonly service: WorkflowStateService = workflowStateService,
  ) {
    super();
  }

  static validate(input: unknown): SetWorkflowThreadStateInput {
    return SetWorkflowThreadStateSchema.parse(input);
  }

  protected async run(
    input: SetWorkflowThreadStateInput,
  ): Promise<WorkflowThreadDto> {
    return this.service.setThreadState(input);
  }
}
