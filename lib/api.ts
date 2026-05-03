import { NextResponse } from "next/server";

export type ApiError = {
  error: string;
  code?: string;
};

/**
 * Return a typed JSON error response.
 */
export function apiError(
  message: string,
  status: number,
  code?: string
): NextResponse<ApiError> {
  return NextResponse.json({ error: message, code }, { status });
}

/**
 * Return a 401 Unauthorized response.
 */
export const unauthorized = () =>
  apiError("Unauthorized", 401, "UNAUTHORIZED");

/**
 * Return a 404 Not Found response.
 */
export const notFound = (resource = "Resource") =>
  apiError(`${resource} not found`, 404, "NOT_FOUND");

/**
 * Return a 400 Bad Request response.
 */
export const badRequest = (message: string) =>
  apiError(message, 400, "BAD_REQUEST");
