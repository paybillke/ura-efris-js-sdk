import { EFRISException } from "./efris";

/**
 * API communication error
 */
export class APIException extends EFRISException {
  public readonly statusCode?: number;
  public readonly returnCode?: string;

  constructor(
    message: string,
    statusCode?: number,
    returnCode?: string,
    errorType: string = "API_ERROR"
  ) {
    super(message, errorType);

    // Restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = "APIException";
    this.statusCode = statusCode;
    this.returnCode = returnCode;
  }

  public getStatusCode(): number | undefined {
    return this.statusCode;
  }

  public getReturnCode(): string | undefined {
    return this.returnCode;
  }
}