'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MENU_CATEGORIES } from '@/features/menu/constants/categories';
import { MenuCategory, MenuItem } from '@/types/cafe';
import { menuApi } from '@/api/menu';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { wsManager } from '@/services/websocket/WebSocketManager';
import {
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  X,
  CheckCircle2,
  ChevronDown,
  Check,
} from 'lucide-react';

const sortMenuItemsAlphabetically = (menuItems: MenuItem[]): MenuItem[] => {
  const seen = new Set<string>();
  const uniqueItems: MenuItem[] = [];
  for (const item of menuItems) {
    if (item && item.id) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        uniqueItems.push(item);
      }
    } else if (item) {
      uniqueItems.push(item);
    }
  }
  return uniqueItems.sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base', numeric: true })
  );
};

export default function MenuItemsAdminPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>(MENU_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Custom Category Dropdown State
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [categorySearchText, setCategorySearchText] = useState("");
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Modal States
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Form State for Adding Item
  const [newItemForm, setNewItemForm] = useState({
    name: "",
    category: "hot-coffee",
    price: 150,
    description: "",
    isVeg: true,
    popular: false,
  });


  useEffect(() => {
    let active = true;
    Promise.all([
      menuApi.getCategories().catch(() => []),
      menuApi.getMenuItems().catch(() => []),
    ]).then(([cats, dishItems]) => {
      if (!active) return;
      if (cats && cats.length > 0) {
        setCategories([
          { id: 'all', name: 'All Items', slug: 'all', icon: '🍽️', page: 0 },
          ...cats,
        ]);
      }
      if (dishItems && dishItems.length > 0) {
        setItems(sortMenuItemsAlphabetically(dishItems));
      }
    }).catch((err) => {
      console.error('Failed to load menu items:', err);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    wsManager.connect();

    const unsubAvail = wsManager.on('MENU_AVAILABILITY_CHANGED', (data: unknown) => {
      const d = data as { itemId?: string; id?: string; isAvailable?: boolean };
      const itemId = d?.itemId || d?.id;
      const isAvailable = d?.isAvailable;
      if (itemId !== undefined && isAvailable !== undefined) {
        setItems((prev) =>
          prev.map((item) => (item.id === itemId ? { ...item, isAvailable } : item))
        );
      }
    });

    const unsubUpdate = wsManager.on('MENU_ITEM_UPDATED', (data: unknown) => {
      const updatedItem = data as MenuItem;
      if (updatedItem?.id) {
        setItems((prev) => {
          const exists = prev.some((item) => item.id === updatedItem.id);
          const next = exists
            ? prev.map((item) => (item.id === updatedItem.id ? { ...item, ...updatedItem } : item))
            : [...prev, updatedItem];
          return sortMenuItemsAlphabetically(next);
        });
      }
    });

    const unsubDelete = wsManager.on('MENU_ITEM_DELETED', (data: unknown) => {
      const d = data as { itemId?: string; id?: string };
      const itemId = d?.itemId || d?.id;
      if (itemId) {
        setItems((prev) => prev.filter((item) => item.id !== itemId));
      }
    });

    return () => {
      unsubAvail();
      unsubUpdate();
      unsubDelete();
    };
  }, []);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-item-menu]')) {
        setActiveDropdownId(null);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDropdownId(null);
        setIsCategoryOpen(false);
        setEditingItem(null);
        setDeletingItem(null);
        setIsAddModalOpen(false);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const triggerFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handleToggleAvailability = async (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const isCurrentlyAvailable = item.isAvailable !== false;
    const nextState = !isCurrentlyAvailable;
    try {
      await menuApi.toggleAvailability(itemId, nextState);
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, isAvailable: nextState } : i))
      );
      triggerFeedback(
        nextState
          ? `"${item.name}" marked as available`
          : `"${item.name}" marked as unavailable`
      );
    } catch (err: unknown) {
      console.error('Failed to toggle availability on backend:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      triggerFeedback(`Failed to update "${item.name}": ${msg}`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    const name = deletingItem.name;
    const idToDelete = deletingItem.id;
    try {
      await menuApi.deleteMenuItem(idToDelete);
      setItems((prev) => prev.filter((i) => i.id !== idToDelete));
      setDeletingItem(null);
      triggerFeedback(`"${name}" removed from menu catalog`);
    } catch (err: unknown) {
      console.error('Failed to delete menu item on backend:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      triggerFeedback(`Failed to delete "${name}": ${msg}`);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const name = editingItem.name;
    try {
      const updated = await menuApi.updateMenuItem(editingItem.id, editingItem);
      const mergedItem = { ...editingItem, ...(updated || {}) };
      setItems((prev) =>
        sortMenuItemsAlphabetically(
          prev.map((i) => (i.id === editingItem.id ? { ...i, ...mergedItem } : i))
        )
      );
      setEditingItem(null);
      triggerFeedback(`"${name}" updated successfully`);
    } catch (err: unknown) {
      console.error('Failed to update dish on backend:', err);
      const msg = err instanceof Error ? err.message : 'Server error';
      triggerFeedback(`Failed to update "${name}": ${msg}`);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemForm.name.trim()) return;

    try {
      const created = await menuApi.createMenuItem({
        name: newItemForm.name.trim(),
        category: String(newItemForm.category),
        price: Math.max(1, Number(newItemForm.price) || 1),
        description: newItemForm.description.trim() || undefined,
        isVeg: newItemForm.isVeg,
        popular: newItemForm.popular,
        isAvailable: true,
      });

      setItems((prev) => {
        const withoutCreated = prev.filter((i) => i.id !== created.id);
        return sortMenuItemsAlphabetically([...withoutCreated, created]);
      });
      triggerFeedback(`"${created.name}" added to menu catalog`);
    } catch {
      // Local fallback
      const newItem: MenuItem = {
        id: `custom-${Date.now()}`,
        name: newItemForm.name.trim(),
        category: String(newItemForm.category),
        price: Math.max(1, Number(newItemForm.price) || 1),
        description: newItemForm.description.trim() || undefined,
        isVeg: newItemForm.isVeg,
        popular: newItemForm.popular,
        isAvailable: true,
      };
      setItems((prev) => {
        const withoutNew = prev.filter((i) => i.id !== newItem.id);
        return sortMenuItemsAlphabetically([...withoutNew, newItem]);
      });
      triggerFeedback(`"${newItem.name}" added to menu catalog`);
    }

    setIsAddModalOpen(false);
    setNewItemForm({
      name: "",
      category: categories[1]?.slug || "hot-coffee",
      price: 150,
      description: "",
      isVeg: true,
      popular: false,
    });
  };

  const filteredItems = useMemo(() => {
    const matched = items.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (item.name || '').toLowerCase().includes(q);
    });
    return sortMenuItemsAlphabetically(matched);
  }, [items, selectedCategory, searchQuery]);

  const currentCategory = categories.find((c) => c.slug === selectedCategory);
  const selectedCategoryCount =
    selectedCategory === "all"
      ? `${items.length} dishes`
      : `${items.filter((i) => i.category === selectedCategory).length} dishes`;

  const filteredCategoryList = categories.filter((c) => {
    if (c.id === "all") return false;
    if (!categorySearchText.trim()) return true;
    return c.name.toLowerCase().includes(categorySearchText.toLowerCase().trim());
  });

  return (
    <AppLayout requiredRole="ADMIN">
      <div className="space-y-5">
        {/* Sticky Action & Filter Bar */}
        <div className="sticky top-[57px] md:top-0 z-30 bg-[#FAF5EC]/98 backdrop-blur-md pt-2 pb-3 -mt-2 space-y-3 border-b border-brand-beige-dark/60 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-brand-green tracking-tight">
                  Menu Catalog
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-green text-brand-beige">
                  {items.length} dishes
                </span>
              </div>
              <p className="text-xs text-brand-green/70 mt-0.5">
                Manage dish inventory, pricing, availability, and item actions
              </p>
            </div>

            {/* Add Item Button */}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              aria-label="Add menu item"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-black text-xs shadow-xs transition-all active:scale-95 shrink-0 min-h-[44px] touch-manipulation"
            >
              <Plus className="w-4 h-4 text-brand-gold" />
              <span>Add Item</span>
            </button>
          </div>

          {/* Search & Category Filter Controls */}
          <div className="bg-white rounded-2xl border border-brand-beige-dark p-3 sm:p-3.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-72 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-green/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by food name..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-brand-beige-dark text-xs text-brand-green placeholder:text-brand-green/40 focus:outline-none focus:ring-2 focus:ring-brand-green min-h-[40px]"
              />
            </div>

            {/* Custom Category Selection Menu */}
            <div className="w-full sm:w-72 relative" ref={categoryDropdownRef}>
              <button
                type="button"
                id="category-dropdown-button"
                aria-haspopup="listbox"
                aria-expanded={isCategoryOpen}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCategoryOpen(!isCategoryOpen);
                }}
                className="w-full px-3.5 py-2 rounded-xl border border-brand-beige-dark bg-white hover:bg-brand-beige-light/40 text-xs font-bold text-brand-green flex items-center justify-between gap-2 shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-brand-green min-h-[40px]"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-base leading-none shrink-0">
                    {selectedCategory === "all" ? "🍽️" : currentCategory?.icon || "☕"}
                  </span>
                  <span className="truncate">
                    {selectedCategory === "all" ? "All Categories" : currentCategory?.name}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-brand-green/10 text-brand-green/70 shrink-0">
                    {selectedCategoryCount}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-brand-green/60 shrink-0 transition-transform duration-200 ${
                    isCategoryOpen ? "rotate-180 text-brand-green" : ""
                  }`}
                />
              </button>

              {/* Custom Category Dropdown Listbox */}
              {isCategoryOpen && (
                <div
                  role="listbox"
                  aria-labelledby="category-dropdown-button"
                  className="absolute right-0 left-0 sm:left-auto sm:w-80 top-11 z-40 bg-white rounded-2xl shadow-xl border border-brand-beige-dark overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-2 border-b border-brand-beige-dark/60 bg-brand-beige-light/40">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-green/40" />
                      <input
                        type="text"
                        value={categorySearchText}
                        onChange={(e) => setCategorySearchText(e.target.value)}
                        placeholder="Filter categories..."
                        className="w-full pl-8 pr-2 py-1.5 rounded-lg border border-brand-beige-dark text-xs text-brand-green placeholder:text-brand-green/40 focus:outline-none focus:ring-1 focus:ring-brand-green bg-white"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto divide-y divide-brand-beige-dark/20 p-1">
                    <button
                      type="button"
                      role="option"
                      aria-selected={selectedCategory === "all"}
                      onClick={() => {
                        setSelectedCategory("all");
                        setIsCategoryOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-bold text-left flex items-center justify-between transition-colors ${
                        selectedCategory === "all"
                          ? "bg-brand-green text-brand-beige"
                          : "text-brand-green hover:bg-brand-beige-light/70"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>🍽️</span>
                        <span>All Categories</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono opacity-80">{items.length}</span>
                        {selectedCategory === "all" && <Check className="w-3.5 h-3.5 text-brand-gold" />}
                      </span>
                    </button>

                    {filteredCategoryList.map((cat) => {
                      const count = items.filter((i) => i.category === cat.slug).length;
                      const isSelected = selectedCategory === cat.slug;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            setSelectedCategory(cat.slug);
                            setIsCategoryOpen(false);
                          }}
                          className={`w-full px-3 py-2 rounded-xl text-xs font-bold text-left flex items-center justify-between transition-colors ${
                            isSelected
                              ? "bg-brand-green text-brand-beige"
                              : "text-brand-green hover:bg-brand-beige-light/70"
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate pr-2">
                            <span>{cat.icon || "🍽️"}</span>
                            <span className="truncate">{cat.name}</span>
                          </span>
                          <span className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-mono opacity-80">{count}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-brand-gold" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating Feedback Notification */}
        {feedbackMessage && (
          <div className="p-3.5 rounded-xl bg-brand-green text-brand-beige text-xs font-bold flex items-center justify-between gap-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-gold shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMessage(null)}
              className="p-1 hover:bg-white/10 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Dish Catalog Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((dish) => {
            const isAvailable = dish.isAvailable !== false;
            return (
              <div
                key={dish.id}
                className={`bg-white rounded-2xl border p-4 shadow-xs transition-all flex flex-col justify-between relative ${
                  isAvailable
                    ? "border-brand-beige-dark hover:shadow-md"
                    : "border-brand-beige-dark/50 bg-gray-50/70 opacity-75"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 pb-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${
                          dish.isVeg
                            ? "border-emerald-600 bg-emerald-50 text-emerald-600"
                            : "border-red-600 bg-red-50 text-red-600"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            dish.isVeg ? "bg-emerald-600" : "bg-red-600"
                          }`}
                        />
                      </span>
                      <span className="text-[10px] uppercase font-bold text-brand-green/60">
                        {dish.category}
                      </span>
                    </div>

                    {/* Three-dot dropdown menu */}
                    <div className="relative" data-item-menu>
                      <button
                        type="button"
                        aria-label={`Actions for ${dish.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownId((prev) => (prev === dish.id ? null : dish.id));
                        }}
                        className="p-1.5 rounded-lg hover:bg-brand-beige text-brand-green/60 hover:text-brand-green transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4 pointer-events-none" />
                      </button>

                      {activeDropdownId === dish.id && (
                        <div
                          className="absolute right-0 top-8 z-40 w-48 bg-white rounded-xl shadow-xl border border-brand-beige-dark py-1.5 animate-in fade-in zoom-in-95 duration-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDropdownId(null);
                              setEditingItem({ ...dish });
                            }}
                            className="w-full px-3.5 py-2 text-left text-xs font-bold text-brand-green hover:bg-brand-beige-light flex items-center gap-2.5 transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5 text-brand-gold-dark" />
                            <span>Edit Item</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveDropdownId(null);
                              handleToggleAvailability(dish.id);
                            }}
                            className="w-full px-3.5 py-2 text-left text-xs font-bold text-brand-green hover:bg-brand-beige-light flex items-center gap-2.5 transition-colors"
                          >
                            {isAvailable ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                                <span>Mark Unavailable</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Mark Available</span>
                              </>
                            )}
                          </button>

                          <div className="my-1 border-t border-brand-beige-dark/50" />

                          <button
                            type="button"
                            onClick={() => {
                              setActiveDropdownId(null);
                              setDeletingItem(dish);
                            }}
                            className="w-full px-3.5 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Dish</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="font-extrabold text-brand-green text-sm leading-snug">
                    {dish.name}
                  </h3>

                  {dish.description && (
                    <p className="text-[11px] text-brand-green/70 line-clamp-2 mt-1">
                      {dish.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 mt-2 border-t border-brand-beige-dark/40 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-extrabold text-sm text-brand-green font-mono">
                      ₹{dish.price}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isAvailable
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    {isAvailable ? "Available" : "Unavailable"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-brand-beige-dark animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-brand-beige-dark">
              <h3 className="font-black text-base text-brand-green">Edit Dish: {editingItem.name}</h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 hover:bg-brand-beige-light rounded-full text-brand-green/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 mt-4">
              <div>
                <label className="text-[11px] font-bold text-brand-green/80 uppercase">Dish Name</label>
                <input
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-brand-beige-dark text-xs text-brand-green focus:ring-2 focus:ring-brand-green focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-brand-green/80 uppercase">Category</label>
                  <CustomSelect
                    value={editingItem.category}
                    onChange={(val) => setEditingItem({ ...editingItem, category: val })}
                    placeholder="Select category..."
                    className="mt-1"
                    options={categories
                      .filter((c) => c.id !== "all")
                      .map((c) => ({
                        value: c.slug,
                        label: `${c.icon ? c.icon + ' ' : ''}${c.name}`,
                      }))}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-brand-green/80 uppercase">Price (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingItem.price}
                    onChange={(e) => setEditingItem({ ...editingItem, price: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-brand-beige-dark text-xs text-brand-green font-mono focus:ring-2 focus:ring-brand-green focus:outline-none"
                  />
                </div>
              </div>



              <div>
                <label className="text-[11px] font-bold text-brand-green/80 uppercase">Description</label>
                <textarea
                  rows={2}
                  value={editingItem.description || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-brand-beige-dark text-xs text-brand-green focus:ring-2 focus:ring-brand-green focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-bold text-brand-green cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.isVeg}
                    onChange={(e) => setEditingItem({ ...editingItem, isVeg: e.target.checked })}
                    className="rounded text-brand-green focus:ring-brand-green"
                  />
                  <span>Vegetarian</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-brand-green cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.popular || false}
                    onChange={(e) => setEditingItem({ ...editingItem, popular: e.target.checked })}
                    className="rounded text-brand-green focus:ring-brand-green"
                  />
                  <span>Popular Tag</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-brand-beige-dark">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3 py-2 rounded-xl bg-brand-beige hover:bg-brand-beige-dark text-brand-green font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-black text-xs shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-brand-beige-dark text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base text-brand-green">Delete Dish</h3>
              <p className="text-xs text-brand-green/70 mt-1">
                Are you sure you want to remove <span className="font-bold">&quot;{deletingItem.name}&quot;</span> from the menu catalog?
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="flex-1 py-2.5 rounded-xl bg-brand-beige hover:bg-brand-beige-dark text-brand-green font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-xs"
              >
                Delete Dish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-brand-beige-dark animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-brand-beige-dark">
              <h3 className="font-black text-base text-brand-green">Add New Menu Dish</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 hover:bg-brand-beige-light rounded-full text-brand-green/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-3 mt-4">
              <div>
                <label className="text-[11px] font-bold text-brand-green/80 uppercase">Dish Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vanilla Cold Foam Cold Brew"
                  value={newItemForm.name}
                  onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-brand-beige-dark text-xs text-brand-green focus:ring-2 focus:ring-brand-green focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-brand-green/80 uppercase">Category *</label>
                  <CustomSelect
                    value={newItemForm.category}
                    onChange={(val) => setNewItemForm({ ...newItemForm, category: val })}
                    placeholder="Select category..."
                    className="mt-1"
                    options={categories
                      .filter((c) => c.id !== "all")
                      .map((c) => ({
                        value: c.slug,
                        label: `${c.icon ? c.icon + ' ' : ''}${c.name}`,
                      }))}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-brand-green/80 uppercase">Price (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newItemForm.price}
                    onChange={(e) => setNewItemForm({ ...newItemForm, price: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-brand-beige-dark text-xs text-brand-green font-mono focus:ring-2 focus:ring-brand-green focus:outline-none"
                  />
                </div>
              </div>



              <div>
                <label className="text-[11px] font-bold text-brand-green/80 uppercase">Description</label>
                <textarea
                  rows={2}
                  placeholder="Ingredients, brewing style, flavor notes..."
                  value={newItemForm.description}
                  onChange={(e) => setNewItemForm({ ...newItemForm, description: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-brand-beige-dark text-xs text-brand-green focus:ring-2 focus:ring-brand-green focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-bold text-brand-green cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newItemForm.isVeg}
                    onChange={(e) => setNewItemForm({ ...newItemForm, isVeg: e.target.checked })}
                    className="rounded text-brand-green focus:ring-brand-green"
                  />
                  <span>Vegetarian Dish</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-brand-green cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newItemForm.popular}
                    onChange={(e) => setNewItemForm({ ...newItemForm, popular: e.target.checked })}
                    className="rounded text-brand-green focus:ring-brand-green"
                  />
                  <span>Mark as Popular</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-brand-beige-dark">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-2 rounded-xl bg-brand-beige hover:bg-brand-beige-dark text-brand-green font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-black text-xs shadow-xs"
                >
                  Create Dish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
