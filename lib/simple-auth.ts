export const VALID_EMAIL = 'content@wedosoft.net';
export const VALID_PASSWORD = 'wedosoft0527';

export const SESSION_COOKIE_NAME = 'cf_session';
export const SESSION_TOKEN = 'wedosoft_session_token';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function validateCredentials(email: string, password: string): boolean {
  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedPassword = password?.trim();

  return normalizedEmail === VALID_EMAIL && normalizedPassword === VALID_PASSWORD;
}

export function isValidSession(cookieValue?: string): boolean {
  return cookieValue === SESSION_TOKEN;
}

export function getAuthenticatedUser() {
  return { email: VALID_EMAIL };
}
