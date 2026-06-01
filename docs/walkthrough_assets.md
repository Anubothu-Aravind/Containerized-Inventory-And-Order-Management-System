# StockFlow V3 Walkthrough Assets Guide

This document outlines the professional assets required to present StockFlow V3 to recruiters, startup engineering leads, and portfolio reviewers. 

---

## 📸 Screenshot Guidelines (`docs/screenshots/`)

Ensure you capture high-fidelity screenshots of the following views. Use your browser's dark/light theme switchers in StockFlow to highlight theme versatility!

| Screenshot Filename | View Context | Key Highlights |
| :--- | :--- | :--- |
| `login.png` | Glassmorphic Authentication Portal | Custom background gradients, role badge footnotes (`admin`, `staff`, `customer`). |
| `dashboard.png` | Admin Command Center | Stat cards, Sales Revenue Trend SVG charts, and the **Audit Trail Activity Timeline**. |
| `inventory.png` | Stock Observability Matrix | Health alerts count, Reserved vs Available stock math, and simple endurances (average coverages). |
| `orders.png` | Grid Orders List | Interactive Checkout Drawer (if cart is active), and order workflows. |
| `analytics.png` | Reporting Panel | Multi-dimensional billing curves and Order status splits. |
| `command-palette.png` | Keyboard-Focused Modal | Search matches, instant launcher, and command chips inside the `Ctrl+K` dialog. |
| `operations-assistant.png` | Smart Drawer Chat Console | Conversational output for `/status`, `/low-stock`, `/categories`, or `/reseed`. |
| `mobile-view.png` | Responsive Viewport | Hamburger menus, drawer navigation overlays, and compact metrics. |

---

## 📹 Presentation Video Workthroughs

Record distinct walkthroughs targeting different audiences. Keep recordings under 3 minutes each, with clean typography or audio explanations.

### 1. Admin Command Walkthrough (2-3 Mins)
- **Goal**: Highlight complete business observability.
- **Workflow**:
  1. Sign in as `admin`.
  2. Open the **Command Palette** (`Ctrl+K`), trigger `/reseed` to hydrate the database.
  3. Explore live SVG charts, monthly sales, and check the **Audit Trail Activity Timeline** to verify logs are database-backed.
  4. Access the **Users Panel** to demonstrate role assignment.

### 2. Operations Staff Walkthrough (1-2 Mins)
- **Goal**: Highlight functional CRUD and order fulfillment.
- **Workflow**:
  1. Sign in as `staff`.
  2. Navigate to **Products**, edit a product's price and Category.
  3. Navigate to **Orders**, select a `PENDING` order, and advance its workflow step (`Fulfillment` -> `Shipped` -> `Delivered`).
  4. Inspect the resulting live inventory stock restoration/reduction logs in the **Movement Feed**.

### 3. Customer E-Commerce Walkthrough (1-2 Mins)
- **Goal**: Highlight self-service cart and shopping flows.
- **Workflow**:
  1. Sign in as `customer`.
  2. Navigate to the **Catalog**, add 2 products to the **Shopping Cart**.
  3. Open the **Cart Drawer**, adjust quantities, and click **"Confirm & Place Order"**.
  4. Navigate to **My Orders** to inspect the order details status tracker.

### 4. Mobile Responsiveness Walkthrough (1 Min)
- **Goal**: Demonstrate front-end engineering versatility.
- **Workflow**:
  1. Set browser viewport to Mobile width.
  2. Click the Hamburger menu icon to slide out the **Sidebar Drawer**.
  3. Open the **Command Palette** and **Operations Assistant Drawer** to verify they fit beautifully on mobile screens.
