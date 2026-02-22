import { ReturnStateInfo, GlobalInfo, Data } from "./schemas";

/**
 * API response envelope
 */
export class ApiEnvelope {
  public data: Data;
  public globalInfo: GlobalInfo;
  public returnStateInfo: ReturnStateInfo;

  constructor(
    data: Data,
    globalInfo: GlobalInfo,
    returnStateInfo: ReturnStateInfo
  ) {
    this.data = data;
    this.globalInfo = globalInfo;
    this.returnStateInfo = returnStateInfo;
  }
}