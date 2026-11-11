export class HttpError extends Error {
  constructor(
    message: string,
    readonly code: number,
    readonly status = 0,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
