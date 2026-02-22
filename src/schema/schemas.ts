// =========================================================
// CONFIGURATION
// =========================================================

export class Config {
  static readonly ARBITRARY_TYPES_ALLOWED = true;
  static readonly POPULATE_BY_NAME = true;
  static readonly EXTRA_IGNORE = true;
}

// =========================================================
// OUTER ENVELOPE (Protocol Format)
// =========================================================

export class DataDescription {
  codeType: string;    // pattern: ^[01]$
  encryptCode: string; // pattern: ^[12]$
  zipCode: string;     // pattern: ^[01]$

  constructor(codeType: string, encryptCode: string, zipCode: string) {
    this.codeType = codeType;
    this.encryptCode = encryptCode;
    this.zipCode = zipCode;
  }
}

export class Data {
  content: string | null = null;           // max_length: 40000, Base64 Encoded JSON
  signature: string | null = null;         // max_length: 500
  dataDescription: DataDescription;

  constructor(dataDescription: DataDescription, content: string | null = null, signature: string | null = null) {
    this.dataDescription = dataDescription;
    this.content = content;
    this.signature = signature;
  }
}

export class ExtendField {
  responseDateFormat: string | null = "dd/MM/yyyy";
  responseTimeFormat: string | null = "dd/MM/yyyy HH:mm:ss";
  referenceNo: string | null = null;
  operatorName: string | null = null;
  itemDescription: string | null = null;
  currency: string | null = null;
  grossAmount: string | null = null;
  taxAmount: string | null = null;
  offlineInvoiceException: unknown[] | null = null;
}

export class GlobalInfo {
  appId: string;              // max_length: 5
  version: string;            // max_length: 15
  dataExchangeId: string;     // UUID32
  interfaceCode: string;      // max_length: 5
  requestCode: string;        // max_length: 5
  requestTime: string;        // DT_REQUEST
  responseCode: string;       // max_length: 5
  userName: string;           // max_length: 20
  deviceMAC: string;          // max_length: 25
  deviceNo: string;           // DEVICE_NO
  tin: string;                // TIN
  brn: string | null = null;  // NIN_BRN (optional)
  taxpayerID: string;         // max_length: 20
  longitude: string | null = null;
  latitude: string | null = null;
  agentType: string | null = "0";
  extendField: ExtendField | null = null;
}

export class ReturnStateInfo {
  returnCode: string;                    // max_length: 4
  returnMessage: string | null = null;   // max_length: 500
}

// =========================================================
// T101: GET SERVER TIME
// =========================================================

export class T101Response {
  currentTime: string; // DT_RESPONSE
}

// =========================================================
// T102: CLIENT INITIALIZATION
// =========================================================

export class T102Request {
  otp: string | null = null; // max_length: 6
}

export class T102Response {
  clientPriKey: string; // max_length: 4000
  serverPubKey: string; // max_length: 4000
  keyTable: string;     // max_length: 4000
}

// =========================================================
// T103: SIGN IN / LOGIN
// =========================================================

export class T103Device {
  deviceModel: string;      // CODE_50
  deviceNo: string;         // DEVICE_NO
  deviceStatus: string;     // CODE_3
  deviceType: string;       // CODE_3
  validPeriod: string;      // DATE_RESPONSE
  offlineAmount: string;
  offlineDays: string;
  offlineValue: string;
}

export class T103Taxpayer {
  id: string;                           // CODE_18
  tin: string;                          // TIN
  ninBrn: string;                       // NIN_BRN
  legalName: string;                    // CODE_256
  businessName: string;                 // CODE_256
  taxpayerStatusId: string;             // CODE_3
  taxpayerRegistrationStatusId: string; // CODE_3
  taxpayerType: string;                 // CODE_3
  businessType: string;                 // CODE_3
  departmentId: string;                 // CODE_6
  contactName: string;                  // CODE_100
  contactEmail: string;                 // CODE_50
  contactMobile: string;                // CODE_30
  contactNumber: string;                // CODE_30
  placeOfBusiness: string;              // CODE_500
}

