import { describe, it, expect } from 'vitest';
import { MENU_CATEGORIES } from '@/features/menu/constants/categories';

describe('Menu Categories Configuration', () => {
  it('should contain the "all" category as the first entry', () => {
    expect(MENU_CATEGORIES.length).toBeGreaterThan(5);
    expect(MENU_CATEGORIES[0].id).toBe('all');
    expect(MENU_CATEGORIES[0].slug).toBe('all');
  });

  it('should have valid id, name, and slug for each category', () => {
    MENU_CATEGORIES.forEach((cat) => {
      expect(cat.id).toBeTruthy();
      expect(cat.name).toBeTruthy();
      expect(cat.slug).toBeTruthy();
      expect(typeof cat.page).toBe('number');
    });
  });

  it('should contain essential cafe categories', () => {
    const slugs = MENU_CATEGORIES.map((c) => c.slug);
    expect(slugs).toContain('hot-coffee');
    expect(slugs).toContain('iced-coffee');
    expect(slugs).toContain('pasta');
    expect(slugs).toContain('pizza');
    expect(slugs).toContain('dessert');
  });
});
