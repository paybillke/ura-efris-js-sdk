import Joi, { StringSchema, NumberSchema } from "joi";

/**
 * Custom type validators for EFRIS API using Joi
 */
export class CustomTypes {
  // --- Strings & Codes ---

  static tin(): StringSchema {
    return Joi.string().min(10).max(20).pattern(/^[A-Z0-9]{10,20}$/);
  }

  static ninBrn(): StringSchema {
    return Joi.string().max(100).min(1);
  }

  static deviceNo(): StringSchema {
    return Joi.string().max(20).min(1);
  }

  static uuid32(): StringSchema {
    return Joi.string().length(32);
  }

  static code(min: number, max: number): StringSchema {
    return Joi.string().min(min).max(max);
  }

  static code1() { return this.code(1, 1); }
  static code2() { return this.code(1, 2); }
  static code3() { return this.code(3, 3); }
  static code4() { return this.code(1, 4); }
  static code5() { return this.code(1, 5); }
  static code6() { return this.code(1, 6); }
  static code10() { return this.code(1, 10); }
  static code14() { return this.code(1, 14); }
  static code16() { return this.code(1, 16); }
  static code18() { return this.code(1, 18); }
  static code20() { return this.code(1, 20); }
  static code21() { return this.code(1, 21); }
  static code30() { return this.code(1, 30); }
  static code32() { return this.code(1, 32); }
  static code35() { return this.code(1, 35); }
  static code50() { return this.code(1, 50); }
  static code60() { return this.code(1, 60); }
  static code80() { return this.code(1, 80); }
  static code100() { return this.code(1, 100); }
  static code128() { return this.code(1, 128); }
  static code150() { return this.code(1, 150); }
  static code200() { return this.code(1, 200); }
  static code256() { return this.code(1, 256); }
  static code400() { return this.code(1, 400); }
  static code500() { return this.code(1, 500); }
  static code600() { return this.code(1, 600); }
  static code1000() { return this.code(1, 1000); }
  static code1024() { return this.code(1, 1024); }
  static code4000() { return this.code(1, 4000); }

  // --- Dates & Times ---

  static dtRequest(): StringSchema {
    return Joi.string().pattern(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  }

  static dtResponse(): StringSchema {
    return Joi.string().pattern(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);
  }

  static dateRequest(): StringSchema {
    return Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/);
  }

  static dateResponse(): StringSchema {
    return Joi.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/);
  }

  // --- Numbers & Amounts ---

  private static amountValidator(intDigits: number, decDigits: number): NumberSchema {
    return Joi.number().custom((value, helpers) => {
      const [intPart, decPart = ""] = value.toString().split(".");
      if (intPart.replace(/[-+]/, "").length > intDigits || decPart.length > decDigits) {
        return helpers.error("any.invalid");
      }
      return value;
    }, "integer/decimal length validation");
  }

  static amount16_2() { return this.amountValidator(16, 2); }
  static amount16_4() { return this.amountValidator(16, 4); }
  static amount20_8() { return this.amountValidator(20, 8); }
  static amountSigned16_2() { return this.amount16_2(); }
  static amountSigned16_4() { return this.amount16_4(); }
  static amountSigned20_8() { return this.amount20_8(); }

  static rate12_8() { return this.amountValidator(12, 8); }
  static rate5_2() { return this.amountValidator(5, 2); }

  // --- Enums & Flags ---

  static yn() { return Joi.string().valid("Y", "N"); }
  static invoiceType() { return Joi.string().valid("1","2","4","5"); }
  static invoiceKind() { return Joi.string().valid("1","2"); }
  static dataSource() { return Joi.string().pattern(/^10[1-8]$/); }
  static industryCode() { return Joi.string().pattern(/^10[1-9]|11[0-2]$/); }
  static discountFlag() { return Joi.string().valid("0","1","2"); }
  static deemedFlag() { return Joi.string().valid("1","2"); }
  static exciseFlag() { return Joi.string().valid("1","2"); }
  static exciseRule() { return Joi.string().valid("1","2"); }
  static buyerType() { return Joi.string().valid("0","1","2","3"); }
  static approveStatus() { return Joi.string().pattern(/^10[1-4]$/); }
  static reasonCode() { return Joi.string().pattern(/^10[1-5]$/); }
  static stockLimit() { return Joi.string().valid("101","102"); }
  static currency() { return Joi.string().length(3).pattern(/^[A-Z]{3}$/); }
  static taxCategoryCode() { return Joi.string().pattern(/^[0-9]{2}$/); }
  static modeCode() { return Joi.string().valid("0","1"); }
  static operationType() { return Joi.string().valid("101","102"); }
  static stockInType() { return Joi.string().valid("101","102","103","104"); }
  static transferType() { return Joi.string().valid("101","102","103"); }
  static queryType() { return Joi.string().valid("0","1"); }
  static haveExcise() { return Joi.string().valid("101","102"); }
  static havePiece() { return this.haveExcise(); }
  static haveCustoms() { return this.haveExcise(); }
  static haveOther() { return this.haveExcise(); }
  static serviceMark() { return this.haveExcise(); }
  static isLeafNode() { return this.haveExcise(); }
  static enableStatus() { return Joi.string().valid("0","1"); }
  static exclusionType() { return Joi.string().valid("0","1","2","3"); }
  static vatApplicable() { return Joi.string().valid("0","1"); }
  static deemedExemptCode() { return Joi.string().valid("101","102"); }
  static highSeaBondFlag() { return Joi.string().valid("1","2"); }
  static deliveryTerms() { return Joi.string().min(1).max(3); }
}