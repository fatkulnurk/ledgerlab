/** Typed application errors mapped to HTTP status codes by the API layer. */
export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super("VALIDATION_ERROR", message, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super("NOT_FOUND", message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message, 409);
  }
}

/** Raised when a journal entry's debits and credits do not net to zero. */
export class UnbalancedEntryError extends AppError {
  constructor(
    message: string,
    readonly totalMinor: number,
  ) {
    super("UNBALANCED_ENTRY", message, 422, { totalMinor });
  }
}
