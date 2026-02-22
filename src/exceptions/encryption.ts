import { EFRISException } from "./efris";

/**
 * Encryption/decryption error
 */
export class EncryptionException extends EFRISException {
  constructor(message: string, errorType: string = "ENCRYPTION_ERROR") {
    super(message, errorType);

    // Restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = "EncryptionException";
  }
}