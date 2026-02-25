import { Logger } from 'tslog';
import { BaseClient } from './base_client';
import { Validator } from './validator';
import { KeyClient } from './key_client';
import { TimeUtils } from './utils';

export interface APIResponse {
  [key: string]: any;
}

export class Client extends BaseClient {
  protected validator: Validator;

  constructor(
    config: Record<string, any>,
    keyClient: KeyClient,
    logger?: Logger<any>
  ) {
    super(config, keyClient, logger);
    this.validator = new Validator();
    this.logger = logger ?? new Logger();
  }

  protected validate(data: Record<string, any>, schemaKey: string): Record<string, any> {
    return this.validator.validate(data, schemaKey);
  }

  // =========================================================================
  // AUTHENTICATION & INITIALIZATION
  // =========================================================================

  public async clientInit(): Promise<APIResponse> {
    return this.send('client_init', {}, false, false);
  }

  public async signIn(): Promise<APIResponse> {
    const response = await this.send('sign_in', {}, false, true);
    const content = response?.data?.content ?? {};
    const taxpayer = content?.taxpayer ?? {};

    if (taxpayer?.id) {
      this.keyClient.setTaxpayerId(String(taxpayer.id));
      this.logger.debug(`Updated taxpayerID from sign_in: ${this.keyClient.getTaxpayerId()}`);
    }
    return response;
  }

  public async getSymmetricKey(force: boolean = false): Promise<APIResponse> {
    await this.keyClient.fetchAesKey(force);
    return this.keyClient.getAesKeyContentJson() ?? {};
  }

  public async forgetPassword(userName: string, newPassword: string): Promise<APIResponse> {
    const payload = { userName, changedPassword: newPassword };
    return this.send('forget_password', payload, true, false);
  }

  public async updateSystemDictionary(data?: Record<string, any>): Promise<APIResponse> {
    return this.send('system_dictionary', data ?? {}, false, true);
  }

  // =========================================================================
  // INVOICE OPERATIONS
  // =========================================================================

  public async fiscaliseInvoice(data: Record<string, any>): Promise<APIResponse> {
    const validated = this.validate(data, 'billing_upload');
    return this.send('billing_upload', validated, true, true);
  }

  public async fiscaliseBatchInvoices(invoices: Array<{ invoiceContent?: string; invoiceSignature?: string }>): Promise<APIResponse> {
    const payload = invoices.map(inv => ({
      invoiceContent: inv.invoiceContent ?? '',
      invoiceSignature: inv.invoiceSignature ?? ''
    }));
    return this.send('batch_invoice_upload', payload, true, true);
  }

  public async verifyInvoice(invoiceNo: string): Promise<APIResponse> {
    const validated = this.validate({ invoiceNo }, 'invoice_details');
    return this.send('invoice_details', validated, true, true);
  }

  public async queryInvoices(filters: Record<string, any>): Promise<APIResponse> {
    const validated = this.validate(filters, 'invoice_query_normal');
    return this.send('invoice_query_normal', validated, true, true);
  }

  public async queryAllInvoices(filters: Record<string, any>): Promise<APIResponse> {
    const validated = this.validate(filters, 'invoice_query_all');
    return this.send('invoice_query_all', validated, true, true);
  }

  public async verifyInvoicesBatch(invoiceChecks: Array<{ invoiceNo: string; invoiceType: string }>): Promise<APIResponse> {
    const payload = invoiceChecks.map(check => ({
      invoiceNo: check.invoiceNo,
      invoiceType: check.invoiceType
    }));
    return this.send('invoice_checks', payload, true, true);
  }

  public async invoiceRemainDetails(invoiceNo: string): Promise<APIResponse> {
    const validated = this.validate({ invoiceNo }, 'invoice_remain_details');
    return this.send('invoice_remain_details', validated, true, true);
  }

  // =========================================================================
  // CREDIT/DEBIT NOTE OPERATIONS
  // =========================================================================

  public async applyCreditNote(data: Record<string, any>): Promise<APIResponse> {
    const payload = { ...data, invoiceApplyCategoryCode: data.invoiceApplyCategoryCode ?? '101' };
    const validated = this.validate(payload, 'credit_application');
    return this.send('credit_application', validated, true, true);
  }

  public async applyDebitNote(data: Record<string, any>): Promise<APIResponse> {
    const payload = { ...data, invoiceApplyCategoryCode: '104' };
    const validated = this.validate(payload, 'credit_application');
    return this.send('credit_application', validated, true, true);
  }

