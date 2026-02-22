import { EFRISException } from "./efris";

/**
 * Schema not found in registry
 */
export class SchemaNotFoundException extends EFRISException {
  constructor(schemaKey: string) {
    super(`Schema '${schemaKey}' not found in registry`, "SCHEMA_NOT_FOUND");

    // Restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = "SchemaNotFoundException";
  }
}