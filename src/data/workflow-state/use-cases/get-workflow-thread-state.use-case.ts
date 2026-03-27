import { UseCase } from "@/data/shared/use-cases/base.use-case";
import {
  GetWorkflowThreadStateSchema,
  type GetWorkflowThreadStateInput,
  type WorkflowThreadDto,
} from "../models/workflow-state.model";
import {
  workflowStateService,
  type WorkflowStateService,
} from "../service/workflow-state.service";

export class GetWorkflowThreadStateUseCase extends UseCase<
  GetWorkflowThreadStateInput,
  WorkflowThreadDto | null
> {
  constructor(
    private readonly service: WorkflowStateService = workflowStateService,
  ) {
    super();
  }

  static validate(input: unknown): GetWorkflowThreadStateInput {
    return GetWorkflowThreadStateSchema.parse(input);
  }

  protected async run(
    input: GetWorkflowThreadStateInput,
  ): Promise<WorkflowThreadDto | null> {
    return this.service.getActiveThreadState(input);
  }
}