export class T103TaxpayerBranch {
  branchCode: string;    // CODE_10
  branchName: string;    // CODE_500
  branchType: string;    // CODE_3
  contactName: string;   // CODE_100
  contactEmail: string;  // CODE_50
  contactMobile: string; // CODE_30
  contactNumber: string; // CODE_30
  placeOfBusiness: string; // CODE_1000
}

export class T103TaxType {
  taxTypeName: string;           // CODE_200
  taxTypeCode: string;           // CODE_3
  registrationDate: string;      // DATE_RESPONSE
  cancellationDate: string | null = null; // DATE_RESPONSE (optional)
}

export class T103Response {
  device: T103Device;
  taxpayer: T103Taxpayer;
  taxpayerBranch: T103TaxpayerBranch | null = null;
  taxType: T103TaxType[];
  dictionaryVersion: string;
  issueTaxTypeRestrictions: string; // pattern: ^[01]$
  taxpayerBranchVersion: string;    // CODE_20
  commodityCategoryVersion: string; // CODE_10
  exciseDutyVersion: string;        // CODE_10
  sellersLogo: string | null = null; // Base64
  whetherEnableServerStock: string; // pattern: ^[01]$
  goodsStockLimit: string;          // STOCK_LIMIT
  exportCommodityTaxRate: string;
  exportInvoiceExciseDuty: string;  // pattern: ^[01]$
  maxGrossAmount: string;
  isAllowBackDate: string;          // pattern: ^[01]$
  isReferenceNumberMandatory: string; // pattern: ^[01]$
  isAllowIssueRebate: string;       // pattern: ^[01]$
  isDutyFreeTaxpayer: string;       // pattern: ^[01]$
  isAllowIssueCreditWithoutFDN: string; // pattern: ^[01]$
  periodDate: string;
  isTaxCategoryCodeMandatory: string; // pattern: ^[01]$
  isAllowIssueInvoice: string;      // pattern: ^[01]$
  isAllowOutOfScopeVAT: string;     // pattern: ^[01]$
  creditMemoPeriodDate: string;
  commGoodsLatestModifyVersion: string; // CODE_14
  financialYearDate: string;        // CODE_4
  buyerModifiedTimes: string;
  buyerModificationPeriod: string;
  agentFlag: string;                // pattern: ^[01]$
  webServiceURL: string;
  environment: string;              // pattern: ^[01]$
  frequentContactsLimit: string;
  autoCalculateSectionE: string;    // pattern: ^[01]$
  autoCalculateSectionF: string;    // pattern: ^[01]$
  hsCodeVersion: string;
  issueDebitNote: string;           // pattern: ^[01]$
  qrCodeURL: string;
}

// =========================================================
// T104: GET SYMMETRIC KEY
// =========================================================

export class T104Response {
  passowrdDes: string; // Typo in API spec
  sign: string;
}

// =========================================================
// T105: FORGET PASSWORD
// =========================================================

export class T105Request {
  userName: string;         // CODE_200
  changedPassword: string;  // CODE_200
}

// =========================================================
// T106: INVOICE/RECEIPT QUERY
// =========================================================

export class T106Request {
  oriInvoiceNo: string | null = null;
  invoiceNo: string | null = null;
  deviceNo: string | null = null;
  buyerTin: string | null = null;
  buyerNinBrn: string | null = null;
  buyerLegalName: string | null = null;
  combineKeywords: string | null = null;
  invoiceType: string | null = null;
  invoiceKind: string | null = null;
  isInvalid: string | null = null;
  isRefund: string | null = null;
  startDate: string | null = null;
  endDate: string | null = null;
  pageNo: number = 1;
  pageSize: number = 20;
  referenceNo: string | null = null;
  branchName: string | null = null;
  queryType: string | null = "1";
  dataSource: string | null = null;
  sellerTinOrNin: string | null = null;
  sellerLegalOrBusinessName: string | null = null;
}

export class T106Record {
  id: string;
  invoiceNo: string;
  oriInvoiceId: string;
  oriInvoiceNo: string;
  issuedDate: string;
  buyerTin: string | null = null;
  buyerLegalName: string | null = null;
  buyerNinBrn: string | null = null;
  currency: string;
  grossAmount: string;
  taxAmount: string;
  dataSource: string;
  isInvalid: string | null = null;
  isRefund: string | null = null;
  invoiceType: string;
  invoiceKind: string;
  invoiceIndustryCode: string | null = null;
  branchName: string;
  deviceNo: string;
  uploadingTime: string;
  referenceNo: string | null = null;
  operator: string;
  userName: string;
}

