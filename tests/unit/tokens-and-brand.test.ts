import { describe, it, expect } from 'vitest';
import { DESIGN_TOKENS } from '@/constants/tokens';
import { CAFE_BRAND } from '@/constants/brand';

describe('Design Tokens & Brand Constants', () => {
  it('should define authoritative brand color palette matching globals.css', () => {
    expect(DESIGN_TOKENS.colors.green.DEFAULT).toBe('#18312B');
    expect(DESIGN_TOKENS.colors.green.deep).toBe('#0E1F1B');
    expect(DESIGN_TOKENS.colors.beige.DEFAULT).toBe('#F5E9D3');
    expect(DESIGN_TOKENS.colors.gold.DEFAULT).toBe('#C8A25D');
    expect(DESIGN_TOKENS.colors.terracotta.DEFAULT).toBe('#D96B43');
  });

  it('should provide status badges for all order states', () => {
    const statuses = ['placed', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'] as const;
    statuses.forEach((st) => {
      expect(DESIGN_TOKENS.colors.status[st]).toBeDefined();
      expect(DESIGN_TOKENS.colors.status[st].bg).toMatch(/^#/);
      expect(DESIGN_TOKENS.colors.status[st].text).toMatch(/^#/);
      expect(DESIGN_TOKENS.colors.status[st].border).toMatch(/^#/);
    });
  });

  it('should define typography and radius scales', () => {
    expect(DESIGN_TOKENS.typography.fontSans).toContain('General Sans');
    expect(DESIGN_TOKENS.typography.fontMono).toContain('JetBrains Mono');
    expect(DESIGN_TOKENS.radius.md).toBe('0.5rem');
    expect(DESIGN_TOKENS.radius.full).toBe('9999px');
  });

  it('should define valid cafe brand information', () => {
    expect(CAFE_BRAND.id).toBe('van-vibes');
    expect(CAFE_BRAND.name).toBe('Vaan Vibes Cafe & Restro');
    expect(CAFE_BRAND.currency).toBe('₹');
    expect(CAFE_BRAND.taxRate).toBe(0.05);
    expect(CAFE_BRAND.gstin).toMatch(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{3}$/);
  });
});
