# Vaan Vibes Management Portal — Feature-to-File Map

## 1. Feature Map & Source Code Matrix

| Feature | Access Route | Primary Page Component | Feature Components | Reusable UI / Layout | API Services |
|---|---|---|---|---|---|
| **Authentication** | `/login` | `src/app/login/page.tsx` | N/A | `AuthContext` | `authApi` |
| **Admin Dashboard** | `/dashboard` | `src/app/dashboard/page.tsx` | `OrderCard`, `BillModal` | `AppLayout`, `CustomSelect` | `ordersApi`, `tablesApi` |
| **Orders Operations** | `/orders` | `src/app/orders/page.tsx` | `OrderCard`, `BillModal` | `AppLayout` | `ordersApi` |
| **Dining Billing / POS** | `/billing` | `src/app/billing/page.tsx` | `BillModal` | `AppLayout` | `diningSessionsApi`, `billingApi` |
| **Table Management** | `/tables` | `src/app/tables/page.tsx` | N/A | `AppLayout`, `CustomSelect` | `tablesApi` |
| **Menu Catalog** | `/menu-items` | `src/app/menu-items/page.tsx`| `categories.ts` | `AppLayout`, `CustomSelect` | `menuApi` |
| **Chef KDS** | `/chef` | `src/app/chef/page.tsx` | `OrderCard` | `AppLayout` | `ordersApi` |
| **Staff Management** | `/chefs` | `src/app/chefs/page.tsx` | N/A | `AppLayout`, `CustomSelect` | `authApi` |
| **Staff Profile** | `/profile` | `src/app/profile/page.tsx` | N/A | `AppLayout` | `authApi` |
| **Cafe Settings** | `/settings` | `src/app/settings/page.tsx` | N/A | `AppLayout`, `CustomSelect` | `CAFE_BRAND` |

---

## 2. Module Dependency Architecture

```mermaid
flowchart TD
    subgraph UI ["User Interface Layer"]
        R[Next.js App Router Routes]
        AL[AppLayout]
        UIComp[UI Primitives: CustomSelect, AccessDenied]
    end

    subgraph Features ["Feature Modules Layer"]
        OC[features/orders/components/OrderCard]
        BM[features/billing/components/BillModal]
        MC[features/menu/constants/categories]
    end

    subgraph Core ["Infrastructure & State"]
        AC[context/AuthContext]
        WS[services/websocket/WebSocketManager]
        TOK[constants/tokens & constants/brand]
    end

    subgraph API ["Data & Communication Layer"]
        CLI[api/client]
        EP[api: orders, tables, billing, diningSessions, menu, auth]
        BE[(FastAPI Backend 9000)]
    end

    R --> AL
    R --> OC
    R --> BM
    R --> UIComp
    AL --> UIComp
    R --> AC
    OC --> AC
    R --> EP
    BM --> EP
    OC --> EP
    EP --> CLI
    CLI --> BE
    WS -.-> BE
    R -.-> WS
```

---

## 3. Real-Time Order & Kitchen Lifecycle Flow

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer (Frontend)
    participant Backend as FastAPI Backend (:9000)
    participant WS as WebSocket Live Stream
    actor Admin as Admin (Portal :4001)
    actor Chef as Chef KDS (:4001)

    Customer->>Backend: Places Order (POST /orders)
    Backend-->>WS: Broadcast ORDER_PLACED
    WS-->>Admin: Event ORDER_PLACED received
    Admin->>Admin: Order appears as "Placed" on /orders & /dashboard
    Admin->>Backend: Accept Order (PUT /orders/{id}/status -> ACCEPTED)
    Backend-->>WS: Broadcast ORDER_ACCEPTED
    WS-->>Chef: Event ORDER_ACCEPTED (Chime sounds)
    Chef->>Chef: Incoming Order appears on /chef KDS
    Chef->>Backend: Mark Done (PUT /orders/{id}/done -> IN_KITCHEN)
    Backend-->>WS: Broadcast ORDER_IN_KITCHEN
    Admin->>Backend: Generate Bill (POST /billing/bill)
    Admin->>Backend: Settle Cash / UPI Payment (POST /billing/settle)
    Backend-->>WS: Broadcast PAYMENT_SETTLED
```
