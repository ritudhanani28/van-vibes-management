import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportApi, ExportRequest } from '@/api/export';

describe('Export API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).document;
  });

  it('should send correct preview payload and receive counts', async () => {
    const mockPreviewData = {
      counts: { orders: 15, bills: 12 },
      total_records: 27,
      date_range_label: 'last-7-days',
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockPreviewData,
    });
    global.fetch = mockFetch;

    const request: ExportRequest = {
      categories: ['orders', 'bills'],
      dateRange: 'last_7_days',
      filters: { orderStatus: 'COMPLETED' },
    };

    const result = await exportApi.preview(request);
    expect(result.total_records).toBe(27);
    expect(result.counts.orders).toBe(15);
    expect(result.counts.bills).toBe(12);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toContain('/api/v1/export/preview');
    expect(JSON.parse(callArgs[1].body)).toEqual(request);
  });

  it('should trigger browser download on successful export response', async () => {
    const mockBlob = new Blob(['Item ID,Name\nst-01,Test'], { type: 'text/csv' });
    const mockHeaders = new Headers();
    mockHeaders.set('content-disposition', 'attachment; filename="van-vibes-menu-items-all-time.csv"');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: mockHeaders,
      blob: async () => mockBlob,
    });
    global.fetch = mockFetch;

    const mockElement = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    const mockAppendChild = vi.fn();
    const mockRemoveChild = vi.fn();
    const mockCreateObjectURL = vi.fn().mockReturnValue('blob:http://localhost/test-uuid');
    const mockRevokeObjectURL = vi.fn();

    (globalThis as any).window = {
      location: {
        hostname: 'localhost',
        protocol: 'http:',
      },
      URL: {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL,
      },
    };
    (globalThis as any).document = {
      createElement: vi.fn().mockReturnValue(mockElement),
      body: {
        appendChild: mockAppendChild,
        removeChild: mockRemoveChild,
      },
    };

    const request: ExportRequest = {
      categories: ['menu_items'],
      dateRange: 'all_time',
    };

    const result = await exportApi.download(request);
    expect(result.success).toBe(true);
    expect(result.filename).toBe('van-vibes-menu-items-all-time.csv');
    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    expect(mockRevokeObjectURL).toHaveBeenCalledTimes(1);
    expect(mockAppendChild).toHaveBeenCalledTimes(1);
    expect(mockRemoveChild).toHaveBeenCalledTimes(1);
    expect(mockElement.click).toHaveBeenCalledTimes(1);
  });

  it('should throw clear error on export failure or empty results', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ detail: 'No records match the selected export criteria.' }),
    });
    global.fetch = mockFetch;

    const request: ExportRequest = {
      categories: ['orders'],
      dateRange: 'last_1_day',
    };

    await expect(exportApi.download(request)).rejects.toThrow(
      'No records match the selected export criteria.'
    );
  });
});
