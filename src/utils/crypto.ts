import crypto from 'crypto';
import { EncryptionException } from '../exceptions';
import zlib from 'zlib';
import { TimeUtils } from './time';

export class CryptoUtils {
  private static readonly AES_BLOCK_SIZE = 16;

  /* =========================================
   * PKCS7 Padding Helpers
   * ========================================= */

  private static pkcs7Pad(data: Buffer | string): Buffer {
    const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    const padLen = CryptoUtils.AES_BLOCK_SIZE - (buf.length % CryptoUtils.AES_BLOCK_SIZE);
    const padding = Buffer.alloc(padLen, padLen);
    return Buffer.concat([buf, padding]);
  }

  private static pkcs7Unpad(data: Buffer): Buffer {
    if (data.length === 0) throw new EncryptionException('Cannot unpad empty string');

    const padLen = data[data.length - 1];
    if (padLen < 1 || padLen > CryptoUtils.AES_BLOCK_SIZE) {
      throw new EncryptionException(`Invalid PKCS7 padding length: ${padLen}`);
    }

    const padding = data.slice(-padLen);
    if (!padding.equals(Buffer.alloc(padLen, padLen))) {
      throw new EncryptionException('PKCS7 padding verification failed');
    }

    return data.slice(0, data.length - padLen);
  }

  /* =========================================
   * AES Key Normalization
   * ========================================= */

  private static normalizeAesKey(key: string): Buffer {
    if (/^[0-9a-fA-F]+$/.test(key) && key.length % 2 === 0) {
      const decoded = Buffer.from(key, 'hex');
      if ([16, 24, 32].includes(decoded.length)) return decoded;
    }
    return Buffer.from(key, 'utf8');
  }

  /* =========================================
   * AES ECB Encrypt
   * ========================================= */

  public static encryptAesEcb(plaintext: string, key: string): string {
    const keyBuf = this.normalizeAesKey(key);
    if (![16, 24, 32].includes(keyBuf.length)) {
      throw new EncryptionException(`AES key must be 16/24/32 bytes, got ${keyBuf.length}`);
    }

    const padded = this.pkcs7Pad(plaintext);
    const cipher = crypto.createCipheriv(`aes-${keyBuf.length * 8}-ecb`, keyBuf, null);
    cipher.setAutoPadding(false);

    const encrypted = Buffer.concat([cipher.update(padded), cipher.final()]);
    return encrypted.toString('base64');
  }

  /* =========================================
   * AES ECB Decrypt
   * ========================================= */

  public static decryptAesEcb(
    ciphertextB64: string,
    key?: string,
    encryptCode = '2',
    zipCode = '0'
  ): string {
    if (!ciphertextB64) return '';

    let dataBytes = Buffer.from(ciphertextB64, 'base64');

    if (zipCode === '1') {
      if (dataBytes[0] !== 0x1f || dataBytes[1] !== 0x8b) {
        throw new EncryptionException('zipCode=1 but data is not gzipped');
      }
      dataBytes = Buffer.from(zlib.gunzipSync(dataBytes));
    }

    if (encryptCode === '2') {
      if (!key) throw new EncryptionException('AES key required for decrypt');

      const keyBuf = this.normalizeAesKey(key);

      if (dataBytes.length % CryptoUtils.AES_BLOCK_SIZE !== 0) {
        throw new EncryptionException(
          `Ciphertext length ${dataBytes.length} not multiple of ${CryptoUtils.AES_BLOCK_SIZE}`
        );
      }

      const decipher = crypto.createDecipheriv(
        `aes-${keyBuf.length * 8}-ecb`,
        keyBuf,
        null
      );
      decipher.setAutoPadding(false);
      const decrypted = Buffer.concat([decipher.update(dataBytes), decipher.final()]);
      dataBytes = Buffer.from(this.pkcs7Unpad(decrypted));
    }

    return dataBytes.toString('utf8');
  }

  /* =========================================
   * RSA Sign (SHA1)
   * ========================================= */

  public static signRsaSha1(data: string, privateKey: crypto.KeyObject | string): string {
    const sign = crypto.createSign('RSA-SHA1');
    sign.update(data);
    sign.end();
    const signature = sign.sign(privateKey);
    return signature.toString('base64');
  }

  /* =========================================
   * Global Info Builder
   * ========================================= */

