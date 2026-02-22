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
    this.keyClient = keyClient;
    this.logger = logger ?? new Logger();
  }

  protected validate(data: Record<string, any>, schemaKey: string): Record<string, any> {
    return this.validator.validate(data, schemaKey);
  }

  // ==========================
  // AUTHENTICATION & INIT
  // ==========================

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

  // ==========================
  // INVOICE OPERATIONS
  // ==========================

  public async fiscaliseInvoice(data: Record<string, any>): Promise<APIResponse> {
    const validated = this.validate(data, 'T109');
    return this.send('billing_upload', validated, true, true);
  }

  public async fiscaliseBatchInvoices(invoices: any[]): Promise<APIResponse> {
    const payload = invoices.map(inv => ({
      invoiceContent: inv.invoiceContent ?? '',
      invoiceSignature: inv.invoiceSignature ?? ''
    }));
    return this.send('batch_invoice_upload', payload, true, true);
  }

  public async verifyInvoice(invoiceNo: string): Promise<APIResponse> {
    const validated = this.validate({ invoiceNo }, 'T108');
    return this.send('invoice_details', validated, true, true);
  }

  public async queryInvoices(filters: Record<string, any>): Promise<APIResponse> {
    const validated = this.validate(filters, 'T107');
    return this.send('invoice_query_normal', validated, true, true);
  }

  public async queryAllInvoices(filters: Record<string, any>): Promise<APIResponse> {
    const validated = this.validate(filters, 'T106');
    return this.send('invoice_query_all', validated, true, true);
  }

  public async verifyInvoicesBatch(invoiceChecks: any[]): Promise<APIResponse> {
    const payload = invoiceChecks.map(check => ({
      invoiceNo: check.invoiceNo,
      invoiceType: check.invoiceType
    }));
    return this.send('invoice_checks', payload, true, true);
  }

  public async invoiceRemainDetails(invoiceNo: string): Promise<APIResponse> {
    const validated = this.validate({ invoiceNo }, 'T186');
    return this.send('invoice_remain_details', validated, true, true);
  }

  // ==========================
  // CREDIT/DEBIT NOTE OPS
  // ==========================

  public async applyCreditNote(data: Record<string, any>): Promise<APIResponse> {
    data.invoiceApplyCategoryCode = data.invoiceApplyCategoryCode ?? '101';
    const validated = this.validate(data, 'T110');
    return this.send('credit_application', validated, true, true);
  }

  public async applyDebitNote(data: Record<string, any>): Promise<APIResponse> {
    data.invoiceApplyCategoryCode = '104';
    const validated = this.validate(data, 'T110');
    return this.send('credit_application', validated, true, true);
  }

  public async queryCreditNoteStatus(filters: Record<string, any>): Promise<APIResponse> {
    const validated = this.validate(filters, 'T111');
    return this.send('credit_note_query', validated, true, true);
  }

  public async getCreditApplicationDetail(applicationId: string): Promise<APIResponse> {
    const validated = this.validate({ id: applicationId }, 'T112');
    return this.send('credit_application_detail', validated, true, true);
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
    const validated = this.validate(payload, 'T114');
    return this.send('credit_note_cancel', validated, true, false);
  }

  public async queryInvalidCreditNote(invoiceNo: string): Promise<APIResponse> {
    return this.send('query_invalid_credit', { invoiceNo }, true, true);
  }

  public async voidCreditDebitApplication(businessKey: string, referenceNo: string): Promise<APIResponse> {
    const payload = { businessKey, referenceNo };
    return this.send('void_application', payload, true, false);
  }

  // ==========================
  // TAXPAYER & BRANCH OPS
  // ==========================

  public async queryTaxpayerByTin(tin?: string, ninBrn?: string): Promise<APIResponse> {
    const payload = { tin, ninBrn };
    const validated = this.validate(payload, 'T119');
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

  // ==========================
  // UTILITY METHODS
  // ==========================

  public async getServerTime(): Promise<APIResponse> {
    return this.send('get_server_time', {}, false, false);
  }

  public async isTimeSynced(toleranceMinutes: number = 10, maxRetries: number = 3): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const serverTimeStr: string = await this.getServerTime() as any;
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
      const elapsed = Math.floor(Date.now() / 1000) - fetchedAt;
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