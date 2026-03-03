import { trace, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("careai.use-cases");

/**
 * Abstract base for every use case.
 *
 * Wraps the concrete `run()` implementation in an OpenTelemetry span whose
 * name is automatically derived from the subclass constructor name
 * (e.g. "CreateSessionUseCase"). Exceptions are recorded on the span and
 * re-thrown so callers still receive normal error propagation.
 *
 * Usage:
 * ```ts
 * export class CreateSessionUseCase extends UseCase<CreateSessionInput, SessionDto> {
 *   protected async run(input: CreateSessionInput): Promise<SessionDto> {
 *     return this.service.create(input);
 *   }
 * }
 * ```
 */
export abstract class UseCase<TInput, TOutput> {
  async execute(input: TInput): Promise<TOutput> {
    const spanName = this.constructor.name;
    return tracer.startActiveSpan(spanName, async (span) => {
      try {
        const result = await this.run(input);
        span.setStatus({ code: SpanStatusCode.OK });
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
