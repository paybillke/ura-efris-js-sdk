import { EFRISException } from "./efris";

/**
 * Validation error with field-level details
 */
export class ValidationException extends EFRISException {
  public readonly errors: Record<string, string>;

  constructor(
    message: string,
    errors: Record<string, string>,
    errorType: string = "VALIDATION_ERROR"
  ) {
    super(message, errorType);

    // Restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = "ValidationException";
    this.errors = errors;
  }

  /**
   * Get all validation errors
   */
  public getErrors(): Record<string, string> {
    return this.errors;
  }

  /**
   * Get the error for a specific field path, if any
   */
  public getFieldError(fieldPath: string): string | undefined {
    return this.errors[fieldPath];
  }

  /**
   * Returns true if there are any errors
   */
  public hasErrors(): boolean {
    return Object.keys(this.errors).length > 0;
  }

  /**
   * String representation
   */
  public toString(): string {
    return `${this.message}: ${JSON.stringify(this.errors)}`;
  }
}