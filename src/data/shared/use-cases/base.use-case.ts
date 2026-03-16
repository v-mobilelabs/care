import { trace, SpanStatusCode } from "@opentelemetry/api";
import {
  getIndexableOptions,
  isRemoveOptions,
  buildIndexContent,
  buildIndexMetadata,
} from "./indexable.decorator";
import { ragService } from "@/data/shared/service/rag/rag.service";

const tracer = trace.getTracer("careai.use-cases");

/**
 * Type constraint for UseCase subclasses that ensures they have a static validate method.
 * This allows the base class to automatically validate input before execution.
 */
export interface UseCaseConstructor<TInput> {
  validate(input: unknown): TInput;
}

/**
 * Abstract base for every use case.
 *
 * Wraps the concrete `run()` implementation in an OpenTelemetry span whose
 * name is automatically derived from the subclass constructor name
 * (e.g. "CreateSessionUseCase"). Automatically validates input using the
 * subclass's static `validate()` method before execution. Exceptions are
 * recorded on the span and re-thrown so callers still receive normal error propagation.
 *
 * Usage:
 * ```ts
 * export class CreateSessionUseCase extends UseCase<CreateSessionInput, SessionDto> {
 *   static validate(input: unknown): CreateSessionInput {
 *     return CreateSessionSchema.parse(input);
 *   }
 *
 *   protected async run(input: CreateSessionInput): Promise<SessionDto> {
 *     return this.service.create(input);
 *   }
 * }
 *
 * // Now you can call execute directly with unvalidated input:
 * const result = await new CreateSessionUseCase().execute({ ...data });
 * ```
 */
export abstract class UseCase<TInput, TOutput> {
  /**
   * Validates the input using the subclass's static validate() method,
   * then executes the use case logic wrapped in an OpenTelemetry span.
   *
   * @param input - Raw input that will be validated before execution
   * @returns The result of the use case execution
   * @throws Validation errors from the static validate() method or execution errors
   */
  async execute(input: unknown): Promise<TOutput> {
    const spanName = this.constructor.name;
    return tracer.startActiveSpan(spanName, async (span) => {
      try {
        // Automatically validate input using the subclass's static validate method
        const validatedInput = (
          this.constructor as unknown as UseCaseConstructor<TInput>
        ).validate(input);

        // Run main logic
        const result = await this.run(validatedInput);
        span.setStatus({ code: SpanStatusCode.OK });

        // If decorated as @Indexable, fire-and-forget RAG indexing
        const indexable = getIndexableOptions(this);
        if (indexable) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const inp = validatedInput as any;
          const userId = inp.userId as string;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const dependentId = (this as any).dependentId as string | undefined;
          const profileId = dependentId ?? inp.profileId ?? userId;

          if (isRemoveOptions(indexable)) {
            const sourceId = inp[indexable.sourceIdField] as string;
            void ragService
              .removeDocument({ userId, profileId, sourceId })
              .catch((e) => console.error("[Indexable] Remove failed:", e));
          } else {
            const data = result as Record<string, unknown>;
            const content = buildIndexContent(data, indexable.contentFields);
            const rawSourceId = String(data[indexable.sourceIdField]);
            const sourceId = indexable.sourceIdPrefix
              ? `${indexable.sourceIdPrefix}:${rawSourceId}`
              : rawSourceId;
            const metadata = indexable.metadataFields
              ? buildIndexMetadata(data, indexable.metadataFields)
              : {};

            console.log(
              `[Indexable] Indexing ${indexable.type} (sourceId: ${sourceId})`,
            );
            void ragService
              .indexDocument({
                userId,
                profileId,
                dependentId,
                type: indexable.type,
                sourceId,
                content,
                metadata,
              })
              .catch((e: unknown) =>
                console.error("[Indexable] Indexing failed:", e),
              );
          }
        }

        return result;
      } catch (err) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: err instanceof Error ? err.message : String(err),
        });
        span.recordException(
          err instanceof Error ? err : new Error(String(err)),
        );
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /** Subclasses implement the core business logic here. */
  protected abstract run(input: TInput): Promise<TOutput>;
}