export class T106Page {
  pageNo: number;
  pageSize: number;
  totalSize: number;
  pageCount: number;
}

export class T106Response {
  page: T106Page;
  records: T106Record[];
}

// =========================================================
// T107: QUERY NORMAL INVOICE/RECEIPT
// =========================================================

export class T107Request {
  invoiceNo: string | null = null;
  deviceNo: string | null = null;
  buyerTin: string | null = null;
  buyerLegalName: string | null = null;
  invoiceType: string | null = null;
  startDate: string | null = null;
  endDate: string | null = null;
  pageNo: number = 1;
  pageSize: number = 20;
  branchName: string | null = null;
}

export class T107Record {
  id: string;
  invoiceNo: string;
  oriInvoiceId: string;
  oriInvoiceNo: string;
  issuedDate: string;
  buyerTin: string;
  buyerBusinessName: string;
  buyerLegalName: string;
  tin: string;
  businessName: string;
  legalName: string;
  currency: string;
  grossAmount: string;
  dataSource: string;
}

export class T107Response {
  page: T106Page;
  records: T107Record[];
}

// =========================================================
// T108: INVOICE DETAILS
// =========================================================

export class T108Request {
  invoiceNo: string; // CODE_20
}

export class T108SellerDetails {
  tin: string;
  ninBrn: string;
  passportNumber: string | null = null;
  legalName: string;
  businessName: string;
  address: string | null = null;
  mobilePhone: string | null = null;
  linePhone: string | null = null;
  emailAddress: string | null = null;
  placeOfBusiness: string | null = null;
  referenceNo: string | null = null;
  branchId: string;
  branchName: string;
  branchCode: string;
}

export class T108BasicInformation {
  invoiceId: string;
  invoiceNo: string;
  oriInvoiceNo: string | null = null;
  antifakeCode: string | null = null;
  deviceNo: string;
  issuedDate: string;
  oriIssuedDate: string | null = null;
  oriGrossAmount: string | null = null;
  operator: string;
  currency: string;
  oriInvoiceId: string | null = null;
  invoiceType: string;
  invoiceKind: string;
  dataSource: string;
  isInvalid: string | null = null;
  isRefund: string | null = null;
  invoiceIndustryCode: string | null = null;
  currencyRate: string | null = null;
}

export class T108BuyerDetails {
  buyerTin: string | null = null;
  buyerNinBrn: string | null = null;
  buyerPassportNum: string | null = null;
  buyerLegalName: string | null = null;
  buyerBusinessName: string | null = null;
  buyerAddress: string | null = null;
  buyerEmail: string | null = null;
  buyerMobilePhone: string | null = null;
  buyerLinePhone: string | null = null;
  buyerPlaceOfBusi: string | null = null;
  buyerType: string;
  buyerCitizenship: string | null = null;
  buyerSector: string | null = null;
  buyerReferenceNo: string | null = null;
  deliveryTermsCode: string | null = null;
}

export class T108BuyerExtend {
  propertyType: string | null = null;
  district: string | null = null;
  municipalityCounty: string | null = null;
  divisionSubcounty: string | null = null;
  town: string | null = null;
  cellVillage: string | null = null;
  effectiveRegistrationDate: string | null = null;
  meterStatus: string | null = null;
}

