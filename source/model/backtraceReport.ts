// tslint:disable-next-line: no-var-requires
const packageJson = require('./../../package.json');

import { IBacktraceData } from '@src/model/backtraceData';
import { BacktraceStackTrace } from '@src/model/backtraceStackTrace';
import { pageStartTime } from '..';

const crypto = window.crypto;
/**
 * BacktraceReport describe current exception/message payload message to Backtrace
 */
export class BacktraceReport {
  // reprot id
  public readonly uuid: string = this.generateUuid();
  // timestamp
  public readonly timestamp: number = Math.floor(new Date().getTime() / 1000);
  // lang
  public readonly lang = 'js';
  // environment version
  public readonly langVersion = navigator.userAgent;
  // Backtrace-ndoe name
  public readonly agent = packageJson.name;
  // Backtrace-node  version
  public readonly agentVersion = packageJson.version;
  // main thread name
  public readonly mainThread = 'default';

  public classifiers: string[] = [];

  /**
   * @deprecated
   * Please use client.sendReport instead
   * BacktraceReport generated by library allows you to
   * automatically send reports to Backtrace via send method
   */
  public send!: (callback: (err?: Error) => void) => void | undefined;

  /**
   * @deprecated
   * Please use client.sendReport instead
   * BacktraceReport generated by library allows you to
   * automatically send reports to Backtrace via send method
   */
  public sendSync!: (callback: (err?: Error) => void) => void | undefined;

  /**
   * Thread information about current application
   */
  public stackTrace!: BacktraceStackTrace;

  /**
   * Current report attributes
   */
  private attributes: { [index: string]: any } = {};

  /**
   * Backtrace complex objet
   */
  private annotations: { [index: string]: any } = {};

  private tabWidth: number = 8;
  private contextLineCount: number = 200;

  /**
   * Create new BacktraceReport - report information that will collect information
   * for Backtrace.
   *
   * Possible existing scenarios:
   * arg1: error + arg2: attributes = all required
   * arg1: object, arg2: nothing
   *
   * @param err Error or message - content to report
   * @param attributes Report attributes dictionary
   */
  constructor(private err: Error | string = '', private clientAttributes: { [index: string]: any } = {}) {
    if (!clientAttributes) {
      clientAttributes = {};
    }
    this.splitAttributesFromAnnotations(clientAttributes);
    this.setError(err);
  }
  /**
   * Check if report contains exception information
   */
  public isExceptionTypeReport(): boolean {
    return this.detectReportType(this.err);
  }

  public getPayload(): Error | string {
    return this.err;
  }
  /**
   * Set error or message in BacktraceReport object
   * @param err Current error
   */
  public setError(err: Error | string): void {
    this.err = err;
    this.classifiers = this.detectReportType(err) ? [err.name] : [];
  }

  /**
   * @deprecated
   * Please don't use log method in new BacktraceReport object.
   */
  public log() {
    console.warn('log method is deprecated.');
  }

  /**
   * @deprecated
   * Please don't use trace method in new BacktraceReport object
   */
  public trace() {
    console.warn('trace method is deprecated.');
  }

  /**
   * Add new attributes to existing report attributes
   * @param attributes new report attributes object
   */
  public addObjectAttributes(attributes: { [index: string]: any }): void {
    this.clientAttributes = {
      ...this.clientAttributes,
      ...this.attributes,
      ...attributes,
    };
  }

  public addAttribute(key: string, value: any): void {
    this.clientAttributes[key] = value;
  }

  public addAnnotation(key: string, value: object): void {
    this.annotations[key] = value;
  }

  public async toJson(): Promise<IBacktraceData> {
    // why library should wait to retrieve source code data?
    // architecture decision require to pass additional parameters
    // not in constructor, but in additional method.
    await this.collectReportInformation();

    return {
      uuid: this.uuid,
      timestamp: this.timestamp,
      lang: this.lang,
      langVersion: this.langVersion,
      mainThread: this.mainThread,
      classifiers: this.classifiers,
      threads: { main: this.stackTrace.toJson() },
      agent: this.agent,
      agentVersion: this.agentVersion,
      annotations: this.annotations,
      attributes: this.attributes,
      sourceCode: this.stackTrace.getSourceCode(),
    };
  }