  public async queryCreditNoteStatus(filters: Record<string, any>): Promise<APIResponse> {
    const validated = this.validate(filters, 'credit_note_query');
    return this.send('credit_note_query', validated, true, true);
  }

  public async getCreditApplicationDetail(applicationId: string): Promise<APIResponse> {
    const validated = this.validate({ id: applicationId }, 'credit_note_details');
    return this.send('credit_note_details', validated, true, true);
  }

  public async approveCreditNote(referenceNo: string, approve: boolean, taskId: string, remark: string): Promise<APIResponse> {
    const payload = {
      referenceNo,
      approveStatus: approve ? '101' : '103',
      taskId,
      remark
    };
    return this.send('credit_note_approval', payload, true, false);
  }

  public async cancelCreditNoteApplication(
    oriInvoiceId: string,
    invoiceNo: string,
    reasonCode: string,
    reason?: string,
    cancelType: string = '104'
  ): Promise<APIResponse> {
    const payload = {
      oriInvoiceId,
      invoiceNo,
      reasonCode,
      reason,
      invoiceApplyCategoryCode: cancelType
    };
    const validated = this.validate(payload, 'credit_note_cancel');
    return this.send('credit_note_cancel', validated, true, false);
  }

  public async queryInvalidCreditNote(invoiceNo: string): Promise<APIResponse> {
    return this.send('query_invalid_credit', { invoiceNo }, true, true);
  }

  public async voidCreditDebitApplication(businessKey: string, referenceNo: string): Promise<APIResponse> {
    const payload = { businessKey, referenceNo };
    return this.send('void_application', payload, true, false);
  }

  // =========================================================================
  // TAXPAYER & BRANCH OPERATIONS
  // =========================================================================

  public async queryTaxpayerByTin(tin?: string, ninBrn?: string): Promise<APIResponse> {
    const payload = { tin, ninBrn };
    const validated = this.validate(payload, 'query_taxpayer');
    return this.send('query_taxpayer', validated, true, true);
  }

  public async getRegisteredBranches(tin?: string): Promise<APIResponse> {
    const payload = tin ? { tin } : {};
    return this.send('get_branches', payload, true, true);
  }

  public async checkTaxpayerType(tin: string, commodityCategoryCode?: string): Promise<APIResponse> {
    const payload: any = { tin };
    if (commodityCategoryCode) payload.commodityCategoryCode = commodityCategoryCode;
    return this.send('check_taxpayer_type', payload, true, true);
  }

  public async queryPrincipalAgent(tin: string, branchId: string): Promise<APIResponse> {
    return this.send('query_principal_agent', { tin, branchId }, true, true);
  }

  // =========================================================================
  // COMMODITY & EXCISE OPERATIONS [NEWLY ADDED]
  // =========================================================================

  public async queryCommodityCategoriesAll(): Promise<APIResponse> {
    return this.send('query_commodity_category', {}, false, false);
  }

  public async queryCommodityCategories(pageNo: number = 1, pageSize: number = 20): Promise<APIResponse> {
    const payload = { pageNo, pageSize };
    return this.send('query_commodity_category_page', payload, false, false);
  }

  public async syncCommodityCategories(commodityCategoryVersion: string): Promise<APIResponse> {
    return this.send('commodity_incremental', { commodityCategoryVersion }, true, true);
  }

  public async queryCommodityByDate(categoryCode: string, type: string, issueDate: string): Promise<APIResponse> {
    const payload = { categoryCode, type, issueDate };
    return this.send('query_commodity_by_date', payload, true, true);
  }

  public async queryExciseDutyCodes(): Promise<APIResponse> {
    return this.send('query_excise_duty', {}, false, false);
  }

  public async queryHsCodes(): Promise<APIResponse> {
    return this.send('query_hs_codes', {}, false, false);
  }

  // =========================================================================
  // EXCHANGE RATE OPERATIONS [NEWLY ADDED]
  // =========================================================================

  public async getExchangeRate(currency: string, issueDate?: string): Promise<APIResponse> {
    const payload: any = { currency };
    if (issueDate) payload.issueDate = issueDate;
    return this.send('get_exchange_rate', payload, true, true);
  }

  public async getAllExchangeRates(issueDate?: string): Promise<APIResponse> {
    const payload: any = {};
    if (issueDate) payload.issueDate = issueDate;
    return this.send('get_exchange_rates', payload, true, true);
  }

  // =========================================================================
  // GOODS & STOCK OPERATIONS
  // =========================================================================

  public async uploadGoods(goods: Record<string, any>[]): Promise<APIResponse> {
    return this.send('goods_upload', goods, true, true);
  }

