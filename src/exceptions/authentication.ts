import { EFRISException } from "./efris";

/**
 * Raised when authentication fails (e.g., invalid PFX, wrong password).
 * Uses HTTP 401 status code by default.
 */
export class AuthenticationException extends EFRISException {
  public readonly statusCode: number;

  constructor(
    message: string = "Authentication failed",
    statusCode: number = 401
  ) {
    super(message, "AUTHENTICATION_ERROR");

    // Restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = "AuthenticationException";
    this.statusCode = statusCode;
  }

  public getStatusCode(): number {
    return this.statusCode;
  }
}