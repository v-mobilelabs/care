/**
 * Thrown when a file's content doesn't match the expected document type
 * (e.g. uploading a selfie as a prescription). API routes catch this
 * and return a 422 Unprocessable Entity response.
 */
export class FileValidationError extends Error {
  readonly code = "FILE_VALIDATION_FAILED";
  readonly statusCode = 422;

  constructor(
    public readonly expectedType: string,
    message?: string,
  ) {
    super(
      message ??
        `The uploaded file does not appear to be a valid ${expectedType}.`,
    );
    this.name = "FileValidationError";
    Object.setPrototypeOf(this, FileValidationError.prototype);
  }

  toResponseMessage(): string {
    return this.message;
  }
}