export class T108GoodsItem {
  invoiceItemId: string;
  item: string;
  itemCode: string;
  qty: string | number | null = null; // AMOUNT_20_8 (Decimal or string)
  unitOfMeasure: string;
  unitPrice: string | number | null = null;
  total: string | number; // AMOUNT_SIGNED_16_2
  taxRate: string | number; // RATE_12_8
  tax: string | number; // AMOUNT_SIGNED_16_2
  discountTotal: string | number | null = null;
  discountTaxRate: string | number | null = null;
  orderNumber: number;
  discountFlag: string;
  deemedFlag: string;
  exciseFlag: string;
  categoryId: string | null = null;
  categoryName: string | null = null;
  goodsCategoryId: string;
  goodsCategoryName: string;
  exciseRate: string | null = null;
  exciseRule: string | null = null;
  exciseTax: string | number | null = null;
  pack: string | number | null = null;
  stick: string | number | null = null;
  exciseUnit: string | null = null;
  exciseCurrency: string | null = null;
  exciseRateName: string | null = null;
  vatApplicableFlag: string | null = "1";
  deemedExemptCode: string | null = null;
  vatProjectId: string | null = null;
  vatProjectName: string | null = null;
  totalWeight: string | null = null;
  hsCode: string | null = null;
  hsName: string | null = null;
  pieceQty: string | number | null = null;
  pieceMeasureUnit: string | null = null;
  highSeaBondFlag: string | null = null;
  highSeaBondCode: string | null = null;
  highSeaBondNo: string | null = null;
}

export class T108TaxDetail {
  taxCategoryCode: string;
  netAmount: string | number; // AMOUNT_16_4
  taxRate: string | number; // RATE_12_8
  taxAmount: string | number; // AMOUNT_16_4
  grossAmount: string | number; // AMOUNT_16_4
  exciseUnit: string | null = null;
  exciseCurrency: string | null = null;
  taxRateName: string | null = null;
}

export class T108Summary {
  netAmount: string;
  taxAmount: string;
  grossAmount: string;
  itemCount: number;
  modeCode: string;
  remarks: string | null = null;
  qrCode: string | null = null;
}

export class T108PayWay {
  paymentMode: string;
  paymentAmount: string | number; // AMOUNT_16_2
  orderNumber: string;
}

export class T108Extend {
  reason: string | null = null;
  reasonCode: string | null = null;
}

export class T108Custom {
  sadNumber: string | null = null;
  office: string | null = null;
  cif: string | null = null;
  wareHouseNumber: string | null = null;
  wareHouseName: string | null = null;
  destinationCountry: string | null = null;
  originCountry: string | null = null;
  importExportFlag: string | null = null;
  confirmStatus: string | null = null;
  valuationMethod: string | null = null;
  prn: string | null = null;
  exportRegime: string | null = null;
}

export class T108ImportServicesSeller {
  importBusinessName: string | null = null;
  importEmailAddress: string | null = null;
  importContactNumber: string | null = null;
  importAddress: string | null = null;
  importInvoiceDate: string | null = null;
  importAttachmentName: string | null = null;
  importAttachmentContent: string | null = null;
}

export class T108AirlineGoodsDetails {
  item: string;
  itemCode: string | null = null;
  qty: string | number;
  unitOfMeasure: string;
  unitPrice: string | number;
  total: string | number;
  taxRate: string | number | null = null;
  tax: string | number | null = null;
  discountTotal: string | number | null = null;
  discountTaxRate: string | number | null = null;
  orderNumber: number;
  discountFlag: string;
  deemedFlag: string;
  exciseFlag: string;
  categoryId: string | null = null;
  categoryName: string | null = null;
  goodsCategoryId: string | null = null;
  goodsCategoryName: string | null = null;
  exciseRate: string | null = null;
  exciseRule: string | null = null;
  exciseTax: string | number | null = null;
  pack: string | number | null = null;
  stick: string | number | null = null;
  exciseUnit: string | null = null;
  exciseCurrency: string | null = null;
  exciseRateName: string | null = null;
}

export class T108EdcDetails {
  tankNo: string | null = null;
  pumpNo: string | null = null;
  nozzleNo: string | null = null;
  controllerNo: string | null = null;
  acquisitionEquipmentNo: string | null = null;
  levelGaugeNo: string | null = null;
  mvrn: string | null = null;
  updateTimes: string | null = null;
}

export class T108AgentEntity {
  tin: string | null = null;
  legalName: string | null = null;
  businessName: string | null = null;
  address: string | null = null;
}

export class T108CreditNoteExtend {
  preGrossAmount: string | null = null;
  preTaxAmount: string | null = null;
  preNetAmount: string | null = null;
}

