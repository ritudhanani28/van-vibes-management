/**
 * Vaan Vibes Management Portal — Brand & Organization Constants
 */
import { CafeDetails } from "@/types/cafe";
import { VAN_VIBES_LOGO_DATA_URL, VAN_VIBES_LOGO_PATH } from "./logo";

const morningHours = process.env.NEXT_PUBLIC_CAFE_MORNING_HOURS || '';
const breakHours = process.env.NEXT_PUBLIC_CAFE_BREAK_HOURS || '';
const eveningHours = process.env.NEXT_PUBLIC_CAFE_EVENING_HOURS || '';
const defaultHoursSummary = [morningHours, eveningHours].filter(Boolean).join(', ');
const cafeHours = process.env.NEXT_PUBLIC_CAFE_HOURS || defaultHoursSummary;

export const CAFE_BRAND: CafeDetails & {
  operatingHours: string;
  email: string;
  schedule: {
    morning: string;
    break: string;
    evening: string;
    display: string;
  };
} = {
  id: process.env.NEXT_PUBLIC_CAFE_ID || 'van-vibes',
  name: process.env.NEXT_PUBLIC_APP_NAME || '',
  hindiName: process.env.NEXT_PUBLIC_CAFE_HINDI_NAME || '',
  tagline: process.env.NEXT_PUBLIC_APP_TAGLINE || '',
  address: process.env.NEXT_PUBLIC_CAFE_ADDRESS || 'Titanium The Business Hub, G-17, Bhimrad Rd, opp. Aakash Empire, beside White Temple, Surat, Gujarat 395007',
  phone: process.env.NEXT_PUBLIC_CAFE_PHONE || '+91 9904990790',
  email: process.env.NEXT_PUBLIC_CAFE_EMAIL || '',
  gstin: process.env.NEXT_PUBLIC_CAFE_GSTIN || '',
  currency: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹',
  taxRate: process.env.NEXT_PUBLIC_TAX_RATE ? parseFloat(process.env.NEXT_PUBLIC_TAX_RATE) : 0.05,
  logoUrl: VAN_VIBES_LOGO_PATH,
  logoDataUrl: VAN_VIBES_LOGO_DATA_URL,
  operatingHours: cafeHours,
  schedule: {
    morning: morningHours,
    break: breakHours,
    evening: eveningHours,
    display: [
      morningHours ? `Morning: ${morningHours}` : '',
      breakHours ? `Break: ${breakHours}` : '',
      eveningHours ? `Evening: ${eveningHours}` : '',
    ]
      .filter(Boolean)
      .join(' • '),
  },
};
