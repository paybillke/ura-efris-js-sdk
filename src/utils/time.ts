import { DateTime } from 'luxon';

export class TimeUtils {
  private static readonly UG_TZ = 'Africa/Kampala';

  /**
   * Get current timestamp in Uganda timezone (yyyy-MM-dd HH:mm:ss)
   */
  public static getUgandaTimestamp(): string {
    return DateTime.now().setZone(this.UG_TZ).toFormat('yyyy-MM-dd HH:mm:ss');
  }

  /**
   * Get current timestamp in Uganda timezone (dd/MM/yyyy HH:mm:ss)
   */
  public static getUgandaTimestampDdmmyyyy(): string {
    return DateTime.now().setZone(this.UG_TZ).toFormat('dd/MM/yyyy HH:mm:ss');
  }

  /**
   * Get current date in Uganda timezone (YYYYMMDD)
   */
  public static getUgandaDateYyyymmdd(): string {
    return DateTime.now().setZone(this.UG_TZ).toFormat('yyyyLLdd');
  }

  /**
   * Validate that client and server times are synchronized within tolerance.
   * Accepts both yyyy-MM-dd HH:mm:ss and dd/MM/yyyy HH:mm:ss formats.
   */
  public static validateTimeSync(
    clientTime: string,
    serverTime: string,
    toleranceMinutes = 10
  ): boolean {
    const formats = ['yyyy-MM-dd HH:mm:ss', 'dd/MM/yyyy HH:mm:ss'];

    const parseTime = (timeStr: string): DateTime | null => {
      for (const fmt of formats) {
        const dt = DateTime.fromFormat(timeStr, fmt, { zone: this.UG_TZ });
        if (dt.isValid && dt.toFormat(fmt) === timeStr) {
          return dt;
        }
      }
      return null;
    };

    const clientDt = parseTime(clientTime);
    const serverDt = parseTime(serverTime);

    if (!clientDt || !serverDt) return false;

    const diffSeconds = Math.abs(serverDt.toSeconds() - clientDt.toSeconds());
    return diffSeconds <= toleranceMinutes * 60;
  }
}