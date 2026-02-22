/**
 * Base exception for EFRIS
 */
export class EFRISException extends Error {
  public readonly errorType: string;

  constructor(message: string, errorType: string = "UNKNOWN") {
    super(message);

    // Restore prototype chain (important when targeting ES5)
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = "EFRISException";
    this.errorType = errorType;
  }

  public getErrorType(): string {
    return this.errorType;
  }
}