export class T108Response {
  sellerDetails: T108SellerDetails;
  basicInformation: T108BasicInformation;
  buyerDetails: T108BuyerDetails;
  buyerExtend: T108BuyerExtend | null = null;
  goodsDetails: T108GoodsItem[];
  taxDetails: T108TaxDetail[];
  summary: T108Summary;
  payWay: T108PayWay[] | null = null;
  extend: T108Extend | null = null;
  custom: T108Custom | null = null;
  importServicesSeller: T108ImportServicesSeller | null = null;
  airlineGoodsDetails: T108AirlineGoodsDetails[] | null = null;
  edcDetails: T108EdcDetails | null = null;
  agentEntity: T108AgentEntity | null = null;
  creditNoteExtend: T108CreditNoteExtend | null = null;
  existInvoiceList: unknown[] | null = null;
}

// =========================================================
// T109: INVOICE UPLOAD (BILLING)
// =========================================================

export class T109SellerDetails {
  tin: string;
  ninBrn: string | null = null;
  legalName: string;
  businessName: string | null = null;
  address: string | null = null;
  mobilePhone: string | null = null;
  linePhone: string | null = null;
  emailAddress: string;
  placeOfBusiness: string | null = null;
  referenceNo: string | null = null;
  branchId: string | null = null;
  isCheckReferenceNo: string | null = "0";
}

export class T109BasicInformation {
  invoiceNo: string | null = null;
  antifakeCode: string | null = null;
  deviceNo: string;
  issuedDate: string; // DT_REQUEST
  operator: string;
  currency: string;
  oriInvoiceId: string | null = null;
  invoiceType: string;
  invoiceKind: string;
  dataSource: string;
  invoiceIndustryCode: string | null = null;
  isBatch: string | null = "0";
}

export class T109BuyerDetails {
  buyerTin: string | null = null;
  buyerNinBrn: string | null = null;
  buyerPassportNum: string | null = null;
  buyerLegalName: string | null = null;
  buyerBusinessName: string | null = null;
  buyerAddress: string | null = null;
  buyerEmail: string | null = null;
  buyerMobilePhone: string | null = null;
  buyerLinePhone: string | null = null;
  buyerPlaceOfBusi: string | null = null;
  buyerType: string;
  buyerCitizenship: string | null = null;
  buyerSector: string | null = null;
  buyerReferenceNo: string | null = null;
  nonResidentFlag: string | null = "0";
  deliveryTermsCode: string | null = null;
}

export class T109GoodsItem {
  item: string;
  itemCode: string;
  qty: string | number | null = null;
  unitOfMeasure: string;
  unitPrice: string | number | null = null;
  total: string | number;
  taxRate: string | number;
  tax: string | number;
  discountTotal: string | number | null = null;
  discountTaxRate: string | number | null = null;
  orderNumber: number;
  discountFlag: string;
  deemedFlag: string;
  exciseFlag: string;
  categoryId: string | null = null;
  categoryName: string | null = null;
  goodsCategoryId: string;
  goodsCategoryName: string;
  exciseRate: string | null = null;
  exciseRule: string | null = null;
  exciseTax: string | number | null = null;
  pack: string | number | null = null;
  stick: string | number | null = null;
  exciseUnit: string | null = null;
  exciseCurrency: string | null = null;
  exciseRateName: string | null = null;
  vatApplicableFlag: string | null = "1";
  deemedExemptCode: string | null = null;
  vatProjectId: string | null = null;
  vatProjectName: string | null = null;
  hsCode: string | null = null;
  hsName: string | null = null;
  totalWeight: string | null = null;
  pieceQty: string | number | null = null;
  pieceMeasureUnit: string | null = null;
  highSeaBondFlag: string | null = null;
  highSeaBondCode: string | null = null;
  highSeaBondNo: string | null = null;
}

export class T109TaxDetail {
  taxCategoryCode: string;
  netAmount: string | number;
  taxRate: string | number;
  taxAmount: string | number;
  grossAmount: string | number;
  exciseUnit: string | null = null;
  exciseCurrency: string | null = null;
  taxRateName: string | null = null;
}

export class T109Summary {
  netAmount: string;
  taxAmount: string;
  grossAmount: string;
  itemCount: number;
  modeCode: string;
  remarks: string | null = null;
  qrCode: string | null = null;
}

export class T109PayWay {
  paymentMode: string;
  paymentAmount: string | number;
  orderNumber: string;
}

