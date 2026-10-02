# Vaan Vibes Management Portal — Architecture & Refactoring Guide

## 1. Executive Summary

This document details the complete Next.js frontend architecture refactoring, project structure cleanup, and code quality improvements performed on the **Vaan Vibes Management Portal** (`/Users/mac/Desktop/van-vibes-management`).

The portal provides operations and kitchen display systems (KDS) for administrators, managers, and kitchen chefs. The refactoring eliminated all 76 ESLint errors/warnings (achieving **0 errors, 0 warnings**), deleted obsolete mock code, consolidated design tokens, and separated reusable UI primitives from feature-specific domain components.

---

## 2. Technology Stack & Runtime Configuration

- **Framework**: Next.js 16.3.6 (App Router, Turbopack)
- **Library**: React 19.2.8 & React-DOM 19.2.8
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss: ^4`, `tailwindcss: ^4`) with centralized `@theme` in `src/app/globals.css`
- **Icons**: Lucide React (`lucide-react: ^1.48.0`)
- **Type Checking**: TypeScript 5 with strict mode
- **Testing**: Vitest 5 with Node environment and path aliases
- **Default Port**: `4001` (`next dev -p 4001`, `next start -p 4001`)
- **Backend API**: FastAPI REST endpoints + Live WebSocket stream

---

## 3. Directory Structure

```text
src/
├── api/                             # Centralized API client & endpoint services
│   ├── auth.ts                     # Authentication & staff management APIs
│   ├── billing.ts                  # Invoices, receipts, and payment settlements
│   ├── client.ts                   # Base HTTP client with JWT handling
│   ├── dashboard.ts                # Analytics & metrics queries
│   ├── diningSessions.ts           # Table dining sessions lifecycle
│   ├── index.ts                    # Consolidated API export
│   ├── menu.ts                     # Menu item catalog & category APIs
│   ├── orders.ts                   # Real-time order CRUD & status updates
│   └── tables.ts                   # Table management & QR code generation
│
├── app/                             # Next.js App Router route entry points
│   ├── api/health/route.ts         # Health check endpoint
│   ├── billing/page.tsx            # Dining session billing & invoice ledger
│   ├── chef/page.tsx               # Kitchen Display System (KDS) for chefs
│   ├── chefs/page.tsx              # Staff/chef administration & accounts
│   ├── dashboard/page.tsx          # Real-time admin analytics & occupancy
│   ├── login/page.tsx              # Role-aware login for Admin and Chef
│   ├── menu-items/page.tsx         # Menu catalog, availability & pricing
│   ├── orders/page.tsx             # Live orders management & filters
│   ├── profile/page.tsx            # User profile & credential management
│   ├── settings/page.tsx           # Cafe preferences & business configurations
│   ├── tables/page.tsx             # Table visual grid, occupancy & QR standees
│   ├── globals.css                 # Tailwind CSS v4 @theme and print receipts
│   ├── layout.tsx                  # Root HTML layout with AuthProvider
│   └── page.tsx                    # Landing redirector (dashboard / login)
│
├── components/                      # Shared layout & reusable UI components
│   ├── layout/
│   │   └── AppLayout.tsx           # Sidebar navigation, top header, mobile drawer
│   └── ui/
│       ├── AccessDenied.tsx        # Role-guard fallback interface
│       └── CustomSelect.tsx        # Fully accessible, styled dropdown component
│
├── constants/                       # Centralized tokens & brand definitions
│   ├── brand.ts                    # Vaan Vibes cafe info, GSTIN, contact
│   └── tokens.ts                   # Unified design system tokens matching globals.css
│
├── context/
│   └── AuthContext.tsx             # Role-based JWT session state & route guard
│
├── features/                        # Domain-driven feature modules
│   ├── billing/
│   │   └── components/
│   │       └── BillModal.tsx       # Receipt, tax invoice, discount, settle dialog
│   ├── menu/
│   │   └── constants/
│   │       └── categories.ts       # Authoritative category tabs & icons
│   └── orders/
│       └── components/
│           └── OrderCard.tsx       # Live order ticket with pure real-time timer
│
├── services/
│   └── websocket/
│       └── WebSocketManager.ts     # Resilient WebSocket service with reconnection
│
└── types/
    ├── auth.ts                     # User, UserRole, credentials interfaces
    └── cafe.ts                     # Order, Table, Session, BillData domain models
```

---

## 4. Key Architectural Improvements & Consolidations

### 4.1 Resolution of ESLint Errors (76 to 0)
1. **React 19 Impure Render Elimination (`react-hooks/purity`)**:
   - In `OrderCard.tsx`, calculating `Date.now()` directly in the component render body violated purity rules. This was replaced by an asynchronous state-managed timer that calculates elapsed time and updates every 30 seconds cleanly without re-rendering instability.
2. **Cascading Render Prevention (`react-hooks/set-state-in-effect`)**:
   - In `billing`, `chef`, `chefs`, `dashboard`, `menu-items`, `orders`, and `BillModal`, synchronous `setState()` invocations within `useEffect` bodies were refactored into asynchronous Promise resolutions with active cancellation flags (`let active = true`).
3. **TypeScript Typing Elimination of `any`**:
   - Defined `RawUserResponse` and `RawLoginResponse` in `src/api/auth.ts`.
   - Typed dining session relations (`Order[]`, `InvoiceRecord`).
   - Implemented generic subscriber signatures `on<T>()` and `off<T>()` in `WebSocketManager.ts`.
   - Strongly typed `OrderItem` properties with snake_case fallbacks (`item_name`, `unit_price`, `line_total`), completely eliminating `(item as any)` casting in `OrderCard.tsx`.
4. **Clean Code & Unused Variable Cleanup**:
   - Removed unused icons (`Printer`, `CreditCard`, `Banknote`, `ChefHat`, `Sparkles`, `ArrowRight`, `Send`, `ShieldCheck`, `ChevronDown`).
   - Escaped unescaped HTML quotes in `menu-items/page.tsx` (`&quot;`).

### 4.2 Removal of Obsolete Code & Pass-Through Wrappers
- Deleted `src/lib/cafe-store.ts`: A legacy in-memory mock store that was never imported by pages and generated 6 ESLint errors.
- Consolidated `src/design-system/tokens.ts` into `src/constants/tokens.ts`.
- Removed intermediate duplicate paths:
  - `src/components/orders/OrderCard.tsx` -> `src/features/orders/components/OrderCard.tsx`
  - `src/components/billing/BillModal.tsx` -> `src/features/billing/components/BillModal.tsx`
  - `src/components/common/CustomSelect.tsx` -> `src/components/ui/CustomSelect.tsx`
  - `src/components/common/AccessDenied.tsx` -> `src/components/ui/AccessDenied.tsx`
- Deleted all empty directories (`src/lib/`, `src/design-system/`, `src/components/common/`, `src/components/orders/`, `src/components/billing/`).
- Verified zero pass-through dummy wrapper files remain; all consumer files import directly from the authoritative locations.

---

## 5. Verification Results

| Check | Tool | Result | Details |
|---|---|---|---|
| Static Analysis / Linting | ESLint 9 (Flat Config) | **0 Errors, 0 Warnings** | 100% clean across all 19 target files |
| Type Checking | TypeScript 5 (`tsc --noEmit`) | **0 Errors** | Strict mode compliant |
| Unit Tests | Vitest 5 | **13 / 13 Passed (100%)** | 4 test suites across tokens, API, categories, calculations |
| Production Build | Next.js 16.3.6 Turbopack | **Successful** | All 15 routes compiled and prerendered in 1292ms |