  public async inquireGoods(filters: Record<string, any>): Promise<APIResponse> {
    return this.send('goods_inquiry', filters, true, true);
  }

  public async queryGoodsByCode(goodsCode: string, tin?: string): Promise<APIResponse> {
    const payload: any = { goodsCode };
    if (tin) payload.tin = tin;
    return this.send('query_goods_by_code', payload, true, true);
  }

  public async queryStockQuantity(goodsId: string, branchId?: string): Promise<APIResponse> {
    const payload: any = { id: goodsId };
    if (branchId) payload.branchId = branchId;
    return this.send('query_stock', payload, true, true);
  }

  public async maintainStock(data: Record<string, any>): Promise<APIResponse> {
    const validated = this.validate(data, 'stock_maintain');
    return this.send('stock_maintain', validated, true, true);
  }

  public async transferStock(data: Record<string, any>): Promise<APIResponse> {
    return this.send('stock_transfer', data, true, true);
  }

  public async queryStockRecords(filters: Record<string, any>): Promise<APIResponse> {
    return this.send('stock_records_query', filters, true, true);
  }

  public async queryStockRecordsAlt(filters: Record<string, any>): Promise<APIResponse> {
    return this.send('stock_records_query_alt', filters, true, true);
  }

  public async queryStockRecordDetail(recordId: string): Promise<APIResponse> {
    return this.send('stock_records_detail', { id: recordId }, true, true);
  }

  public async queryStockAdjustRecords(filters: Record<string, any>): Promise<APIResponse> {
    return this.send('stock_adjust_records', filters, true, true);
  }

  public async queryStockAdjustDetail(adjustId: string): Promise<APIResponse> {
    return this.send('stock_adjust_detail', { id: adjustId }, true, true);
  }

  public async queryStockTransferRecords(filters: Record<string, any>): Promise<APIResponse> {
    return this.send('stock_transfer_records', filters, true, true);
  }

  public async queryStockTransferDetail(transferId: string): Promise<APIResponse> {
    return this.send('stock_transfer_detail', { id: transferId }, true, true);
  }

  public async queryNegativeStockConfig(): Promise<APIResponse> {
    return this.send('negative_stock_config', {}, false, false);
  }

  // =========================================================================
  // EDC / FUEL SPECIFIC OPERATIONS [NEWLY ADDED]
  // =========================================================================

  public async queryFuelType(): Promise<APIResponse> {
    return this.send('query_fuel_type', {}, false, true);
  }

  public async uploadShiftInfo(data: Record<string, any>): Promise<APIResponse> {
    return this.send('upload_shift_info', data, true, false);
  }

  public async uploadEdcDisconnect(logs: Record<string, any>[]): Promise<APIResponse> {
    return this.send('upload_edc_disconnect', logs, true, false);
  }

  public async updateBuyerDetails(data: Record<string, any>): Promise<APIResponse> {
    return this.send('update_buyer_details', data, true, false);
  }

  public async edcInvoiceQuery(filters: Record<string, any>): Promise<APIResponse> {
    return this.send('edc_invoice_query', filters, true, true);
  }

  public async queryFuelPumpVersion(): Promise<APIResponse> {
    return this.send('query_fuel_pump_version', {}, false, true);
  }

  public async queryPumpNozzleTank(pumpId: string): Promise<APIResponse> {
    return this.send('query_pump_nozzle_tank', { id: pumpId }, true, true);
  }

