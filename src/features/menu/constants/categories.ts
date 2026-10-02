import { MenuCategory } from "@/types/cafe";

export const MENU_CATEGORIES: MenuCategory[] = [
  { id: "all", name: "All Items", slug: "all", icon: "🍽️", page: 0 },
  { id: "hot-coffee", name: "Hot Coffee", slug: "hot-coffee", icon: "☕", page: 2 },
  { id: "iced-coffee", name: "Iced Coffee", slug: "iced-coffee", icon: "🧊", page: 2 },
  { id: "non-coffee", name: "Non Coffee", slug: "non-coffee", icon: "🍹", page: 2 },
  { id: "manual-brew", name: "Manual Brew", slug: "manual-brew", icon: "⚗️", page: 2 },
  { id: "shake", name: "Shake", slug: "shake", icon: "🥤", page: 2 },
  { id: "frappe", name: "Frappe", slug: "frappe", icon: "🍧", page: 2 },
  { id: "toastie", name: "Toastie", slug: "toastie", icon: "🥪", page: 3 },
  { id: "appetizers", name: "Appetizers", slug: "appetizers", icon: "🍟", page: 3 },
  { id: "pasta", name: "Pasta", slug: "pasta", icon: "🍝", page: 3 },
  { id: "pizza", name: "Pizza", slug: "pizza", icon: "🍕", page: 3 },
  { id: "rice", name: "Rice", slug: "rice", icon: "🍚", page: 3 },
  { id: "soup", name: "Soup", slug: "soup", icon: "🥣", page: 3 },
  { id: "starters", name: "Starters", slug: "starters", icon: "🍢", page: 4 },
  { id: "asian-indo", name: "Asian Indo", slug: "asian-indo", icon: "🥢", page: 4 },
  { id: "sizzlers", name: "Sizzlers", slug: "sizzlers", icon: "♨️", page: 4 },
  { id: "signature-punjabi", name: "Signature Punjabi", slug: "signature-punjabi", icon: "🍛", page: 4 },
  { id: "bread", name: "Bread", slug: "bread", icon: "🫓", page: 4 },
  { id: "extra", name: "Extra", slug: "extra", icon: "🥛", page: 4 },
  { id: "dessert", name: "Dessert", slug: "dessert", icon: "🍰", page: 5 },
];
