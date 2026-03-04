export * from "./models/lab.model";
export { labRepository } from "./repositories/lab.repository";
export { labService, LabService } from "./service/lab.service";
export { CreateLabUseCase } from "./use-cases/create-lab.use-case";
export { ListLabsUseCase } from "./use-cases/list-labs.use-case";
export { GetLabUseCase } from "./use-cases/get-lab.use-case";
export { DeleteLabUseCase } from "./use-cases/delete-lab.use-case";
