import { Logger } from 'tslog';
import { APIResponse, Client } from '../src/client';
import { KeyClient } from '../src/key_client';
import { TimeUtils } from '../src/utils';

export interface TestResults {
  passed: string[];
  failed: string[];
  skipped: string[];
}

export interface TestContext {
  invoice_no: string | null;
  invoice_id: string | null;
  reference_no: string | null;
  application_id: string | null;
  goods_id: string | null;
  goods_code: string | null;
  task_id: string | null;
  business_key: string | null;
  branch_id: string | null;
  commodity_category_id: string | null;
  excise_duty_code: string | null;
  tin: string | null;
}

export interface TestConfig {
  env: string;
  tin: string;
  device_no: string;
  pfx_path: string;
  pfx_password: string;
  brn?: string;
  taxpayer_id?: string;
  http?: {
    timeout?: number;
  };
}

export class EfrisEndpointTester {
  protected client: Client;
  protected keyClient: KeyClient;
  protected config: TestConfig;
  protected results: TestResults;
  protected context: TestContext;
  protected logger: Logger<any>;

  constructor(
    client: Client,
    keyClient: KeyClient,
    config: TestConfig,
    logger?: Logger<any>
  ) {
    this.client = client;
    this.keyClient = keyClient;
    this.config = config;
    this.logger = logger ?? new Logger();
    this.results = {
      passed: [],
      failed: [],
      skipped: []
    };
    this.context = {
      invoice_no: null,
      invoice_id: null,
      reference_no: null,
      application_id: null,
      goods_id: null,
      goods_code: null,
      task_id: null,
      business_key: null,
      branch_id: null,
      commodity_category_id: null,
      excise_duty_code: null,
      tin: null
    };
  }

  // =========================================================================
  // UTILITY METHODS
  // =========================================================================

  protected printSection(title: string): void {
    console.log('\n' + '='.repeat(80));
    console.log(`  ${title}`);
    console.log('='.repeat(80));
  }

  protected printEndpoint(code: string, name: string): void {
    console.log(`\n[${code}] ${name}`);
    console.log('-'.repeat(60));
  }

  protected printResponse(response: APIResponse, maxLength: number = 500): void {
    const safeResponse = this.sanitizeForOutput(response, 3, 1000);
    
    try {
      const responseStr = JSON.stringify(
        safeResponse,
        null,
        2
      );
      
      if (responseStr.length > maxLength) {
        console.log(responseStr.substring(0, maxLength) + '... [truncated]\n');
      } else {
        console.log(responseStr + '\n');
      }
    } catch (error) {
      console.log(`[Response encoding failed: ${(error as Error).message}]`);
      console.log(`Raw response type: ${typeof response}\n`);
    }
  }

  private sanitizeForOutput(
    data: any,
    maxDepth: number = 3,
    maxStringLen: number = 200
  ): any {
    if (maxDepth < 0) {
      return '[max depth exceeded]';
    }

    // Handle primitives
    if (typeof data === 'string') {
      if (data.length > maxStringLen) {
        return data.substring(0, maxStringLen) + '... [truncated]';
      }
      // Check for binary/non-UTF8 data
      try {
        new TextEncoder().encode(data);
        return data;
      } catch {
        return `[binary data: ${data.length} bytes]`;
      }
    }
    
    if (typeof data === 'number' || typeof data === 'boolean' || data === null || typeof data === 'undefined') {
      return data;
    }

    // Handle Buffer/Binary data
    if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
      return `[binary data: ${data.length} bytes]`;
    }

    // Handle Error objects
    if (data instanceof Error) {
      return {
        exception: data.constructor.name,
        message: this.sanitizeForOutput(data.message, maxDepth - 1, maxStringLen),
        stack: data.stack
      };
    }

    // Handle objects
    if (typeof data === 'object') {
      const result: Record<string, any> = {};
      let count = 0;
      
      for (const [key, value] of Object.entries(data)) {
        if (count++ >= (Array.isArray(data) ? 20 : 5)) {
          result['[more items]'] = true;
          break;
        }
        result[key] = this.sanitizeForOutput(value, maxDepth - 1, maxStringLen);
      }
      return result;
    }

