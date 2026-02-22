import { Logger } from 'tslog';
import { APIException, EncryptionException } from './exceptions';
import { CryptoUtils } from './utils';
import { KeyClient } from './key_client';

export type RequestPayload = Record<string, any>;
export type ResponseEnvelope = Record<string, any>;

export class BaseClient {
  /** Interface code mapping */
  protected static readonly INTERFACES: Record<string, string> = {
    // SYSTEM / AUTHENTICATION
    get_server_time: 'T101',
    client_init: 'T102',
    sign_in: 'T103',
    get_symmetric_key: 'T104',
    forget_password: 'T105',
    // INVOICE MANAGEMENT
    invoice_query_all: 'T106',
    invoice_query_normal: 'T107',
    invoice_details: 'T108',
    billing_upload: 'T109',
    batch_invoice_upload: 'T129',
    // CREDIT / DEBIT NOTES
    credit_application: 'T110',
    credit_note_query: 'T111',
    credit_note_details: 'T112',
    credit_note_approval: 'T113',
    credit_note_cancel: 'T114',
    query_credit_application: 'T118',
    void_application: 'T120',
    query_invalid_credit: 'T122',
    invoice_checks: 'T117',
    // TAXPAYER / BRANCH
    query_taxpayer: 'T119',
    get_branches: 'T138',
    check_taxpayer_type: 'T137',
    query_principal_agent: 'T180',
    // COMMODITY / EXCISE / DICTIONARY
    system_dictionary: 'T115',
    query_commodity_categories: 'T123',
    query_commodity_categories_page: 'T124',
    query_excise_duty: 'T125',
    sync_commodity_categories: 'T134',
    query_commodity_by_date: 'T146',
    query_hs_codes: 'T185',
    // EXCHANGE RATES
    get_exchange_rates: 'T126',
    get_exchange_rate: 'T121',
    // GOODS / SERVICES
    goods_upload: 'T130',
    goods_inquiry: 'T127',
    query_stock: 'T128',
    query_goods_by_code: 'T144',
    // STOCK MANAGEMENT
    stock_maintain: 'T131',
    stock_transfer: 'T139',
    stock_records_query: 'T145',
    stock_records_query_alt: 'T147',
    stock_records_detail: 'T148',
    stock_adjust_records: 'T149',
    stock_adjust_detail: 'T160',
    stock_transfer_records: 'T183',
    stock_transfer_detail: 'T184',
    negative_stock_config: 'T177',
    // EDC / FUEL SPECIFIC
    query_fuel_type: 'T162',
    upload_shift_info: 'T163',
    upload_edc_disconnect: 'T164',
    update_buyer_details: 'T166',
    edc_invoice_query: 'T167',
    query_fuel_pump_version: 'T168',
    query_pump_nozzle_tank: 'T169',
    query_edc_location: 'T170',
    query_edc_uom_rate: 'T171',
    upload_nozzle_status: 'T172',
    query_edc_device_version: 'T173',
    // AGENT / USSD
    ussd_account_create: 'T175',
    upload_device_status: 'T176',
    efd_transfer: 'T178',
    query_agent_relation: 'T179',
    upload_frequent_contacts: 'T181',
    get_frequent_contacts: 'T182',
    // EXPORT / CUSTOMS
    invoice_remain_details: 'T186',
    query_fdn_status: 'T187',
    // SYSTEM UTILITIES
    z_report_upload: 'T116',
    exception_log_upload: 'T132',
    tcs_upgrade_download: 'T133',
    get_tcs_latest_version: 'T135',
    certificate_upload: 'T136',
  };

  protected config: Record<string, any>;
  protected keyClient: KeyClient;
  protected timeout: number;
  protected logger: Logger<any>;

  constructor(config: Record<string, any>, keyClient: KeyClient, logger?: Logger<any>) {
    this.config = config;
    this.keyClient = keyClient;
    this.timeout = config.http?.timeout ?? 60;
    this.logger = logger ?? new Logger();
  }

  protected getEndpointUrl(): string {
    const env = this.config.env ?? 'sbx';
    return env === 'sbx'
      ? 'https://efristest.ura.go.ug/efrisws/ws/taapp/getInformation'
      : 'https://efrisws.ura.go.ug/ws/taapp/getInformation';
  }

  public async send(
    interfaceKey: string,
    payload: RequestPayload,
    encrypt: boolean = true,
    decrypt: boolean = false
  ): Promise<ResponseEnvelope> {
    if (!BaseClient.INTERFACES[interfaceKey]) {
      throw new APIException(`Interface [${interfaceKey}] not configured`, 400);
    }

    const interfaceCode = BaseClient.INTERFACES[interfaceKey];
    let aesKey: string;

    aesKey = await this.keyClient.fetchAesKey();

    const privateKey = this.keyClient.loadPrivateKey();

    const requestEnvelope = encrypt && aesKey
      ? CryptoUtils.buildEncryptedRequest(
          payload,
          aesKey,
          interfaceCode,
          this.config.tin,
          this.config.device_no,
          this.config.brn ?? '',
          privateKey,
          this.keyClient.getTaxpayerId()
        )
      : CryptoUtils.buildUnencryptedRequest(
          payload,
          interfaceCode,
          this.config.tin,
          this.config.device_no,
          this.config.brn ?? '',
          privateKey,
          this.keyClient.getTaxpayerId()
        );

    this.logger.debug(`Sending request to interface ${interfaceCode}`);
    this.logger.debug(`Encrypt: ${encrypt}, Decrypt: ${decrypt}`);

    const url = this.getEndpointUrl();
    const response = await this.httpPost(url, requestEnvelope);

    if (response.status_code !== 200) {
      throw new APIException(`HTTP ${response.status_code}: ${response.body}`, response.status_code);
    }

    const respJson = JSON.parse(response.body) as ResponseEnvelope;

    this.logger.debug(`Response returnCode: ${respJson.returnStateInfo?.returnCode ?? 'N/A'}`);

    return CryptoUtils.unwrapResponse(respJson, decrypt ? aesKey : undefined);
  }

  protected async httpPost(url: string, data: Record<string, any>): Promise<{ status_code: number; body: string }> {
    try {
      const resp = await this.keyClient['axiosInstance'].post(url, data, {
        headers: { 'Content-Type': 'application/json' },
        httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
        timeout: this.timeout * 1000,
      });
      return { status_code: resp.status, body: JSON.stringify(resp.data) };
    } catch (err: any) {
      throw new APIException(`HTTP request failed: ${err.message}`, err.response?.status ?? 0);
    }
  }

  public async get(interfaceKey: string, params?: RequestPayload, encrypt: boolean = true, decrypt: boolean = false) {
    return this.send(interfaceKey, params ?? {}, encrypt, decrypt);
  }

  public async post(interfaceKey: string, data?: RequestPayload, encrypt: boolean = true, decrypt: boolean = false) {
    return this.send(interfaceKey, data ?? {}, encrypt, decrypt);
  }
}