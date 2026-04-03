export class FailedError extends Error {
  constructor(msg: string) {
    super('FailedError: ' + msg);
  }
}

export class NetworkError extends Error {
  constructor(msg: string) {
    super('NetworkError: ' + msg);
  }
}

export class UnexpectedApiError extends Error {
  constructor(msg: string) {
    super('UnexpectedApiError: ' + msg);
  }
}

export interface ErrorHandler<HandlerReturnType, ErrorType = unknown> {
  (error: ErrorType): HandlerReturnType;
}
