/**
 * Production-ready validation utilities for Vaan Vibes.
 * Authoritative client-side validation rules matching backend constraints.
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^\d{10}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone.trim());
}

export function sanitizePhone(input: string): string {
  return input.replace(/\D/g, '').slice(0, 10);
}

export function validateEmailField(email: string, required = true): string | null {
  const trimmed = email.trim();
  if (!trimmed) {
    return required ? 'Please enter your email.' : null;
  }
  if (!isValidEmail(trimmed)) {
    return 'Please enter a valid email address';
  }
  return null;
}

export function validatePhoneField(phone: string, required = true): string | null {
  const digits = phone.trim();
  if (!digits) {
    return required ? 'Please enter your phone number.' : null;
  }
  if (!isValidPhone(digits)) {
    return 'Phone number must contain exactly 10 digits';
  }
  return null;
}

export function validatePasswordField(
  password: string,
  options?: { minLength?: number; complex?: boolean }
): string | null {
  if (!password) {
    return 'Please enter your password.';
  }
  const minLength = options?.minLength ?? 6;
  if (password.length < minLength) {
    return `Password must be at least ${minLength} characters`;
  }
  if (options?.complex) {
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*()_+\-=\[\]{};':"\|,.<>/?]/.test(password)) {
      return 'Password must contain uppercase, lowercase, number, and special character';
    }
  }
  return null;
}