  public async queryEdcLocation(
    deviceNumber: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<APIResponse> {
    const payload: any = { deviceNumber };
    if (startDate) payload.startDate = startDate;
    if (endDate) payload.endDate = endDate;
    return this.send('query_edc_location', payload, true, true);
  }

  public async queryEdcUomRate(): Promise<APIResponse> {
    return this.send('query_edc_uom_rate', {}, false, true);
  }

  public async uploadNozzleStatus(nozzleId: string, nozzleNo: string, status: string): Promise<APIResponse> {
    const payload = { nozzleId, nozzleNo, status };
    return this.send('upload_nozzle_status', payload, true, false);
  }

  public async queryEdcDeviceVersion(): Promise<APIResponse> {
    return this.send('query_edc_device_version', {}, false, true);
  }

  public async uploadDeviceStatus(deviceNo: string, deviceIssuingStatus: string): Promise<APIResponse> {
    const payload = { deviceNo, deviceIssuingStatus };
    return this.send('upload_device_status', payload, false, false);
  }

  // =========================================================================
  // AGENT / USSD / FREQUENT CONTACTS
  // =========================================================================

  public async ussdAccountCreate(tin: string, mobileNumber: string): Promise<APIResponse> {
    const payload = { tin, mobileNumber };
    return this.send('ussd_account_create', payload, true, false);
  }

  public async efdTransfer(destinationBranchId: string, remarks?: string): Promise<APIResponse> {
    const payload: any = { destinationBranchId };
    if (remarks) payload.remarks = remarks;
    return this.send('efd_transfer', payload, true, false);
  }

  public async queryAgentRelation(tin: string): Promise<APIResponse> {
    return this.send('query_agent_relation', { tin }, true, true);
  }

  public async uploadFrequentContacts(data: Record<string, any>): Promise<APIResponse> {
    return this.send('upload_frequent_contacts', data, true, false);
  }

  public async getFrequentContacts(buyerTin?: string, buyerLegalName?: string): Promise<APIResponse> {
    const payload: any = {};
    if (buyerTin) payload.buyerTin = buyerTin;
    if (buyerLegalName) payload.buyerLegalName = buyerLegalName;
    return this.send('get_frequent_contacts', payload, true, true);
  }

  // =========================================================================
  // EXPORT / CUSTOMS OPERATIONS
  // =========================================================================

  public async queryFdnStatus(invoiceNo: string): Promise<APIResponse> {
    return this.send('query_fdn_status', { invoiceNo }, true, true);
  }

  // =========================================================================
  // REPORTING & LOGGING [NEWLY ADDED]
  // =========================================================================

  public async uploadZReport(reportData: Record<string, any>): Promise<APIResponse> {
    return this.send('z_report_upload', reportData, true, true);
  }

  public async uploadExceptionLogs(logs: Array<{
    interruptionTypeCode: string;
    description: string;
    errorDetail?: string;
    interruptionTime: string;
  }>): Promise<APIResponse> {
    const payload = logs.map(log => ({
      interruptionTypeCode: log.interruptionTypeCode,
      description: log.description,
      errorDetail: log.errorDetail,
      interruptionTime: log.interruptionTime
    }));
    return this.send('exception_log_upload', payload, true, false);
  }

  public async tcsUpgradeDownload(tcsVersion: string, osType: string): Promise<APIResponse> {
    const payload = { tcsVersion, osType };
    return this.send('tcs_upgrade_download', payload, true, true);
  }

  public async getTcsLatestVersion(): Promise<APIResponse> {
    return this.send('get_tcs_latest_version', {}, false, true);
  }

  public async certificateUpload(fileName: string, verifyString: string, fileContent: string): Promise<APIResponse> {
    const payload = { fileName, verifyString, fileContent };
    return this.send('certificate_upload', payload, false, false);
  }

  // =========================================================================
  // UTILITY METHODS
  // =========================================================================

  public async getServerTime(): Promise<string> {
    const response = await this.send('get_server_time', {}, false, false);
    return response?.data?.serverTime ?? response?.returnStateInfo?.returnMessage ?? '';
  }

  public async isTimeSynced(toleranceMinutes: number = 10, maxRetries: number = 3): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const serverTimeStr = await this.getServerTime();
        if (!serverTimeStr) {
          this.logger.warn(`Attempt ${attempt}: Could not retrieve server time`);
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        const clientTimeStr = TimeUtils.getUgandaTimestamp();
        if (TimeUtils.validateTimeSync(clientTimeStr, serverTimeStr, toleranceMinutes)) {
          if (attempt > 1) this.logger.info(`Time sync successful after ${attempt} attempt(s)`);
          return true;
        }

        this.logger.warn(`Attempt ${attempt}: Time sync failed`);
        if (attempt < maxRetries) await new Promise(r => setTimeout(r, 2000));
      } catch (err: any) {
        this.logger.warn(`Attempt ${attempt}: Time sync check error: ${err?.message}`);
        if (attempt < maxRetries) await new Promise(r => setTimeout(r, 2000));
      }
    }

    this.logger.error(`Time sync failed after ${maxRetries} attempts`);
    return false;
  }

  public async refreshAesKeyIfNeeded(): Promise<boolean> {
    const fetchedAt = this.keyClient.getAesKeyFetchedAt();
    if (fetchedAt) {
      const now = Math.floor(Date.now() / 1000);
      const elapsed = now - fetchedAt;
      if (elapsed > 23 * 60 * 60) {
        await this.keyClient.fetchAesKey(true);
        return true;
      }
    } else if (!this.keyClient.getAesKey()) {
      await this.keyClient.fetchAesKey();
      return true;
    }
    return false;
  }
}