export class T109Extend {
  reason: string | null = null;
  reasonCode: string | null = null;
}

export class T109BillingUpload {
  sellerDetails: T109SellerDetails;
  basicInformation: T109BasicInformation;
  buyerDetails: T109BuyerDetails | null = null;
  buyerExtend: T108BuyerExtend | null = null;
  goodsDetails: T109GoodsItem[];
  taxDetails: T109TaxDetail[];
  summary: T109Summary;
  payWay: T109PayWay[] | null = null;
  extend: T109Extend | null = null;
  importServicesSeller: T108ImportServicesSeller | null = null;
  airlineGoodsDetails: T108AirlineGoodsDetails[] | null = null;
  edcDetails: T108EdcDetails | null = null;
}

export class T109Response {
  sellerDetails: T108SellerDetails;
  basicInformation: T108BasicInformation;
  buyerDetails: T108BuyerDetails;
  goodsDetails: T108GoodsItem[];
  taxDetails: T108TaxDetail[];
  summary: T108Summary;
  payWay: T108PayWay[] | null = null;
  extend: T108Extend | null = null;
  importServicesSeller: T108ImportServicesSeller | null = null;
  airlineGoodsDetails: T108AirlineGoodsDetails[] | null = null;
  edcDetails: T108EdcDetails | null = null;
  existInvoiceList: unknown[] | null = null;
  agentEntity: T108AgentEntity | null = null;
}

// =========================================================
// T110: CREDIT NOTE APPLICATION
// =========================================================

export class T110GoodsItem {
  item: string;
  itemCode: string;
  qty: string | number; // AMOUNT_SIGNED_20_8 (negative)
  unitOfMeasure: string;
  unitPrice: string | number;
  total: string | number; // AMOUNT_SIGNED_16_2 (negative)
  taxRate: string | number;
  tax: string | number; // AMOUNT_SIGNED_16_2 (negative)
  orderNumber: number;
  deemedFlag: string;
  exciseFlag: string;
  categoryId: string | null = null;
  categoryName: string | null = null;
  goodsCategoryId: string;
  goodsCategoryName: string;
  exciseRate: string | null = null;
  exciseRule: string | null = null;
  exciseTax: string | number | null = null;
  pack: string | number | null = null;
  stick: string | number | null = null;
  exciseUnit: string | null = null;
  exciseCurrency: string | null = null;
  exciseRateName: string | null = null;
  vatApplicableFlag: string | null = "1";
}

export class T110TaxDetail {
  taxCategoryCode: string;
  netAmount: string | number; // AMOUNT_SIGNED_16_4 (negative)
  taxRate: string | number;
  taxAmount: string | number; // AMOUNT_SIGNED_16_4 (negative)
  grossAmount: string | number; // AMOUNT_SIGNED_16_4 (negative)
  exciseUnit: string | null = null;
  exciseCurrency: string | null = null;
  taxRateName: string | null = null;
}

export class T110Summary {
  netAmount: string | number; // AMOUNT_SIGNED_16_2
  taxAmount: string | number; // AMOUNT_SIGNED_16_2
  grossAmount: string | number; // AMOUNT_SIGNED_16_2
  itemCount: number;
  modeCode: string;
  qrCode: string | null = null;
}

export class T110Attachment {
  fileName: string;
  fileType: string;
  fileContent: string; // Base64
}

export class T110CreditApplication {
  oriInvoiceId: string;
  oriInvoiceNo: string;
  reasonCode: string;
  reason: string | null = null;
  applicationTime: string;
  invoiceApplyCategoryCode: string;
  currency: string;
  contactName: string | null = null;
  contactMobileNum: string | null = null;
  contactEmail: string | null = null;
  source: string;
  remarks: string | null = null;
  sellersReferenceNo: string | null = null;
  goodsDetails: T110GoodsItem[];
  taxDetails: T110TaxDetail[];
  summary: T110Summary;
  payWay: T109PayWay[] | null = null;
  buyerDetails: T109BuyerDetails | null = null;
  importServicesSeller: T108ImportServicesSeller | null = null;
  basicInformation: T109BasicInformation | null = null;
  attachmentList: T110Attachment[] | null = null;
}

export class T110Response {
  referenceNo: string;
}