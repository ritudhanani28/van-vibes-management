import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient, getApiBaseUrl } from '@/api/client';

describe('API Client Infrastructure', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should export a valid base URL', () => {
    const baseUrl = getApiBaseUrl();
    expect(baseUrl).toBeDefined();
    expect(typeof baseUrl).toBe('string');
  });

  it('should normalize and construct correct endpoint URLs', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, count: 5 }),
    });
    global.fetch = mockFetch;

    const result = await apiClient<{ success: boolean; count: number }>('/tables');
    expect(result.success).toBe(true);
    expect(result.count).toBe(5);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('/tables');
  });

  it('should throw parsed detail message on HTTP failure', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => JSON.stringify({ detail: 'Order not found' }),
    });
    global.fetch = mockFetch;

    await expect(apiClient('/orders/999')).rejects.toThrow('Order not found');
  });
});
