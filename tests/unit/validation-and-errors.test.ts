import { describe, it, expect, vi } from 'vitest';
import { ApiError, apiClient } from '../../src/api/client';

describe('Production Error and Validation System', () => {
  it('ApiError extracts fieldErrors directly from fieldErrors object', () => {
    const raw = {
      success: false,
      statusCode: 422,
      message: 'Validation failed',
      fieldErrors: {
        contact_number: 'Phone number must contain exactly 10 digits',
        email: 'Please enter a valid email address',
      },
    };

    const err = new ApiError('Validation failed', 422, raw);
    expect(err.statusCode).toBe(422);
    expect(err.fieldErrors['contact_number']).toBe('Phone number must contain exactly 10 digits');
    expect(err.fieldErrors['email']).toBe('Please enter a valid email address');
  });

  it('ApiError extracts fieldErrors from backend errors array', () => {
    const raw = {
      success: false,
      statusCode: 422,
      message: 'Validation failed',
      errors: [
        { field: 'customer_mobile', message: 'Phone number must contain exactly 10 digits' },
        { field: 'customer_name', message: 'Name must be at least 2 characters' },
      ],
    };

    const err = new ApiError('Validation failed', 422, raw);
    expect(err.statusCode).toBe(422);
    expect(err.fieldErrors['customer_mobile']).toBe('Phone number must contain exactly 10 digits');
    expect(err.fieldErrors['customer_name']).toBe('Name must be at least 2 characters');
  });

  it('apiClient throws friendly ApiError on network connection failure', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    try {
      await expect(apiClient('/test-endpoint')).rejects.toThrow(
        'Unable to connect to the server. Please try again.'
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('Strict 10-digit phone number validation rules', () => {
    const isValidPhone = (num: string): boolean => /^\d{10}$/.test(num.trim());

    // Valid
    expect(isValidPhone('9876543210')).toBe(true);

    // Invalid: less than 10 digits
    expect(isValidPhone('987654321')).toBe(false);

    // Invalid: more than 10 digits
    expect(isValidPhone('98765432101')).toBe(false);

    // Invalid: alphabets
    expect(isValidPhone('98765abc10')).toBe(false);

    // Invalid: hyphens
    expect(isValidPhone('987-654-3210')).toBe(false);

    // Invalid: country code prefix with plus
    expect(isValidPhone('+919876543210')).toBe(false);

    // Invalid: spaces
    expect(isValidPhone('98765 43210')).toBe(false);
  });
});
