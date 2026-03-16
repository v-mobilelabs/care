/**
 * Thrown by AIService when a user has exhausted their daily credit limit.
 * API routes should catch this and return a 402 Payment Required response.
 */
export class CreditsExhaustedError extends Error {
  readonly code = "CREDITS_EXHAUSTED";
  readonly statusCode = 402;

  constructor(
    public readonly remaining: number,
    message = "You've used all your credits for today.",
  ) {
    super(message);
    this.name = "CreditsExhaustedError";
    Object.setPrototypeOf(this, CreditsExhaustedError.prototype);
  }

  /**
   * Returns a formatted message with the reset time (midnight UTC).
   */
  toResponseMessage(): string {
    const reset = new Date(
      Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate() + 1,
      ),
    );
    return `You've used all your credits for today. They reset at ${reset.toUTCString().replace(/ GMT$/, " UTC")}.`;
  }
}
