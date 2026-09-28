'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MENU_CATEGORIES, MENU_ITEMS } from '@/data/vaan-vibes-menu';
import { Search, Sparkles, Filter, UtensilsCrossed } from 'lucide-react';

export default function MenuItemsAdminPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = MENU_ITEMS.filter((item) => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      item.name.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  });

  return (
    <AppLayout requiredRole="ADMIN">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-brand-green tracking-tight">
              Menu Catalog Administration
            </h1>
            <p className="text-xs text-brand-green/70 mt-0.5">
              Live inventory of 19 food & beverage categories from the official cafe menu.
            </p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl border border-brand-beige-dark p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-72 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-green/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-brand-beige-dark text-xs text-brand-green placeholder:text-brand-green/40 focus:outline-none focus:ring-2 focus:ring-brand-green min-h-[40px]"
            />
          </div>

          <div className="w-full sm:w-64">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark text-xs text-brand-green bg-white focus:outline-none focus:ring-2 focus:ring-brand-green min-h-[40px]"
            >
              <option value="all">All Categories ({MENU_ITEMS.length} dishes)</option>
              {MENU_CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name} ({MENU_ITEMS.filter((i) => i.category === c.slug).length})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-brand-beige-dark p-4 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded border border-emerald-600 p-0.5 flex items-center justify-center bg-emerald-50 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    </span>
                    {item.popular && (
                      <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> Popular
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-brand-green/60 uppercase font-mono">
                    {item.category.replace('-', ' ')}
                  </span>
                </div>

                <h3 className="font-extrabold text-sm sm:text-base text-brand-green">
                  {item.name}
                </h3>
                {item.description && (
                  <p className="text-xs text-brand-green/70 line-clamp-2 mt-1">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="pt-3 mt-3 border-t border-brand-beige-dark/50 flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-brand-green/40">
                  Base Price
                </span>
                <span className="font-mono font-black text-base text-brand-green">
                  ₹{item.price}/-
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