    // Fallback
    return `[unserializable: ${typeof data}]`;
  }

  protected handleError(endpoint: string, error: Error): void {
    console.log(`❌ ERROR: ${error.constructor.name}`);
    console.log(`   Message: ${error.message}`);
    
    if (error instanceof Error && 'statusCode' in error) {
      console.log(`   Status Code: ${(error as any).statusCode}`);
    }
    if (error instanceof Error && 'returnCode' in error) {
      console.log(`   Return Code: ${(error as any).returnCode}`);
    }
    
    this.logger.error(`Endpoint ${endpoint} failed:`, error);
  }

  protected generateUuid(): string {
    return crypto.randomUUID().replace(/-/g, '').substring(0, 32).toUpperCase();
  }

  protected getTimestamp(): string {
    return TimeUtils.getUgandaTimestamp();
  }

  protected getDateTimestamp(): string {
    return TimeUtils.getUgandaTimestamp().split(' ')[0];
  }

  protected async testEndpoint(
    code: string,
    name: string,
    testFunc: () => Promise<APIResponse | null>,
    skip: boolean = false
  ): Promise<boolean> {
    this.printEndpoint(code, name);
    
    if (skip) {
      console.log('⚠️  SKIPPED\n');
      this.results.skipped.push(code);
      return true;
    }

    try {
      const result = await testFunc();
      this.results.passed.push(code);
      console.log('✅ PASSED\n');
      
      if (result && Object.keys(result).length > 0) {
        this.printResponse(result);
      }
      return true;
    } catch (error) {
      this.results.failed.push(code);
      this.handleError(code, error as Error);
      return false;
    }
  }

  // =========================================================================
  // AUTHENTICATION & INITIALIZATION TESTS
  // =========================================================================

  public async testT101GetServerTime(): Promise<APIResponse> {
    return await this.client.getServerTime();
  }

  public async testT102ClientInit(): Promise<APIResponse> {
    return await this.client.clientInit();
  }

  public async testT103SignIn(): Promise<APIResponse> {
    const response = await this.client.signIn();
    const content = response?.data?.content ?? {};
    const taxpayer = content?.taxpayer ?? {};
    
    if (taxpayer?.id) {
      this.keyClient.setTaxpayerId(String(taxpayer.id));
      this.context.tin = taxpayer?.tin ?? null;
    }
    return response;
  }

  public async testT104GetSymmetricKey(): Promise<APIResponse> {
    return await this.client.getSymmetricKey();
  }

  public async testT105ForgetPassword(): Promise<APIResponse> {
    const testUser = `test_${Date.now()}`;
    return await this.client.forgetPassword(testUser, 'TempPass123!');
  }

  // =========================================================================
  // INVOICE OPERATIONS TESTS
  // =========================================================================

  public async testT106QueryAllInvoices(): Promise<APIResponse> {
    const filters = {
      startDate: this.getDateTimestamp(),
      endDate: this.getDateTimestamp(),
      pageNo: 1,
      pageSize: 10,
      invoiceType: '1',
      invoiceKind: '1'
    };
    return await this.client.queryAllInvoices(filters);
  }

  public async testT107QueryNormalInvoices(): Promise<APIResponse> {
    const filters = {
      startDate: this.getDateTimestamp(),
      endDate: this.getDateTimestamp(),
      pageNo: 1,
      pageSize: 10,
      invoiceType: '1'
    };
    return await this.client.queryInvoices(filters);
  }

  public async testT108InvoiceDetails(): Promise<APIResponse> {
    const invoiceNo = this.context.invoice_no ?? `TEST${Date.now()}`;
    return await this.client.verifyInvoice(invoiceNo);
  }

  public async testT130UploadGoods(): Promise<APIResponse> {
    const goodsCode = `TEST_GOODS_${Date.now()}`;
    const goodsData = [{
      operationType: '101',
      goodsName: 'Test Product',
      goodsCode: goodsCode,
      measureUnit: '101',
      unitPrice: '1000.00',
      currency: '101',
      commodityCategoryId: '10111301',
      haveExciseTax: '102',
      description: 'Test product for integration',
      stockPrewarning: 10,
      havePieceUnit: '102',
      haveOtherUnit: '102',
      goodsTypeCode: '101',
      haveCustomsUnit: '102'
    }];
    
    this.context.goods_code = goodsCode;
    // Note: You may need to add uploadGoods method to your Client class
    return await this.client.send('upload_goods', goodsData, true, true);
  }

  public async testT109UploadInvoice(): Promise<APIResponse> {
    const invoiceData = {
      sellerDetails: {
        tin: this.config.tin ?? '',
        ninBrn: this.config.brn ?? '',
        legalName: 'Test Seller',
        businessName: 'Test Business',
        address: 'Test Address',
        mobilePhone: '0772140000',
        linePhone: '0414123456',
        emailAddress: 'test@example.com',
        placeOfBusiness: 'Kampala',
        referenceNo: `REF_${Date.now()}`,
        isCheckReferenceNo: '0'
      },
      basicInformation: {
        deviceNo: this.config.device_no ?? '',
        issuedDate: this.getTimestamp(),
        operator: 'test_operator',
        currency: 'UGX',
        invoiceType: '1',
        invoiceKind: '1',
        dataSource: '103',
        invoiceIndustryCode: '101'
      },
      buyerDetails: {
        buyerTin: '1000029771',
        buyerNinBrn: 'TEST001',
        buyerLegalName: 'Test Buyer',
        buyerBusinessName: 'Test Buyer Co',
        buyerAddress: 'Buyer Address',
        buyerEmail: 'buyer@example.com',
        buyerMobilePhone: '0772999999',
        buyerLinePhone: '0414999999',
        buyerPlaceOfBusi: 'Buyer Place',
        buyerType: '0',
        buyerCitizenship: 'UG-Uganda',
        buyerSector: 'Private',
        buyerReferenceNo: 'BUYER_REF_001'
      },
      goodsDetails: [{
        item: 'Test Item',
        itemCode: 'TEST001',
        qty: '1',
        unitOfMeasure: '101',
        unitPrice: '1000.00',
        total: '1000.00',
        taxRate: '0.18',
        tax: '180.00',
        orderNumber: 0,
        discountFlag: '2',
        deemedFlag: '2',
        exciseFlag: '2',
        goodsCategoryId: '100000000',
        goodsCategoryName: 'Standard',
        vatApplicableFlag: '1'
      }],
      taxDetails: [{
        taxCategoryCode: '01',
        netAmount: '1000.00',
        taxRate: '0.18',
        taxAmount: '180.00',
        grossAmount: '1180.00',
        taxRateName: 'Standard'
      }],
      summary: {
        netAmount: '1000.00',
        taxAmount: '180.00',
        grossAmount: '1180.00',
        itemCount: 1,
        modeCode: '1',
        remarks: 'Test invoice from integration test',
        qrCode: ''
      },
      payWay: [{
        paymentMode: '102',
        paymentAmount: '1180.00',
        orderNumber: 'a'
      }]
    };

    const response = await this.client.fiscaliseInvoice(invoiceData);
    const content = response?.data?.content ?? response;
    
    if (content?.basicInformation?.invoiceNo) {
      this.context.invoice_no = content.basicInformation.invoiceNo;
      this.context.invoice_id = content.basicInformation.invoiceId ?? null;
    }
    return response;
  }

  public async testT129BatchUpload(): Promise<APIResponse> {
    return await this.client.fiscaliseBatchInvoices([]);
  }

  // =========================================================================
  // CREDIT/DEBIT NOTE OPERATIONS TESTS
  // =========================================================================

  public async testT110CreditNoteApplication(): Promise<APIResponse | null> {
    if (!this.context.invoice_no) {
      console.log('⚠️  No invoice available for credit note test\n');
      return null;
    }

    const applicationData = {
      oriInvoiceId: this.context.invoice_id ?? '',
      oriInvoiceNo: this.context.invoice_no,
      reasonCode: '102',
      reason: 'Test credit note application',
      applicationTime: this.getTimestamp(),
      invoiceApplyCategoryCode: '101',
      currency: 'UGX',
      contactName: 'Test Contact',
      contactMobileNum: '0772140000',
      contactEmail: 'contact@example.com',
      source: '103',
      remarks: 'Integration test credit note',
      sellersReferenceNo: `CRED_REF_${Date.now()}`,
      goodsDetails: [{
        item: 'Test Item',
        itemCode: 'TEST001',
        qty: '-1',
        unitOfMeasure: '101',
        unitPrice: '1000.00',
        total: '-1000.00',
        taxRate: '0.18',
        tax: '-180.00',
        orderNumber: 0,
        deemedFlag: '2',
        exciseFlag: '2',
        goodsCategoryId: '100000000',
        vatApplicableFlag: '1'
      }],
      taxDetails: [{
        taxCategoryCode: '01',
        netAmount: '-1000.00',
        taxRate: '0.18',
        taxAmount: '-180.00',
        grossAmount: '-1180.00',
        taxRateName: 'Standard'
      }],
      summary: {
        netAmount: '-1000.00',
        taxAmount: '-180.00',
        grossAmount: '-1180.00',
        itemCount: 1,
        modeCode: '1',
        qrCode: ''
      },
      basicInformation: {
        operator: 'test_operator',
        invoiceKind: '1',
        invoiceIndustryCode: '101'
      }
    };

    const response = await this.client.applyCreditNote(applicationData);
    const content = response?.data?.content ?? response;
    
    if (content?.referenceNo) {
      this.context.reference_no = content.referenceNo;
    }
    return response;
  }

  public async testT111QueryCreditNoteStatus(): Promise<APIResponse> {
    const filters: Record<string, any> = {
      startDate: this.getDateTimestamp(),
      endDate: this.getDateTimestamp(),
      pageNo: 1,
      pageSize: 10,
      invoiceApplyCategoryCode: '101',
      queryType: '1'
    };
    
    if (this.context.reference_no) {
      filters.referenceNo = this.context.reference_no;
    }
    return await this.client.queryCreditNoteStatus(filters);
  }

  public async testT112CreditApplicationDetail(): Promise<APIResponse | null> {
    if (this.context.application_id) {
      return await this.client.getCreditApplicationDetail(this.context.application_id);
    }
    return null;
  }

  public async testT113ApproveCreditNote(): Promise<APIResponse | null> {
    if (this.context.reference_no && this.context.task_id) {
      return await this.client.approveCreditNote(
        this.context.reference_no,
        true,
        this.context.task_id,
        'Approved via integration test'
      );
    }
    console.log('⚠️  Missing reference_no or task_id for approval test\n');
    return null;
  }

  public async testT114CancelCreditNoteApplication(): Promise<APIResponse | null> {
    if (this.context.invoice_no) {
      return await this.client.cancelCreditNoteApplication(
        this.context.invoice_id ?? '',
        this.context.invoice_no,
        '103',
        'Test cancellation',
        '104'
      );
    }
    return null;
  }

  public async testT118QueryCreditApplicationDetails(): Promise<APIResponse | null> {
    if (this.context.application_id) {
      return await this.client.getCreditApplicationDetail(this.context.application_id);
    }
    return null;
  }

  public async testT120VoidApplication(): Promise<APIResponse | null> {
    if (this.context.business_key && this.context.reference_no) {
      return await this.client.voidCreditDebitApplication(
        this.context.business_key,
        this.context.reference_no
      );
    }
    return null;
  }

  public async testT122QueryInvalidCredit(): Promise<APIResponse | null> {
    if (this.context.invoice_no) {
      return await this.client.queryInvalidCreditNote(this.context.invoice_no);
    }
    return null;
  }

  // =========================================================================
  // TAXPAYER & BRANCH OPERATIONS TESTS
  // =========================================================================

  public async testT119QueryTaxpayer(): Promise<APIResponse> {
    return await this.client.queryTaxpayerByTin(this.config.tin ?? '1000029771');
  }

  public async testT137CheckTaxpayerType(): Promise<APIResponse> {
    return await this.client.checkTaxpayerType(
      this.config.tin ?? '',
      '100000000'
    );
  }

  public async testT138GetBranches(): Promise<APIResponse> {
    const response = await this.client.getRegisteredBranches();
    const content = response?.data?.content ?? response;
    
    if (Array.isArray(content) && content.length > 0) {
      this.context.branch_id = content[0]?.branchId ?? null;
    }
    return response;
  }

  // =========================================================================
  // COMMODITY & EXCISE OPERATIONS TESTS
  // =========================================================================

  public async testT115SystemDictionary(): Promise<APIResponse> {
    const response = await this.client.updateSystemDictionary();
    const content = response?.data?.content ?? response;
    
    if (content?.sector && Array.isArray(content.sector)) {
      for (const cat of content.sector) {
        if ((cat as any).parentClass === '0') {
          this.context.commodity_category_id = (cat as any).code ?? null;
          break;
        }
      }
    }
    return response;
  }

  public async testT123QueryCommodityCategories(): Promise<APIResponse> {
    // Add this method to your Client class if not present
    return await this.client.send('query_commodity_categories', {}, true, true);
  }

  public async testT124QueryCommodityCategoriesPage(): Promise<APIResponse> {
    // Add this method to your Client class if not present
    return await this.client.send('query_commodity_categories_page', { pageNo: 1, pageSize: 10 }, true, true);
  }

  public async testT125QueryExciseDuty(): Promise<APIResponse> {
    // Add this method to your Client class if not present
    const response = await this.client.send('query_excise_duty', {}, true, true);
    const content = response?.data?.content ?? response;
    
    if (content?.exciseDutyList && Array.isArray(content.exciseDutyList) && content.exciseDutyList.length > 0) {
      this.context.excise_duty_code = content.exciseDutyList[0]?.exciseDutyCode ?? null;
    }
    return response;
  }

  public async testT134CommodityIncremental(): Promise<APIResponse> {
    // Add this method to your Client class if not present
    return await this.client.send('sync_commodity_categories', { version: '1.0' }, true, true);
  }

  public async testT146QueryCommodityByDate(): Promise<APIResponse> {
    // Add this method to your Client class if not present
    return await this.client.send('query_commodity_by_date', {
      categoryId: '13101501',
      queryType: '1',
      timestamp: this.getTimestamp()
    }, true, true);
  }

  public async testT185QueryHsCodes(): Promise<APIResponse> {
    // Add this method to your Client class if not present
    return await this.client.send('query_hs_codes', {}, true, true);
  }

  // =========================================================================
  // EXCHANGE RATE OPERATIONS TESTS
  // =========================================================================

  public async testT121GetExchangeRate(): Promise<APIResponse> {
    // Add this method to your Client class if not present
    return await this.client.send('get_exchange_rate', {
      currency: 'USD',
      date: this.getDateTimestamp()
    }, true, true);
  }

  public async testT126GetAllExchangeRates(): Promise<APIResponse> {
    // Add this method to your Client class if not present
    return await this.client.send('get_all_exchange_rates', {
      date: this.getDateTimestamp()
    }, true, true);
  }

  // =========================================================================
  // GOODS & STOCK OPERATIONS TESTS
  // =========================================================================

  public async testT127InquireGoods(): Promise<APIResponse> {
    const filters: Record<string, any> = { pageNo: 1, pageSize: 10 };
    
    if (this.context.goods_code) {
      filters.goodsCode = this.context.goods_code;
    }
    
    // Add this method to your Client class if not present
    const response = await this.client.send('inquire_goods', filters, true, true);
    const content = response?.data?.content ?? response;
    
    if (content?.records && Array.isArray(content.records) && content.records.length > 0) {
      this.context.goods_id = content.records[0]?.id ?? null;
    }
    return response;
  }

  public async testT144QueryGoodsByCode(): Promise<APIResponse | null> {
    if (this.context.goods_code) {
      // Add this method to your Client class if not present
      return await this.client.send('query_goods_by_code', {
        goodsCode: this.context.goods_code,
        tin: this.config.tin ?? null
      }, true, true);
    }
    return null;
  }

  public async testT128QueryStock(): Promise<APIResponse | null> {
    if (this.context.goods_id) {
      // Add this method to your Client class if not present
      return await this.client.send('query_stock_quantity', {
        goodsId: this.context.goods_id,
        branchId: this.context.branch_id ?? null
      }, true, true);
    }
    return null;
  }

  public async testT131MaintainStock(): Promise<APIResponse | null> {
    if (!this.context.goods_id && !this.context.goods_code) {
      console.log('⚠️  No goods available for stock maintain test\n');
      return null;
    }

    const stockData = {
      goodsStockIn: {
        operationType: '101',
        supplierTin: this.config.tin ?? '',
        supplierName: 'Test Supplier',
        remarks: 'Integration test stock in',
        stockInDate: this.getDateTimestamp(),
        stockInType: '102',
        isCheckBatchNo: '0',
        rollBackIfError: '0',
        goodsTypeCode: '101'
      },
      goodsStockInItem: [{
        commodityGoodsId: this.context.goods_id ?? '',
        goodsCode: this.context.goods_code ?? '',
        measureUnit: '101',
        quantity: '10',
        unitPrice: '100.00',
        remarks: 'Test stock entry'
      }]
    };
    
    // Add this method to your Client class if not present
    return await this.client.send('maintain_stock', stockData, true, true);
  }

  public async testT139TransferStock(): Promise<APIResponse | null> {
    if (!this.context.branch_id) {
      console.log('⚠️  No branch available for stock transfer test\n');
      return null;
    }

    const transferData = {
      goodsStockTransfer: {
        sourceBranchId: this.context.branch_id,
        destinationBranchId: this.context.branch_id,
        transferTypeCode: '101',
        remarks: 'Test transfer',
        rollBackIfError: '0',
        goodsTypeCode: '101'
      },
      goodsStockTransferItem: [{
        commodityGoodsId: this.context.goods_id ?? '',
        goodsCode: this.context.goods_code ?? '',
        measureUnit: '101',
        quantity: '5',
        remarks: 'Test transfer item'
      }]
    };
    
    // Add this method to your Client class if not present
    return await this.client.send('transfer_stock', transferData, true, true);
  }

  public async testT145StockRecordsQuery(): Promise<APIResponse> {
    const filters = {
      pageNo: 1,
      pageSize: 10,
      startDate: this.getDateTimestamp(),
      endDate: this.getDateTimestamp()
    };
    // Add this method to your Client class if not present
    return await this.client.send('query_stock_records', filters, true, true);
  }

  public async testT147StockRecordsQueryAlt(): Promise<APIResponse> {
    const filters = {
      pageNo: 1,
      pageSize: 10,
      startDate: this.getDateTimestamp(),
      endDate: this.getDateTimestamp(),
      stockInType: '101'
    };
    // Add this method to your Client class if not present
    return await this.client.send('query_stock_records_alt', filters, true, true);
  }

  public async testT148StockRecordsDetail(): Promise<APIResponse | null> {
    return null; // Requires specific record ID
  }

  public async testT149StockAdjustRecords(): Promise<APIResponse> {
    const filters = {
      pageNo: 1,
      pageSize: 10,
      startDate: this.getDateTimestamp(),
      endDate: this.getDateTimestamp()
    };
    // Add this method to your Client class if not present
    return await this.client.send('query_stock_adjust_records', filters, true, true);
  }

  public async testT160StockAdjustDetail(): Promise<APIResponse | null> {
    return null; // Requires specific record ID
  }

  public async testT183StockTransferRecords(): Promise<APIResponse> {
    const filters = {
      pageNo: 1,
      pageSize: 10,
      startDate: this.getDateTimestamp(),
      endDate: this.getDateTimestamp()
    };
    // Add this method to your Client class if not present
    return await this.client.send('query_stock_transfer_records', filters, true, true);
  }

  public async testT184StockTransferDetail(): Promise<APIResponse | null> {
    return null; // Requires specific record ID
  }

  public async testT177NegativeStockConfig(): Promise<APIResponse> {
    // Add this method to your Client class if not present
    return await this.client.send('query_negative_stock_config', {}, true, true);
  }

  // =========================================================================
  // EDC / FUEL SPECIFIC OPERATIONS TESTS
  // =========================================================================

  public async testT162QueryFuelType(): Promise<APIResponse> {
    // Add this method to your Client class if not present
    return await this.client.send('query_fuel_type', {}, true, true);
  }

  public async testT163UploadShiftInfo(): Promise<APIResponse> {
    const shiftData = {
      shiftNo: `SHIFT_${Date.now()}`,
      startVolume: '1000.00',
      endVolume: '1000.00',
      fuelType: 'Petrol',
      goodsId: '12345',
      goodsCode: 'PETROL_001',
      invoiceAmount: '5000.00',
      invoiceNumber: '10',
      nozzleNo: 'NOZZLE_001',
      pumpNo: 'PUMP_001',
      tankNo: 'TANK_001',
      userName: 'test_user',
      userCode: 'TEST001',
      startTime: this.getTimestamp(),
      endTime: this.getTimestamp()
    };
    // Add this method to your Client class if not present
    return await this.client.send('upload_shift_info', shiftData, true, true);
  }

  public async testT164UploadEdcDisconnect(): Promise<APIResponse> {
    const logs = [{
      deviceNumber: this.config.device_no ?? 'TEST_DEVICE',
      disconnectedType: '101',
      disconnectedTime: this.getTimestamp(),
      remarks: 'Test disconnect log'
    }];
    // Add this method to your Client class if not present
    return await this.client.send('upload_edc_disconnect', logs, true, true);
  }

  public async testT166UpdateBuyerDetails(): Promise<APIResponse | null> {
    if (this.context.invoice_no) {
      const updateData = {
        invoiceNo: this.context.invoice_no,
        buyerTin: '1000029771',
        buyerLegalName: 'Updated Buyer Name',
        buyerBusinessName: 'Updated Business',
        buyerAddress: 'Updated Address',
        buyerEmailAddress: 'updated@example.com',
        buyerMobilePhone: '0772999999',
        buyerType: '0',
        createDateStr: this.getTimestamp()
      };
      // Add this method to your Client class if not present
      return await this.client.send('update_buyer_details', updateData, true, true);
    }
    return null;
  }

  public async testT167EdcInvoiceQuery(): Promise<APIResponse> {
    const filters = {
      fuelType: 'Petrol',
      startDate: this.getDateTimestamp(),
      endDate: this.getDateTimestamp(),
      pageNo: 1,
      pageSize: 10,
      queryType: '1',
      branchId: this.context.branch_id ?? ''
    };
    // Add this method to your Client class if not present
    return await this.client.send('edc_invoice_query', filters, true, true);
  }

  public async testT168QueryFuelPumpVersion(): Promise<APIResponse> {
    // Add this method to your Client class if not present
    return await this.client.send('query_fuel_pump_version', {}, true, true);
  }

  public async testT169QueryPumpNozzleTank(): Promise<APIResponse | null> {
    return null; // Requires specific parameters
  }

  public async testT170QueryEdcLocation(): Promise<APIResponse> {
    // Add this method to your Client class if not present
    return await this.client.send('query_edc_location', {
      deviceNo: this.config.device_no ?? '',
      startDate: this.getDateTimestamp(),
      endDate: this.getDateTimestamp()
    }, true, true);
  }

  public async testT171QueryEdcUomRate(): Promise<APIResponse> {
    // Add this method to your Client class if not present
    return await this.client.send('query_edc_uom_rate', {}, true, true);
  }

  public async testT172UploadNozzleStatus(): Promise<APIResponse> {
    // Add this method to your Client class if not present
    return await this.client.send('upload_nozzle_status', {
      nozzleId: 'TEST_NOZZLE_ID',
      nozzleCode: 'NOZZLE_TEST_001',
      status: '1'
    }, true, true);
  }

  public async testT173QueryEdcDeviceVersion(): Promise<APIResponse> {
    // Add this method to your Client class if not present
    return await this.client.send('query_edc_device_version', {}, true, true);
  }

  public async testT176UploadDeviceStatus(): Promise<APIResponse> {
    // Add this method to your Client class if not present
    return await this.client.send('upload_device_status', {
      deviceNo: this.config.device_no ?? '',
      status: '101'
    }, true, true);
  }

  // =========================================================================
  // AGENT / USSD / FREQUENT CONTACTS TESTS
  // =========================================================================

  public async testT175UssdAccountCreate(): Promise<APIResponse> {
    // Add this method to your Client class if not present
    return await this.client.send('ussd_account_create', {
      tin: this.config.tin ?? '',
      mobilePhone: '0772140000'
    }, true, true);
  }

  public async testT178EfdTransfer(): Promise<APIResponse | null> {
    if (this.context.branch_id) {
      // Add this method to your Client class if not present
      return await this.client.send('efd_transfer', {
        branchId: this.context.branch_id,
        remarks: 'Test EFD transfer'
      }, true, true);
    }
    return null;
  }

  public async testT179QueryAgentRelation(): Promise<APIResponse> {
    // Add this method to your Client class if not present
    return await this.client.send('query_agent_relation', { tin: '1010039929' }, true, true);
  }

  public async testT180QueryPrincipalAgent(): Promise<APIResponse> {
    return await this.client.queryPrincipalAgent(
      '1010039929',
      '210059212594887180'
    );
  }

  public async testT181UploadFrequentContacts(): Promise<APIResponse> {
    const contactData = {
      operationType: '101',
      buyerType: '0',
      buyerTin: '1000029771',
      buyerNinBrn: 'TEST_BRN',
      buyerLegalName: 'Frequent Buyer',
      buyerBusinessName: 'Frequent Buyer Co',
      buyerEmail: 'frequent@example.com',
      buyerLinePhone: '0414123456',
      buyerAddress: 'Buyer Address',
      buyerCitizenship: 'UG-Uganda'
    };
    // Add this method to your Client class if not present
    return await this.client.send('upload_frequent_contacts', contactData, true, true);
  }

  public async testT182GetFrequentContacts(): Promise<APIResponse> {
    // Add this method to your Client class if not present
    return await this.client.send('get_frequent_contacts', {
      tin: '1000029771',
      buyerName: 'Frequent Buyer'
    }, true, true);
  }

  // =========================================================================
  // EXPORT / CUSTOMS OPERATIONS TESTS
  // =========================================================================

  public async testT187QueryFdnStatus(): Promise<APIResponse | null> {
    if (this.context.invoice_no) {
      // Add this method to your Client class if not present
      return await this.client.send('query_fdn_status', { invoiceNo: this.context.invoice_no }, true, true);
    }
    return null;
  }

  // =========================================================================
  // REPORTING & LOGGING TESTS
  // =========================================================================

  public async testT116ZReportUpload(): Promise<APIResponse> {
    const reportData = {
      deviceNo: this.config.device_no ?? '',
      reportDate: this.getDateTimestamp(),
      totalSales: '0.00',
      totalTax: '0.00'
    };
    // Add this method to your Client class if not present
    return await this.client.send('upload_z_report', reportData, true, true);
  }

  public async testT117InvoiceChecks(): Promise<APIResponse> {
    const checks = [];
    if (this.context.invoice_no) {
      checks.push({
        invoiceNo: this.context.invoice_no,
        invoiceType: '1'
      });
    }
    return await this.client.verifyInvoicesBatch(checks);
  }

  public async testT132UploadExceptionLogs(): Promise<APIResponse> {
    const logs = [{
      interruptionTypeCode: '101',
      description: 'Test exception log',
      errorDetail: 'Integration test error detail',
      interruptionTime: this.getTimestamp()
    }];
    // Add this method to your Client class if not present
    return await this.client.send('upload_exception_logs', logs, true, true);
  }

  public async testT133TcsUpgradeDownload(): Promise<APIResponse> {
    // Add this method to your Client class if not present
    return await this.client.send('tcs_upgrade_download', { type: '1', version: '1' }, true, true);
  }

  public async testT135GetTcsLatestVersion(): Promise<APIResponse> {
    // Add this method to your Client class if not present
    return await this.client.send('get_tcs_latest_version', {}, true, true);
  }

  public async testT136CertificateUpload(): Promise<APIResponse> {
    const testCert = 'MIIDFjCCAf6gAwIBAgIRAKPGAol9CEdpkIoFa8huM6zfj1WEBRxteoo6PH46un4FGj4N6ioIGzVr9G40uhQGdm16ZU+q44XjW2oUnI9w=';
    // Add this method to your Client class if not present
    return await this.client.send('certificate_upload', {
      certName: 'test_cert.cer',
      certHash: (this.config.tin ?? '').substring(0, 30),
      certContent: testCert
    }, true, true);
  }

  // =========================================================================
  // ADDITIONAL ENDPOINT TESTS
  // =========================================================================

  public async testT186InvoiceRemainDetails(): Promise<APIResponse | null> {
    if (this.context.invoice_no) {
      return await this.client.invoiceRemainDetails(this.context.invoice_no);
    }
    return null;
  }

  // =========================================================================
  // RUN ALL TESTS
  // =========================================================================

  public async runAllTests(): Promise<number> {
    this.printSection('EFRIS API COMPLETE ENDPOINT TEST SUITE');
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log(`Environment: ${this.config.env ?? 'unknown'}`);
    console.log(`TIN: ${this.config.tin ?? 'unknown'}`);
    console.log(`Device: ${this.config.device_no ?? 'unknown'}`);

    // Authentication & Initialization
    this.printSection('AUTHENTICATION & INITIALIZATION');
    // await this.testEndpoint('T101', 'Get Server Time', () => this.testT101GetServerTime());
    // await this.testEndpoint('T102', 'Client Initialization', () => this.testT102ClientInit());
    // await this.testEndpoint('T103', 'Sign In', () => this.testT103SignIn());
    // await this.testEndpoint('T104', 'Get Symmetric Key', () => this.testT104GetSymmetricKey());
    // await this.testEndpoint('T105', 'Forget Password', () => this.testT105ForgetPassword(), true);

    // System Dictionary
    this.printSection('SYSTEM DICTIONARY & REFERENCE DATA');
    // await this.testEndpoint('T115', 'System Dictionary', () => this.testT115SystemDictionary());
    // await this.testEndpoint('T123', 'Query Commodity Categories', () => this.testT123QueryCommodityCategories());
    // await this.testEndpoint('T124', 'Query Categories (Paginated)', () => this.testT124QueryCommodityCategoriesPage());
    await this.testEndpoint('T125', 'Query Excise Duty', () => this.testT125QueryExciseDuty());
    await this.testEndpoint('T134', 'Commodity Incremental Update', () => this.testT134CommodityIncremental());
    await this.testEndpoint('T146', 'Query Commodity by Date', () => this.testT146QueryCommodityByDate());
    await this.testEndpoint('T185', 'Query HS Codes', () => this.testT185QueryHsCodes());

    // // Exchange Rates
    // this.printSection('EXCHANGE RATE OPERATIONS');
    // await this.testEndpoint('T121', 'Get Exchange Rate', () => this.testT121GetExchangeRate());
    // await this.testEndpoint('T126', 'Get All Exchange Rates', () => this.testT126GetAllExchangeRates());

    // // Taxpayer & Branch Info
    // this.printSection('TAXPAYER & BRANCH OPERATIONS');
    // await this.testEndpoint('T119', 'Query Taxpayer by TIN', () => this.testT119QueryTaxpayer());
    // await this.testEndpoint('T137', 'Check Taxpayer Type', () => this.testT137CheckTaxpayerType());
    // await this.testEndpoint('T138', 'Get Registered Branches', () => this.testT138GetBranches());
    // await this.testEndpoint('T180', 'Query Principal Agent', () => this.testT180QueryPrincipalAgent());
    // await this.testEndpoint('T179', 'Query Agent Relation', () => this.testT179QueryAgentRelation());

    // // Goods & Stock Operations
    // this.printSection('GOODS & STOCK OPERATIONS');
    // await this.testEndpoint('T130', 'Upload Goods', () => this.testT130UploadGoods());
    // await this.testEndpoint('T127', 'Inquire Goods', () => this.testT127InquireGoods());
    // await this.testEndpoint('T144', 'Query Goods by Code', () => this.testT144QueryGoodsByCode());
    // await this.testEndpoint('T128', 'Query Stock Quantity', () => this.testT128QueryStock());
    // await this.testEndpoint('T131', 'Maintain Stock', () => this.testT131MaintainStock());
    // await this.testEndpoint('T139', 'Transfer Stock', () => this.testT139TransferStock());
    // await this.testEndpoint('T145', 'Stock Records Query', () => this.testT145StockRecordsQuery());
    // await this.testEndpoint('T147', 'Stock Records Query (Alt)', () => this.testT147StockRecordsQueryAlt());
    // await this.testEndpoint('T149', 'Stock Adjust Records', () => this.testT149StockAdjustRecords());
    // await this.testEndpoint('T183', 'Stock Transfer Records', () => this.testT183StockTransferRecords());
    // await this.testEndpoint('T177', 'Negative Stock Config', () => this.testT177NegativeStockConfig());

    // // Invoice Operations
    // this.printSection('INVOICE OPERATIONS');
    // await this.testEndpoint('T106', 'Query All Invoices', () => this.testT106QueryAllInvoices());
    // await this.testEndpoint('T107', 'Query Normal Invoices', () => this.testT107QueryNormalInvoices());
    // await this.testEndpoint('T109', 'Upload Invoice', () => this.testT109UploadInvoice());
    // await this.testEndpoint('T108', 'Invoice Details', () => this.testT108InvoiceDetails());
    // await this.testEndpoint('T186', 'Invoice Remain Details', () => this.testT186InvoiceRemainDetails());
    // await this.testEndpoint('T129', 'Batch Invoice Upload', () => this.testT129BatchUpload(), true);
    // await this.testEndpoint('T117', 'Invoice Checks', () => this.testT117InvoiceChecks());

    // // Credit/Debit Note Operations
    // this.printSection('CREDIT/DEBIT NOTE OPERATIONS');
    // await this.testEndpoint('T110', 'Credit Note Application', () => this.testT110CreditNoteApplication());
    // await this.testEndpoint('T111', 'Query Credit Note Status', () => this.testT111QueryCreditNoteStatus());
    // await this.testEndpoint('T112', 'Credit Application Detail', () => this.testT112CreditApplicationDetail(), true);
    // await this.testEndpoint('T113', 'Approve Credit Note', () => this.testT113ApproveCreditNote(), true);
    // await this.testEndpoint('T114', 'Cancel Credit Note', () => this.testT114CancelCreditNoteApplication());
    // await this.testEndpoint('T118', 'Query Application Details', () => this.testT118QueryCreditApplicationDetails(), true);
    // await this.testEndpoint('T120', 'Void Application', () => this.testT120VoidApplication(), true);
    // await this.testEndpoint('T122', 'Query Invalid Credit', () => this.testT122QueryInvalidCredit());

    // // EDC / Fuel Operations
    // this.printSection('EDC / FUEL SPECIFIC OPERATIONS');
    // await this.testEndpoint('T162', 'Query Fuel Type', () => this.testT162QueryFuelType());
    // await this.testEndpoint('T163', 'Upload Shift Info', () => this.testT163UploadShiftInfo());
    // await this.testEndpoint('T164', 'Upload EDC Disconnect', () => this.testT164UploadEdcDisconnect());
    // await this.testEndpoint('T167', 'EDC Invoice Query', () => this.testT167EdcInvoiceQuery());
    // await this.testEndpoint('T168', 'Query Fuel Pump Version', () => this.testT168QueryFuelPumpVersion());
    // await this.testEndpoint('T170', 'Query EFD Location', () => this.testT170QueryEdcLocation());
    // await this.testEndpoint('T171', 'Query EDC UoM Rate', () => this.testT171QueryEdcUomRate());
    // await this.testEndpoint('T172', 'Upload Nozzle Status', () => this.testT172UploadNozzleStatus());
    // await this.testEndpoint('T173', 'Query EDC Device Version', () => this.testT173QueryEdcDeviceVersion());
    // await this.testEndpoint('T176', 'Upload Device Status', () => this.testT176UploadDeviceStatus());
    // await this.testEndpoint('T166', 'Update Buyer Details', () => this.testT166UpdateBuyerDetails(), true);
    // await this.testEndpoint('T169', 'Query Pump/Nozzle/Tank', () => this.testT169QueryPumpNozzleTank(), true);

    // // Agent / USSD / Contacts
    // this.printSection('AGENT / USSD / FREQUENT CONTACTS');
    // await this.testEndpoint('T175', 'USSD Account Create', () => this.testT175UssdAccountCreate());
    // await this.testEndpoint('T178', 'EFD Transfer', () => this.testT178EfdTransfer());
    // await this.testEndpoint('T181', 'Upload Frequent Contacts', () => this.testT181UploadFrequentContacts());
    // await this.testEndpoint('T182', 'Get Frequent Contacts', () => this.testT182GetFrequentContacts());

    // // Export / Customs
    // this.printSection('EXPORT / CUSTOMS OPERATIONS');
    // await this.testEndpoint('T187', 'Query FDN Status', () => this.testT187QueryFdnStatus());

    // // Reporting & System
    // this.printSection('REPORTING & SYSTEM OPERATIONS');
    // await this.testEndpoint('T116', 'Z-Report Upload', () => this.testT116ZReportUpload());
    // await this.testEndpoint('T132', 'Upload Exception Logs', () => this.testT132UploadExceptionLogs());
    // await this.testEndpoint('T133', 'TCS Upgrade Download', () => this.testT133TcsUpgradeDownload());
    // await this.testEndpoint('T135', 'Get TCS Latest Version', () => this.testT135GetTcsLatestVersion());
    // await this.testEndpoint('T136', 'Certificate Upload', () => this.testT136CertificateUpload(), true);

    // // Detail queries
    // this.printSection('DETAIL QUERIES (REQUIRE PRIOR IDs)');
    // await this.testEndpoint('T148', 'Stock Record Detail', () => this.testT148StockRecordsDetail(), true);
    // await this.testEndpoint('T160', 'Stock Adjust Detail', () => this.testT160StockAdjustDetail(), true);
    // await this.testEndpoint('T184', 'Stock Transfer Detail', () => this.testT184StockTransferDetail(), true);

    // Print Summary
    return await this.printSummary();
  }

  protected async printSummary(): Promise<number> {
    this.printSection('TEST SUMMARY');
    console.log(`✅ Passed:  ${this.results.passed.length}`);
    console.log(`❌ Failed:  ${this.results.failed.length}`);
    console.log(`⚠️  Skipped: ${this.results.skipped.length}`);
    
    const total = this.results.passed.length + this.results.failed.length + this.results.skipped.length;
    console.log(`📊 Total:   ${total}`);

    if (this.results.failed.length > 0) {
      console.log('\n❌ Failed Endpoints:');
      for (const code of this.results.failed) {
        console.log(`  - ${code}`);
      }
    }

    if (this.results.skipped.length > 0) {
      console.log('\n⚠️  Skipped Endpoints:');
      for (const code of this.results.skipped) {
        console.log(`  - ${code}`);
      }
    }

    console.log(`\n✅ Passed Endpoints (${this.results.passed.length}):`);
    const passed = [...this.results.passed].sort();
    for (const code of passed) {
      console.log(`  ✓ ${code}`);
    }

    console.log(`\nCompleted at: ${new Date().toISOString()}`);
    return this.results.failed.length > 0 ? 1 : 0;
  }
}

