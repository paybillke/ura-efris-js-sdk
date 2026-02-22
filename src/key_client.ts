import fs from 'fs';
import crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import forge from 'node-forge';
import { Logger } from 'tslog';
import { APIException, AuthenticationException, EncryptionException } from './exceptions';
import { CryptoUtils } from './utils';

export interface AesKeyContent {
  [key: string]: any;
}

export class KeyClient {
  private static readonly T104_ENDPOINT_TEST = "https://efristest.ura.go.ug/efrisws/ws/taapp/getInformation";
  private static readonly T104_ENDPOINT_PROD = "https://efrisws.ura.go.ug/ws/taapp/getInformation";

  private _privateKey?: crypto.KeyObject;
  private _aesKey?: string;
  private _aesKeyFetchedAt?: number;
  private _aesKeyTtlSeconds = 23 * 60 * 60; // 23 hours
  private _aesKeyContentJson?: AesKeyContent;
  private axiosInstance: AxiosInstance;

  constructor(
    private pfxPath: string,
    private password: string,
    private tin: string,
    private deviceNo: string,
    private brn: string = '',
    private sandbox: boolean = true,
    private timeout: number = 30,
    private taxpayerId: string = '1',
    private logger: Logger<any> = new Logger<any>()
  ) {
    this.axiosInstance = axios.create({ timeout: this.timeout * 1000 });
  }

  private getEndpoint(): string {
    return this.sandbox ? KeyClient.T104_ENDPOINT_TEST : KeyClient.T104_ENDPOINT_PROD;
  }

  // ======================================================
  // PRIVATE KEY LOADING
  // ======================================================
  private loadPrivateKeyFromPfx(): crypto.KeyObject {
    if (!fs.existsSync(this.pfxPath)) {
      throw new AuthenticationException(`PFX file not found: ${this.pfxPath}`);
    }

    const pfxBuffer = fs.readFileSync(this.pfxPath);
    const pfxAsn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
    const p12 = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, this.password);

    const keyBags = p12.getBags({ bagType: forge.pki.oids.keyBag });
    const pkcs8Bags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

    let privateKeyForge = keyBags[forge.pki.oids.keyBag]?.[0]?.key
      ?? pkcs8Bags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key;

    if (!privateKeyForge) {
      throw new AuthenticationException('Failed to extract private key from PFX');
    }