  public static buildGlobalInfo(
    interfaceCode: string,
    tin: string,
    deviceNo: string,
    brn = '',
    user = 'admin',
    longitude = '32.5825',
    latitude = '0.3476',
    taxpayerId = ''
  ): Record<string, any> {
    return {
      appId: 'AP04',
      version: '1.1.20191201',
      dataExchangeId: crypto.randomBytes(16).toString('hex').toUpperCase(),
      interfaceCode,
      requestCode: 'TP',
      requestTime: TimeUtils.getUgandaTimestamp(),
      responseCode: 'TA',
      userName: user,
      deviceMAC: 'FFFFFFFFFFFF',
      deviceNo,
      tin,
      brn,
      taxpayerID: taxpayerId || '1',
      longitude,
      latitude,
      agentType: '0',
      extendField: {
        responseDateFormat: 'dd/MM/yyyy',
        responseTimeFormat: 'dd/MM/yyyy HH:mm:ss',
        referenceNo: '',
        operatorName: user,
        offlineInvoiceException: {
          errorCode: '',
          errorMsg: ''
        }
      }
    };
  }

  /* =========================================
   * Encrypted Request Builder
   * ========================================= */

  public static buildEncryptedRequest(
    content: Record<string, any>,
    aesKey: string,
    interfaceCode: string,
    tin: string,
    deviceNo: string,
    brn: string,
    privateKey: crypto.KeyObject | string,
    taxpayerId = ''
  ): Record<string, any> {
    const jsonContent = JSON.stringify(content);
    const encrypted = this.encryptAesEcb(jsonContent, aesKey);
    const signature = this.signRsaSha1(encrypted, privateKey);

    return {
      data: {
        content: encrypted,
        signature,
        dataDescription: {
          codeType: '1',
          encryptCode: '2',
          zipCode: '0'
        }
      },
      globalInfo: this.buildGlobalInfo(interfaceCode, tin, deviceNo, brn, 'admin', '32.5825', '0.3476', taxpayerId),
      returnStateInfo: {
        returnCode: '',
        returnMessage: ''
      }
    };
  }

  /* =========================================
   * Unencrypted Request Builder
   * ========================================= */

  public static buildUnencryptedRequest(
    content: Record<string, any>,
    interfaceCode: string,
    tin: string,
    deviceNo: string,
    brn = '',
    privateKey?: crypto.KeyObject | string,
    taxpayerId = ''
  ): Record<string, any> {
    let contentB64 = '';
    let signature = '';

    if (content && Object.keys(content).length > 0) {
      const jsonContent = JSON.stringify(content);
      contentB64 = Buffer.from(jsonContent).toString('base64');
      if (privateKey) signature = this.signRsaSha1(contentB64, privateKey);
    }
    console.log('Unencrypted request content (base64):', contentB64);
    return {
      data: {
        content: contentB64,
        signature,
        dataDescription: {
          codeType: '0',
          encryptCode: '1',
          zipCode: '0'
        }
      },
      globalInfo: this.buildGlobalInfo(interfaceCode, tin, deviceNo, brn, 'admin', '32.5825', '0.3476', taxpayerId),
      returnStateInfo: {
        returnCode: '',
        returnMessage: ''
      }
    };
  }

  /* =========================================
   * Unwrap API Response
   * ========================================= */

  public static unwrapResponse(responseJson: Record<string, any>, aesKey?: string): Record<string, any> {
    const dataSection = responseJson.data || {};
    const contentB64 = dataSection.content || '';

    if (!contentB64) return responseJson;

    const dataDesc = dataSection.dataDescription || {};
    const codeType = dataDesc.codeType || '0';
    const encryptCode = dataDesc.encryptCode || '0';
    const zipCode = dataDesc.zipCode || '0';

    try {
      let contentStr: string;

      if (codeType === '1') {
        if (!aesKey) throw new EncryptionException('Encrypted response but no AES key provided');
        contentStr = this.decryptAesEcb(contentB64, aesKey, encryptCode, zipCode);
      } else {
        let decodedBytes = Buffer.from(contentB64, 'base64');
        if (zipCode === '1') decodedBytes = Buffer.from(zlib.gunzipSync(decodedBytes));
        contentStr = decodedBytes.toString('utf8');
      }

      const decodedContent = JSON.parse(contentStr);
      responseJson.data.content = decodedContent;
    } catch (e: any) {
      throw new EncryptionException('Response processing failed: ' + e.message);
    }

    return responseJson;
  }
}