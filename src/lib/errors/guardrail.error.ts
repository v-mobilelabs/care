/**
 * Thrown by guardrail middleware when user input is blocked.
 * API routes should catch this and return a 400 response with a safe message.
 */
export class GuardrailError extends Error {
  readonly code = "GUARDRAIL_BLOCKED";
  readonly statusCode = 400;

  constructor(
    public readonly category: "harmful" | "injection" | "off-topic",
    message = "Your message was blocked by our safety policy.",
  ) {
    super(message);
    this.name = "GuardrailError";
    Object.setPrototypeOf(this, GuardrailError.prototype);
  }

  toResponseMessage(): string {
    switch (this.category) {
      case "harmful":
        return "I can't respond to that request. If you're experiencing a crisis, please contact emergency services (112) or a crisis helpline immediately.";
      case "injection":
        return "Your message was blocked by our safety policy.";
      case "off-topic":
        return "I'm a medical AI assistant and can only help with health-related questions. Please rephrase your question in a medical context.";
    }
  }
}
