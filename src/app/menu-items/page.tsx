'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MENU_CATEGORIES, MENU_ITEMS } from '@/data/vaan-vibes-menu';
import { MenuItem } from '@/types/cafe';
import {
  Search,
  Sparkles,
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

export default function MenuItemsAdminPage() {
  const [items, setItems] = useState<MenuItem[]>(() =>
    MENU_ITEMS.map((item) => ({ ...item, isAvailable: true }))
  );
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
    category: MENU_CATEGORIES[1]?.slug || "hot-coffee",
    price: 150,
    description: "",
    isVeg: true,
    popular: false,
  });

  // Close dropdown on click outside or escape key
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      setActiveDropdownId(null);
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

  const handleToggleAvailability = (itemId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const nextState = item.isAvailable === false;
          triggerFeedback(
            nextState
              ? `"${item.name}" marked as available`
              : `"${item.name}" marked as unavailable`
          );
          return { ...item, isAvailable: nextState };
        }
        return item;
      })
    );
  };

  const handleConfirmDelete = () => {
    if (!deletingItem) return;
    const name = deletingItem.name;
    setItems((prev) => prev.filter((i) => i.id !== deletingItem.id));
    setDeletingItem(null);
    triggerFeedback(`"${name}" removed from menu catalog`);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setItems((prev) =>
      prev.map((i) => (i.id === editingItem.id ? { ...editingItem } : i))
    );
    const name = editingItem.name;
    setEditingItem(null);
    triggerFeedback(`"${name}" updated successfully`);
  };

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemForm.name.trim()) return;

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

    setItems((prev) => [newItem, ...prev]);
    setIsAddModalOpen(false);
    setNewItemForm({
      name: "",
      category: MENU_CATEGORIES[1]?.slug || "hot-coffee",
      price: 150,
      description: "",
      isVeg: true,
      popular: false,
    });
    triggerFeedback(`"${newItem.name}" added to menu catalog`);
  };

  const filteredItems = items.filter((item) => {
    if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return item.name.toLowerCase().includes(q);
  });

  const currentCategory = MENU_CATEGORIES.find((c) => c.slug === selectedCategory);
  const selectedCategoryCount =
    selectedCategory === "all"
      ? `${items.length} dishes`
      : `${items.filter((i) => i.category === selectedCategory).length} dishes`;

  const filteredCategoryList = MENU_CATEGORIES.filter((c) => {
    if (c.id === "all") return false;
    if (!categorySearchText.trim()) return true;
    return c.name.toLowerCase().includes(categorySearchText.toLowerCase().trim());
  });

  return (
    <AppLayout requiredRole="ADMIN">
      <div className="space-y-5">
        {/* Sticky Action & Filter Bar (stays visible while scrolling catalog) */}
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

            {/* Accessible Add Item Button */}
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
                  {/* Category Search Input */}
                  <div className="p-2 border-b border-brand-beige-dark/60 bg-brand-beige-light/40">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-green/40" />
                      <input
                        type="text"
                        value={categorySearchText}
                        onChange={(e) => setCategorySearchText(e.target.value)}
                        placeholder="Search categories..."
                        className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-brand-beige-dark text-xs text-brand-green placeholder:text-brand-green/40 bg-white focus:outline-none focus:ring-1 focus:ring-brand-green"
                      />
                    </div>
                  </div>

                  {/* Scrollable Category Options */}
                  <div className="max-h-72 overflow-y-auto divide-y divide-brand-beige-dark/20 p-1">
                    {/* All Categories Option */}
                    <button
                      type="button"
                      role="option"
                      aria-selected={selectedCategory === "all"}
                      onClick={() => {
                        setSelectedCategory("all");
                        setIsCategoryOpen(false);
                        setCategorySearchText("");
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                        selectedCategory === "all"
                          ? "bg-brand-green text-brand-beige font-bold shadow-2xs"
                          : "text-brand-green hover:bg-brand-beige-light/70 font-semibold"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base leading-none">🍽️</span>
                        <span>All Categories</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            selectedCategory === "all"
                              ? "bg-brand-gold text-brand-green"
                              : "bg-brand-beige text-brand-green/70"
                          }`}
                        >
                          {items.length} dishes
                        </span>
                        {selectedCategory === "all" && (
                          <Check className="w-3.5 h-3.5 text-brand-gold" />
                        )}
                      </div>
                    </button>

                    {/* Specific Categories */}
                    {filteredCategoryList.map((cat) => {
                      const isSelected = selectedCategory === cat.slug;
                      const count = items.filter((i) => i.category === cat.slug).length;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            setSelectedCategory(cat.slug);
                            setIsCategoryOpen(false);
                            setCategorySearchText("");
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                            isSelected
                              ? "bg-brand-green text-brand-beige font-bold shadow-2xs"
                              : "text-brand-green hover:bg-brand-beige-light/70 font-semibold"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base leading-none">{cat.icon || "☕"}</span>
                            <span>{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                                isSelected
                                  ? "bg-brand-gold text-brand-green"
                                  : "bg-brand-beige text-brand-green/70"
                              }`}
                            >
                              {count} dishes
                            </span>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-brand-gold" />
                            )}
                          </div>
                        </button>
                      );
                    })}

                    {filteredCategoryList.length === 0 && (
                      <div className="p-4 text-center text-xs text-brand-green/60">
                        No categories found matching &quot;{categorySearchText}&quot;
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Feedback Banner */}
        {feedbackMessage && (
          <div className="p-3 rounded-xl bg-brand-green text-brand-beige text-xs font-bold flex items-center gap-2 shadow-xs animate-in slide-in-from-top duration-200">
            <CheckCircle2 className="w-4 h-4 text-brand-gold shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border transition-all p-4 shadow-xs flex flex-col justify-between relative ${
                item.isAvailable === false
                  ? 'border-red-200/80 bg-red-50/20 opacity-80'
                  : 'border-brand-beige-dark hover:border-brand-green/40'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`w-3.5 h-3.5 rounded border p-0.5 flex items-center justify-center shrink-0 ${
                        item.isVeg
                          ? 'border-emerald-600 bg-emerald-50'
                          : 'border-amber-700 bg-amber-50'
                      }`}
                      title={item.isVeg ? 'Vegetarian' : 'Non-Veg / Egg'}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.isVeg ? 'bg-emerald-600' : 'bg-amber-700'
                        }`}
                      />
                    </span>
                    {item.popular && (
                      <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> Popular
                      </span>
                    )}
                    {item.isAvailable === false && (
                      <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded-full bg-red-100 text-red-800">
                        Unavailable
                      </span>
                    )}
                  </div>

                  {/* Vertical Three-Dot Action Icon */}
                  <div className="relative">
                    <button
                      type="button"
                      aria-label={`More actions for ${item.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdownId(activeDropdownId === item.id ? null : item.id);
                      }}
                      className="w-8 h-8 rounded-lg hover:bg-brand-beige flex items-center justify-center text-brand-green/70 hover:text-brand-green transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green min-h-[32px] min-w-[32px]"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Three-Dot Action Dropdown Menu */}
                    {activeDropdownId === item.id && (
                      <div
                        role="menu"
                        className="absolute right-0 top-9 z-30 w-48 bg-white rounded-xl shadow-xl border border-brand-beige-dark py-1 text-xs animate-in fade-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setActiveDropdownId(null);
                            setEditingItem({ ...item });
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-brand-green hover:bg-brand-beige font-semibold transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5 text-brand-green/70" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setActiveDropdownId(null);
                            handleToggleAvailability(item.id);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-brand-green hover:bg-brand-beige font-semibold transition-colors"
                        >
                          {item.isAvailable === false ? (
                            <>
                              <Eye className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Mark as available</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                              <span>Mark as unavailable</span>
                            </>
                          )}
                        </button>

                        <div className="border-t border-brand-beige-dark/50 my-1" />

                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setActiveDropdownId(null);
                            setDeletingItem(item);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50 font-semibold transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <span className="text-[10px] font-semibold text-brand-green/60 uppercase font-mono block">
                  {item.category.replace('-', ' ')}
                </span>
                <h3 className="font-extrabold text-sm sm:text-base text-brand-green mt-0.5">
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

      {/* Delete Confirmation Dialog */}
      {deletingItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setDeletingItem(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full border border-brand-beige-dark shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 id="delete-dialog-title" className="font-black text-base text-brand-green">
                  Delete &ldquo;{deletingItem.name}&rdquo;?
                </h3>
                <p className="text-xs text-brand-green/70 mt-1">
                  This action cannot be undone. This menu item will be permanently removed from the catalog.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-brand-beige-dark/60">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 rounded-xl border border-brand-beige-dark hover:bg-brand-beige text-xs font-bold text-brand-green transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
              >
                Delete Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Menu Item Modal */}
      {editingItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-dialog-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setEditingItem(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full border border-brand-beige-dark shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-brand-beige-dark/60 pb-3">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-brand-gold" />
                <h3 id="edit-dialog-title" className="font-black text-base text-brand-green">
                  Edit Menu Item
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="w-8 h-8 rounded-lg hover:bg-brand-beige flex items-center justify-center text-brand-green/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-brand-green/70 block mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark text-xs text-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green min-h-[40px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-brand-green/70 block mb-1">
                    Category *
                  </label>
                  <select
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark text-xs text-brand-green bg-white focus:outline-none focus:ring-2 focus:ring-brand-green min-h-[40px]"
                  >
                    {MENU_CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-brand-green/70 block mb-1">
                    Base Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editingItem.price}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, price: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark text-xs text-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green min-h-[40px] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-brand-green/70 block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editingItem.description || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark text-xs text-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green"
                  placeholder="Ingredients, preparation style..."
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-brand-green">
                  <input
                    type="checkbox"
                    checked={editingItem.isVeg}
                    onChange={(e) => setEditingItem({ ...editingItem, isVeg: e.target.checked })}
                    className="w-4 h-4 rounded text-brand-green focus:ring-brand-green"
                  />
                  <span>Pure Vegetarian</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-brand-green">
                  <input
                    type="checkbox"
                    checked={editingItem.popular || false}
                    onChange={(e) => setEditingItem({ ...editingItem, popular: e.target.checked })}
                    className="w-4 h-4 rounded text-brand-green focus:ring-brand-green"
                  />
                  <span>Popular Item</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-brand-beige-dark/60">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl border border-brand-beige-dark hover:bg-brand-beige text-xs font-bold text-brand-green transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige text-xs font-black shadow-xs transition-all active:scale-95"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-dialog-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full border border-brand-beige-dark shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-brand-beige-dark/60 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-brand-gold" />
                <h3 id="add-dialog-title" className="font-black text-base text-brand-green">
                  Add New Menu Item
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-brand-beige flex items-center justify-center text-brand-green/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-brand-green/70 block mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hazelnut Frappe"
                  value={newItemForm.name}
                  onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark text-xs text-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green min-h-[40px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-brand-green/70 block mb-1">
                    Category *
                  </label>
                  <select
                    value={newItemForm.category}
                    onChange={(e) => setNewItemForm({ ...newItemForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark text-xs text-brand-green bg-white focus:outline-none focus:ring-2 focus:ring-brand-green min-h-[40px]"
                  >
                    {MENU_CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-brand-green/70 block mb-1">
                    Base Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 190"
                    value={newItemForm.price || ""}
                    onChange={(e) =>
                      setNewItemForm({ ...newItemForm, price: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark text-xs text-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green min-h-[40px] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-brand-green/70 block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newItemForm.description}
                  onChange={(e) => setNewItemForm({ ...newItemForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark text-xs text-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green"
                  placeholder="Ingredients, preparation style..."
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-brand-green">
                  <input
                    type="checkbox"
                    checked={newItemForm.isVeg}
                    onChange={(e) => setNewItemForm({ ...newItemForm, isVeg: e.target.checked })}
                    className="w-4 h-4 rounded text-brand-green focus:ring-brand-green"
                  />
                  <span>Pure Vegetarian</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-brand-green">
                  <input
                    type="checkbox"
                    checked={newItemForm.popular}
                    onChange={(e) => setNewItemForm({ ...newItemForm, popular: e.target.checked })}
                    className="w-4 h-4 rounded text-brand-green focus:ring-brand-green"
                  />
                  <span>Popular Item</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-brand-beige-dark/60">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-brand-beige-dark hover:bg-brand-beige text-xs font-bold text-brand-green transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige text-xs font-black shadow-xs transition-all active:scale-95"
                >
                  Add to Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
