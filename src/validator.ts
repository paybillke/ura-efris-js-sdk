import Joi, { Schema } from 'joi';
import { ValidationException } from './exceptions';
import { ApiEnvelope, CustomTypes, SchemaRegistry } from './schema';

type AnyObject = Record<string, any>;

export class Validator {
  /**
   * Validate request data against schema.
   */
  public validate(data: AnyObject, schemaKey: string): AnyObject {
    const schemaMap = SchemaRegistry.get();

    if (!schemaMap[schemaKey] || !schemaMap[schemaKey].request) {
      return data;
    }

    const classSchema = schemaMap[schemaKey].request;

    if (classSchema === 'array') {
      if (!Array.isArray(data)) {
        throw new ValidationException(
          'Payload validation failed',
          { _root: 'Expected array' }
        );
      }
      return data;
    }

    try {
      return this.validateDataAgainstSchema(data, classSchema);
    } catch (err: any) {
      throw this.formatValidationException(err);
    }
  }

  /**
   * Validate response data against schema (non-blocking).
   */
  public validateResponse(response: AnyObject, schemaKey: string): AnyObject {
    const schemaMap = SchemaRegistry.get();
    if (!schemaMap[schemaKey] || !schemaMap[schemaKey].response) return response;

    const classSchema = schemaMap[schemaKey].response;
    if (classSchema === 'array') return response;

    try {
      this.validateDataAgainstSchema(response, classSchema);
    } catch (err: any) {
      console.warn(`⚠️ Response validation warning for ${schemaKey}:`, err.details);
    }

    return response;
  }

  /**
   * Validate full API envelope.
   */
  public validateEnvelope(envelope: AnyObject, interfaceCode: string): AnyObject {
    try {
      this.validateDataAgainstSchema(envelope, ApiEnvelope);

      if (
        envelope.data?.content &&
        typeof envelope.data.content === 'string'
      ) {
        const decoded = JSON.parse(
          Buffer.from(envelope.data.content, 'base64').toString()
        );
        if (decoded && typeof decoded === 'object') {
          this.validate(decoded, interfaceCode);
        }
      }

      return envelope;
    } catch (err: any) {
      throw this.formatValidationException(err);
    }
  }

  /**
   * Get schema field definitions.
   */
  public getSchemaFields(schemaKey: string): AnyObject | null {
    const schemaMap = SchemaRegistry.get();
    const classSchema = schemaMap[schemaKey]?.request || schemaMap[schemaKey]?.response;

    if (classSchema === 'array') {
      return { __root__: { type: 'array', required: true, description: 'List of items' } };
    }

    if (typeof classSchema !== 'object' || classSchema === null) return null;

    const fields: AnyObject = {};
    for (const key in classSchema) {
      const type = classSchema![key];
      fields[key] = {
        type,
        required: true,
        default: undefined,
        description: '',
      };
    }

    return fields;
  }

  /**
   * Get all schema keys.
   */
  public getAllSchemaKeys(): string[] {
    return Object.keys(SchemaRegistry.get());
  }

  // ======================================================
  // INTERNAL HELPERS
  // ======================================================

  private validateDataAgainstSchema(data: AnyObject, schemaDef: any): AnyObject {
    let joiSchema: Schema;

    if (schemaDef === 'array') {
      joiSchema = Joi.array();
    } else if (typeof schemaDef === 'object') {
      const keys: Record<string, Schema> = {};
      for (const key in schemaDef) {
        keys[key] = this.getPropertyValidator(key);
      }
      joiSchema = Joi.object(keys);
    } else {
      throw new Error('Invalid schema definition');
    }

    const { error, value } = joiSchema.validate(data, { abortEarly: false, allowUnknown: true });
    if (error) throw error;

    return value;
  }

  private getPropertyValidator(propertyName: string): Schema {
    switch (propertyName) {
      case 'tin':
        return CustomTypes.tin();
      case 'ninBrn':
      case 'buyerNinBrn':
        return CustomTypes.ninBrn();
      case 'deviceNo':
        return CustomTypes.deviceNo();
      case 'invoiceNo':
      case 'oriInvoiceNo':
        return CustomTypes.code20();
      case 'currency':
        return CustomTypes.currency();
      case 'invoiceType':
        return CustomTypes.invoiceType();
      case 'invoiceKind':
        return CustomTypes.invoiceKind();
      case 'issuedDate':
      case 'applicationTime':
        return CustomTypes.dtRequest();
      case 'grossAmount':
      case 'taxAmount':
      case 'netAmount':
      case 'total':
      case 'unitPrice':
        return CustomTypes.amount16_2();
      case 'taxRate':
        return CustomTypes.rate12_8();
      case 'buyerType':
        return CustomTypes.buyerType();
      case 'modeCode':
        return CustomTypes.modeCode();
      case 'dataSource':
        return CustomTypes.dataSource();
      case 'uuid32':
      case 'dataExchangeId':
        return CustomTypes.uuid32();
      case 'branchId':
      case 'invoiceId':
      case 'goodsCategoryId':
        return CustomTypes.code18();
      case 'item':
      case 'goodsName':
      case 'legalName':
      case 'businessName':
        return CustomTypes.code200();
      case 'address':
      case 'placeOfBusiness':
      case 'branchName':
        return CustomTypes.code500();
      case 'remarks':
      case 'reason':
      case 'description':
        return CustomTypes.code1024();
      default:
        return Joi.any();
    }
  }

  private formatValidationException(err: any): ValidationException {
    const errors: Record<string, string> = {};
    if (err.details) {
      for (const detail of err.details) {
        errors[detail.path.join('.')] = detail.message;
      }
    } else {
      errors._general = err.message;
    }

    return new ValidationException(
      'Payload validation failed',
      errors,
      'VALIDATION_ERROR'
    );
  }
}