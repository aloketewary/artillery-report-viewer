export type ReportValidationCode =
  | 'invalid-json'
  | 'invalid-root'
  | 'invalid-file-type'
  | 'file-too-large'
  | 'unsupported-format'
  | 'unsupported-schema'
  | 'missing-report-data';

const REPORT_VALIDATION_MESSAGES: Record<ReportValidationCode, string> = {
  'invalid-json': 'This file is not valid JSON.',
  'invalid-root': 'Report must contain a JSON object.',
  'invalid-file-type': 'Please select an Artillery JSON report.',
  'file-too-large': 'This file is too large to process in the browser.',
  'unsupported-format': "PerfLens couldn't identify this performance report format.",
  'unsupported-schema': "This looks like JSON, but it isn't a supported Artillery report.",
  'missing-report-data': 'Report data is missing.',
};

export class ReportValidationError extends Error {
  readonly code: ReportValidationCode;

  constructor(code: ReportValidationCode, cause?: unknown, messageOverride?: string) {
    super(messageOverride ?? REPORT_VALIDATION_MESSAGES[code]);
    this.name = 'ReportValidationError';
    this.code = code;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

export function reportValidationMessage(error: unknown, fallback: string): string {
  return error instanceof ReportValidationError ? error.message : fallback;
}

export function formatFileSize(bytes: number): string {
  const mebibyte = 1024 * 1024;
  return Number.isInteger(bytes / mebibyte)
    ? `${bytes / mebibyte} MiB`
    : `${Math.round(bytes / 1024)} KiB`;
}

export function fileTooLargeMessage(maxBytes: number): string {
  return `This file is too large to process in the browser. Choose a JSON report that is ${formatFileSize(maxBytes)} or smaller.`;
}
