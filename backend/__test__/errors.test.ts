/**
 * Tests for errors.ts — custom error classes and helpers
 */

// ── Inline error classes (mirrors src/utils/errors.ts) ───────────────────

class AppError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
    this.name = "NotFoundError";
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = "BadRequestError";
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
    this.name = "ConflictError";
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred";
}

function getErrorStatusCode(error: unknown): number {
  if (error instanceof AppError) return error.statusCode;
  return 500;
}

// ─────────────────────────────────────────────────────────────────────────────
// AppError
// ─────────────────────────────────────────────────────────────────────────────

describe("AppError", () => {
  it("sets message and default statusCode 500", () => {
    const err = new AppError("generic error");
    expect(err.message).toBe("generic error");
    expect(err.statusCode).toBe(500);
    expect(err.name).toBe("AppError");
  });

  it("accepts custom statusCode", () => {
    const err = new AppError("custom", 418);
    expect(err.statusCode).toBe(418);
  });

  it("is instanceof Error", () => {
    expect(new AppError("x")).toBeInstanceOf(Error);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NotFoundError
// ─────────────────────────────────────────────────────────────────────────────

describe("NotFoundError", () => {
  it("formats message as '<resource> not found'", () => {
    const err = new NotFoundError("Room");
    expect(err.message).toBe("Room not found");
  });

  it("has statusCode 404", () => {
    expect(new NotFoundError("Player").statusCode).toBe(404);
  });

  it("is instanceof AppError and Error", () => {
    const err = new NotFoundError("Session");
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
  });

  it("name is NotFoundError", () => {
    expect(new NotFoundError("X").name).toBe("NotFoundError");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BadRequestError
// ─────────────────────────────────────────────────────────────────────────────

describe("BadRequestError", () => {
  it("stores message correctly", () => {
    const err = new BadRequestError("Invalid input");
    expect(err.message).toBe("Invalid input");
  });

  it("has statusCode 400", () => {
    expect(new BadRequestError("bad").statusCode).toBe(400);
  });

  it("name is BadRequestError", () => {
    expect(new BadRequestError("x").name).toBe("BadRequestError");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ForbiddenError
// ─────────────────────────────────────────────────────────────────────────────

describe("ForbiddenError", () => {
  it("has default message 'Forbidden'", () => {
    expect(new ForbiddenError().message).toBe("Forbidden");
  });

  it("accepts custom message", () => {
    expect(new ForbiddenError("Host only").message).toBe("Host only");
  });

  it("has statusCode 403", () => {
    expect(new ForbiddenError().statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UnauthorizedError
// ─────────────────────────────────────────────────────────────────────────────

describe("UnauthorizedError", () => {
  it("has default message 'Unauthorized'", () => {
    expect(new UnauthorizedError().message).toBe("Unauthorized");
  });

  it("has statusCode 401", () => {
    expect(new UnauthorizedError().statusCode).toBe(401);
  });

  it("accepts custom message", () => {
    expect(new UnauthorizedError("Token required").message).toBe("Token required");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ConflictError
// ─────────────────────────────────────────────────────────────────────────────

describe("ConflictError", () => {
  it("stores message", () => {
    expect(new ConflictError("Seat taken").message).toBe("Seat taken");
  });

  it("has statusCode 409", () => {
    expect(new ConflictError("x").statusCode).toBe(409);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getErrorMessage
// ─────────────────────────────────────────────────────────────────────────────

describe("getErrorMessage", () => {
  it("extracts message from Error instance", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("extracts message from AppError subclass", () => {
    expect(getErrorMessage(new NotFoundError("Room"))).toBe("Room not found");
  });

  it("returns string directly if string is passed", () => {
    expect(getErrorMessage("something went wrong")).toBe("something went wrong");
  });

  it("returns default message for unknown types", () => {
    expect(getErrorMessage(42)).toBe("An unexpected error occurred");
    expect(getErrorMessage(null)).toBe("An unexpected error occurred");
    expect(getErrorMessage(undefined)).toBe("An unexpected error occurred");
    expect(getErrorMessage({ code: 500 })).toBe("An unexpected error occurred");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getErrorStatusCode
// ─────────────────────────────────────────────────────────────────────────────

describe("getErrorStatusCode", () => {
  it("returns statusCode from AppError", () => {
    expect(getErrorStatusCode(new BadRequestError("x"))).toBe(400);
  });

  it("returns 404 for NotFoundError", () => {
    expect(getErrorStatusCode(new NotFoundError("Room"))).toBe(404);
  });

  it("returns 403 for ForbiddenError", () => {
    expect(getErrorStatusCode(new ForbiddenError())).toBe(403);
  });

  it("defaults to 500 for plain Error", () => {
    expect(getErrorStatusCode(new Error("boom"))).toBe(500);
  });

  it("defaults to 500 for non-Error values", () => {
    expect(getErrorStatusCode("oops")).toBe(500);
    expect(getErrorStatusCode(null)).toBe(500);
  });
});