    const pem = forge.pki.privateKeyToPem(privateKeyForge);
    return crypto.createPrivateKey({ key: pem, format: 'pem', type: 'pkcs8' });
  }

  public loadPrivateKey(): crypto.KeyObject {
    if (!this._privateKey) {
      this._privateKey = this.loadPrivateKeyFromPfx();

      const fingerprint = crypto.createHash('sha256')
        .update(this._privateKey.export({ type: 'pkcs8', format: 'der' }))
        .digest('hex');

      this.logger.info(`Loaded private key with fingerprint: ${fingerprint}`);
    }

    return this._privateKey;
  }

  // ======================================================
  // AES KEY FETCHING
  // ======================================================
  public async fetchAesKey(force: boolean = false): Promise<string> {
    if (!force && this._aesKey && this._aesKeyFetchedAt) {
      if ((Date.now() / 1000 - this._aesKeyFetchedAt) < this._aesKeyTtlSeconds) {
        this.logger.debug('Using cached AES key');
        return this._aesKey;
      }
    }

    this.logger.info('Fetching AES symmetric key from T104 endpoint');

    const privateKey = this.loadPrivateKey();
    const payload = CryptoUtils.buildUnencryptedRequest(
      [], 'T104', this.tin, this.deviceNo, this.brn, privateKey, this.taxpayerId
    );

    const url = this.getEndpoint();
    let respJson: any;

    try {
      const resp = await this.axiosInstance.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
      });
      respJson = resp.data;
    } catch (err: any) {
      this.logger.error('T104 connection error', err);
      throw new APIException(`T104 connection error: ${err.message}`);
    }

    const returnState = respJson.returnStateInfo ?? {};
    if ((returnState.returnMessage ?? '') !== 'SUCCESS') {
      const msg = returnState.returnMessage ?? 'Unknown error';
      const code = returnState.returnCode ?? '99';
      this.logger.error(`T104 failed: ${msg} (code: ${code})`);
      throw new APIException(`T104 failed: ${msg}`, code);
    }

    try {
      const contentB64: string = respJson.data?.content;
      if (!contentB64) throw new EncryptionException('Missing content in T104 response');

      const contentJson = JSON.parse(Buffer.from(contentB64, 'base64').toString());
      const encryptedAesB64 = contentJson.passowrdDes ?? contentJson.passwordDes;
      if (!encryptedAesB64) throw new EncryptionException('Missing AES key field in T104 response');

      const encryptedAes = Buffer.from(encryptedAesB64, 'base64');

      // RSA decryption
      const aesKeyRaw = crypto.privateDecrypt(
        { key: privateKey, padding: crypto.constants.RSA_PKCS1_PADDING },
        encryptedAes
      );

      let aesKeyCandidate = Buffer.from(aesKeyRaw.toString(), 'base64');
      if (aesKeyCandidate.length === 0) aesKeyCandidate = Buffer.from(aesKeyRaw);

      let aesKey: Buffer;
      if (aesKeyCandidate.length === 8) {
        aesKey = Buffer.concat([aesKeyCandidate, aesKeyCandidate]).slice(0, 16);
      } else if ([16, 24, 32].includes(aesKeyCandidate.length)) {
        aesKey = aesKeyCandidate;
      } else {
        aesKey = aesKeyCandidate.slice(0, 16);
      }

      if (![16, 24, 32].includes(aesKey.length)) {
        throw new EncryptionException(`Cannot use AES key of length ${aesKey.length}`);
      }

      this._aesKey = aesKey.toString('hex');
      this._aesKeyFetchedAt = Math.floor(Date.now() / 1000);
      this._aesKeyContentJson = contentJson;

      this.logger.info('AES key fetched and cached successfully');
      return this._aesKey;

    } catch (err: any) {
      this.logger.error('Failed to extract AES key', err);
      throw new EncryptionException(`Failed to extract AES key: ${err.message}`);
    }
  }

  // ======================================================
  // AES KEY ACCESSORS
  // ======================================================
  public getAesKey(): string | undefined { return this._aesKey; }
  public getAesKeyBytes(): Buffer | undefined { return this._aesKey ? Buffer.from(this._aesKey, 'hex') : undefined; }

  public forgetAesKey(): void {
    this._aesKey = undefined;
    this._aesKeyFetchedAt = undefined;
    this._aesKeyContentJson = undefined;
  }

  public getAesKeyValidUntil(): Date | undefined {
    return this._aesKeyFetchedAt
      ? new Date((this._aesKeyFetchedAt + this._aesKeyTtlSeconds) * 1000)
      : undefined;
  }

  public isAesKeyValid(): boolean {
    return !!this._aesKey && !!this._aesKeyFetchedAt
      && ((Date.now() / 1000 - this._aesKeyFetchedAt) < this._aesKeyTtlSeconds);
  }

  public getAesKeyContentJson(): AesKeyContent | undefined { return this._aesKeyContentJson; }
  public getAesKeyFetchedAt(): number | undefined { return this._aesKeyFetchedAt; }

  public setTaxpayerId(taxpayerId: string): void { this.taxpayerId = taxpayerId; }
  public getTaxpayerId(): string { return this.taxpayerId; }

  // ======================================================
  // PRIVATE KEY ACCESS
  // ======================================================
  public getPrivateKey(): crypto.KeyObject { return this._privateKey ?? this.loadPrivateKey(); }

  public signData(data: string): string {
    return CryptoUtils.signRsaSha1(data, this.getPrivateKey());
  }
}