// =========================================================================
// CONFIGURATION LOADER
// =========================================================================

export function loadConfigFromEnv(prefix: string = 'EFRIS'): TestConfig {
  return {
    env: process.env[`${prefix}_ENV`] || 'sbx',
    tin: process.env[`${prefix}_TIN`] || '',
    device_no: process.env[`${prefix}_DEVICE_NO`] || '',
    pfx_path: process.env[`${prefix}_PFX_PATH`] || '',
    pfx_password: process.env[`${prefix}_PFX_PASSWORD`] || '',
    brn: process.env[`${prefix}_BRN`],
    taxpayer_id: process.env[`${prefix}_TAXPAYER_ID`] || '1',
    http: {
      timeout: parseInt(process.env[`${prefix}_HTTP_TIMEOUT`] || '120', 10)
    }
  };
}

export function validateConfig(config: TestConfig): void {
  const required: (keyof TestConfig)[] = ['env', 'tin', 'device_no', 'pfx_path', 'pfx_password'];
  for (const key of required) {
    if (!config[key]) {
      throw new Error(`Missing required config: ${String(key)}`);
    }
  }
}

// =========================================================================
// MAIN EXECUTION - UPDATED
// =========================================================================

export async function main(): Promise<number> {
  console.log('='.repeat(80));
  console.log('  EFRIS API COMPLETE ENDPOINT INTEGRATION TEST');
  console.log('='.repeat(80));

  // Load configuration
  console.log('\nLoading configuration...');
  let config: TestConfig;
  try {
    config = loadConfigFromEnv();
    validateConfig(config);
    console.log('✅ Configuration loaded successfully');
  } catch (error) {
    console.error(`❌ Configuration error: ${(error as Error).message}`);
    console.log('\nRequired environment variables:');
    console.log('  EFRIS_ENV=sbx|prod');
    console.log('  EFRIS_TIN=your_tin');
    console.log('  EFRIS_DEVICE_NO=your_device');
    console.log('  EFRIS_PFX_PATH=/path/to/cert.pfx');
    console.log('  EFRIS_PFX_PASSWORD=your_password');
    console.log('  EFRIS_TAXPAYER_ID=1');
    return 1;
  }

  // Initialize KeyClient
  console.log('\nInitializing KeyClient...');
  let keyClient: KeyClient;
  try {
    keyClient = new KeyClient(
      config.pfx_path,
      config.pfx_password,
      config.tin,
      config.device_no,
      config.brn ?? '',
      config.env === 'sbx',
      config.http?.timeout ?? 30,
      config.taxpayer_id ?? '1'
    );
    console.log('✅ KeyClient initialized');
  } catch (error) {
    console.error(`❌ KeyClient initialization error: ${(error as Error).message}`);
    return 1;
  }

  // Initialize Client
  console.log('\nInitializing Client...');
  let client: Client;
  try {
    const logger = new Logger();
    client = new Client(config, keyClient, logger);
    console.log('✅ Client initialized');
  } catch (error) {
    console.error(`❌ Client initialization error: ${(error as Error).message}`);
    return 1;
  }

  // Run tests
  console.log('\n' + '='.repeat(80));
  console.log('  STARTING ENDPOINT TESTS');
  console.log('='.repeat(80) + '\n');

  const tester = new EfrisEndpointTester(client, keyClient, config);
  const exitCode = await tester.runAllTests();

  return exitCode;
}

main().then(exitCode => process.exit(exitCode));