  public setSourceCodeOptions(tabWidth: number, contextLineCount: number) {
    this.tabWidth = tabWidth;
    this.contextLineCount = contextLineCount;
  }

  private async collectReportInformation(): Promise<void> {
    // get stack trace to retrieve calling module information
    this.stackTrace = new BacktraceStackTrace(this.err);
    this.stackTrace.setSourceCodeOptions(this.tabWidth, this.contextLineCount);
    await this.stackTrace.parseStackFrames();

    // combine attributes
    this.attributes = {
      ...this.readBuiltInAttributes(),
      ...this.clientAttributes,
    };
    // combine annotations
    this.annotations = this.readAnnotation();
  }

  private readBuiltInAttributes(): object {
    return {
      ...this.readAttributes(),
      ...this.readErrorAttributes(),
    };
  }

  private detectReportType(err: Error | string): err is Error {
    return err instanceof Error;
  }

  private generateUuid(): string {
    const uuidArray = new Uint8Array(16);
    crypto.getRandomValues(uuidArray);
    const hexStr = (b: number) => {
      const s = b.toString(16);
      return b < 0x10 ? '0' + s : s;
    };
    let result = '';
    let i = 0;
    for (; i < 4; i += 1) {
      result += hexStr(uuidArray[i]);
    }
    result += '-';
    for (; i < 6; i += 1) {
      result += hexStr(uuidArray[i]);
    }
    result += '-';
    for (; i < 8; i += 1) {
      result += hexStr(uuidArray[i]);
    }
    result += '-';
    for (; i < 10; i += 1) {
      result += hexStr(uuidArray[i]);
    }
    result += '-';
    for (; i < 16; i += 1) {
      result += hexStr(uuidArray[i]);
    }
    return result;
  }

  private readErrorAttributes(): object {
    if (!this.detectReportType(this.err)) {
      return {
        'error.message': this.err,
      };
    }
    this.classifiers = [this.err.name];
    return {
      'error.message': this.err.message,
    };
  }

  private readAttributes(): object {
    return {
      'process.age': Math.floor((new Date().getTime() - pageStartTime.getTime()) / 1000),
      hostname: window.location && window.location.hostname,
      referer: window.location && window.location.href,
      'user.agent': navigator.userAgent,
      'location.port': document.location.port,
      'location.protocol': document.location.protocol,
      'location.origin': window.location.origin,
      'location.href': window.location.href || document.URL,
      language: navigator.language,
      'browser.appversion': navigator.appVersion,
      'browser.platform': navigator.platform,
      'browser.vendor': navigator.vendor,
      'browser.version': navigator.appVersion,
      'browser.userAgent': navigator.userAgent,
      'window.outerHeight': window.outerHeight,
      'window.outerWidth': window.outerWidth,
      'window.pageXOffset': window.pageXOffset,
      'window.pageYOffset': window.pageYOffset,
      'window.screenX': window.screenX,
      'window.screenY': window.screenY,
      'window.screenLeft': window.screenLeft,
      'window.screenTop': window.screenTop,
    };
  }

  private readAnnotation(): object {
    const result: { [index: string]: any } = {};

    if (this.detectReportType(this.err)) {
      result['Exception'] = this.err;
    }
    return { ...result, ...this.annotations, ...navigator.geolocation, ...window.screen };
  }

  private splitAttributesFromAnnotations(clientAttributes: { [index: string]: any }) {
    for (const key in clientAttributes) {
      if (clientAttributes.hasOwnProperty(key)) {
        const element = this.clientAttributes[key];
        if (!element) {
          continue;
        }
        if (typeof element === 'object') {
          this.annotations[key] = element;
        } else {
          this.attributes[key] = element;
        }
      }
    }
  }
}
