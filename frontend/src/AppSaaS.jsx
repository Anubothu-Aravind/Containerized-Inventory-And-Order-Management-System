import { useEffect, useMemo, useState } from "react";
import AppChrome from "./components/layout/AppChrome.jsx";
import Badge from "./components/ui/Badge.jsx";
import Button from "./components/ui/Button.jsx";
import Card from "./components/ui/Card.jsx";
import Dialog from "./components/ui/Dialog.jsx";
import Drawer from "./components/ui/Drawer.jsx";
import Input from "./components/ui/Input.jsx";
import Skeleton from "./components/ui/Skeleton.jsx";
import ToastStack from "./components/ui/Toast.jsx";
import { apiFetch, authHeaders, clearAuth, getAuth, setAuth } from "./api/client.js";
import { SalesTrendChart, OrderVolumeChart, StockDistributionChart } from "./components/ui/Charts.jsx";
import Icon from "./components/ui/Icons.jsx";

const emptyLogin = { identifier: "", password: "" };
const emptyRegister = { full_name: "", username: "", email: "", password: "", confirm_password: "" };
const emptyProduct = { name: "", sku: "", price: "", quantity_in_stock: "", category: "" };
const emptyCustomer = { full_name: "", email: "", phone_number: "" };
const emptyOrder = { customer_id: "", product_id: "", quantity: 1 };
const emptyProfile = { full_name: "", email: "", phone_number: "" };
const emptyPassword = { current_password: "", new_password: "", confirm_password: "" };
const emptySettings = { company_name: "StockFlow Enterprise", timezone: "UTC", currency: "USD", low_stock_threshold: 2, auto_reorder: false, session_timeout: "30", password_policy: "Strong passwords required", two_factor: true };
const emptyDashboard = {
  total_products: 0,
  total_customers: 0,
  total_orders: 0,
  low_stock_products: [],
  revenue_today: 0,
  revenue_month: 0,
  inventory_value: 0,
  pending_orders: 0,
  processing_orders: 0,
  delivered_orders: 0,
  cancelled_orders: 0,
  top_products: [],
  recent_orders: [],
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function money(value) {
  return currencyFormatter.format(Number(value || 0));
}

function startOfDay(dateValue) {
  return new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());
}

function startOfMonth(dateValue) {
  return new Date(dateValue.getFullYear(), dateValue.getMonth(), 1);
}

function roleHome(role) {
  return role === "CUSTOMER" ? "orders" : "dashboard";
}

function isOpenStatus(status) {
  return !["completed", "cancelled", "canceled", "delivered"].includes(String(status || "").toLowerCase());
}

function roleBadgeTone(role) {
  if (role === "ADMIN") return "success";
  if (role === "STAFF") return "warning";
  return "neutral";
}

function toNumber(value) {
  return Number(value || 0);
}

function formatDayLabel(dateValue) {
  return new Date(dateValue).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatLongDate(dateValue) {
  return new Date(dateValue).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function buildRevenueSeries(orders, days = 7) {
  const now = new Date();
  const series = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - offset);
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    const end = start + 86400000;
    const total = orders
      .filter((order) => {
        const createdAt = new Date(order.created_at).getTime();
        return createdAt >= start && createdAt < end;
      })
      .reduce((sum, order) => sum + toNumber(order.total_amount), 0);

    series.push({ label: formatDayLabel(day), value: total });
  }

  return series;
}

function buildStatusSeries(orders) {
  const total = orders.length || 1;
  const counts = {
    pending: orders.filter((order) => String(order.status).toLowerCase() === "pending").length,
    processing: orders.filter((order) => String(order.status).toLowerCase() === "processing").length,
    shipped: orders.filter((order) => String(order.status).toLowerCase() === "shipped").length,
    delivered: orders.filter((order) => String(order.status).toLowerCase() === "delivered").length,
    cancelled: orders.filter((order) => ["cancelled", "canceled"].includes(String(order.status).toLowerCase())).length,
  };

  return [
    { label: "Delivered", value: counts.delivered, percent: Math.round((counts.delivered / total) * 100), tone: "success" },
    { label: "Processing", value: counts.processing, percent: Math.round((counts.processing / total) * 100), tone: "warning" },
    { label: "Pending", value: counts.pending, percent: Math.round((counts.pending / total) * 100), tone: "neutral" },
    { label: "Cancelled", value: counts.cancelled, percent: Math.round((counts.cancelled / total) * 100), tone: "danger" },
  ];
}

function miniStatLabel(value, label) {
  return (
    <Card className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </Card>
  );
}

function PasswordField({ label, value, onChange, placeholder, autoComplete }) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <div className="password-row">
        <input
          className="ui-input"
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        <Button variant="ghost" size="sm" type="button" onClick={() => setVisible((current) => !current)}>
          {visible ? "Hide" : "Show"}
        </Button>
      </div>
    </label>
  );
}

function StatCard({ label, value, hint, tone = "neutral" }) {
  return (
    <Card className={["metric-card", tone === "primary" ? "metric-card--primary" : tone === "alert" ? "metric-card--alert" : ""].filter(Boolean).join(" ")}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </Card>
  );
}

function SectionHeader({ kicker, title, description, action }) {
  return (
    <div className="panel-header">
      <div>
        <p className="panel-kicker">{kicker}</p>
        <h2>{title}</h2>
        {description ? <p className="panel-copy">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function buildTopCustomers(customers, orders) {
  const totals = new Map();

  orders.forEach((order) => {
    const currentTotal = totals.get(order.customer_id) || { orders: 0, spent: 0 };
    totals.set(order.customer_id, {
      orders: currentTotal.orders + 1,
      spent: currentTotal.spent + toNumber(order.total_amount),
    });
  });

  return [...totals.entries()]
    .sort((left, right) => right[1].spent - left[1].spent)
    .slice(0, 5)
    .map(([customerId, stats]) => ({
      customerId,
      name: customers.find((customer) => customer.id === customerId)?.full_name || `Customer #${customerId}`,
      orders: stats.orders,
      spent: stats.spent,
    }));
}

function buildProductAnalytics(product, detailedOrders, threshold) {
  const relatedOrders = detailedOrders
    .filter((order) => order.items?.some((item) => item.product_id === product.id))
    .sort((left, right) => new Date(right.created_at) - new Date(left.created_at));
  const relatedItems = relatedOrders.flatMap((order) => (order.items || []).filter((item) => item.product_id === product.id).map((item) => ({ order, item })));
  const unitsSold = relatedItems.reduce((sum, entry) => sum + toNumber(entry.item.quantity), 0);
  const revenueGenerated = relatedItems.reduce((sum, entry) => sum + toNumber(entry.item.line_total), 0);
  const reservedStock = relatedItems.filter((entry) => isOpenStatus(entry.order.status)).reduce((sum, entry) => sum + toNumber(entry.item.quantity), 0);
  const availableStock = Math.max(0, toNumber(product.quantity_in_stock) - reservedStock);
  const firstSale = relatedOrders.at(-1)?.created_at || null;
  const lastSale = relatedOrders[0]?.created_at || null;
  const daysSinceFirstSale = firstSale ? Math.max(1, (Date.now() - new Date(firstSale).getTime()) / 86400000) : null;
  const averageDailySales = daysSinceFirstSale ? unitsSold / daysSinceFirstSale : 0;
  const daysUntilStockout = averageDailySales > 0 ? availableStock / averageDailySales : null;
  const turnover = toNumber(product.quantity_in_stock) + unitsSold > 0 ? unitsSold / (toNumber(product.quantity_in_stock) + unitsSold) : 0;

  return {
    relatedOrders,
    relatedItems,
    unitsSold,
    revenueGenerated,
    reservedStock,
    availableStock,
    threshold,
    firstSale,
    lastSale,
    averageDailySales,
    daysUntilStockout,
    turnover,
  };
}

function buildInventoryMovements(product, detailedOrders) {
  const analytics = buildProductAnalytics(product, detailedOrders, 0);
  const movements = [];

  if (analytics.unitsSold > 0) {
    movements.push({ label: "Seeded stock", quantity: `+${toNumber(product.quantity_in_stock) + analytics.unitsSold}`, detail: "Opening balance inferred from current on-hand stock and sold units." });
    analytics.relatedItems.slice(0, 6).forEach(({ order, item }) => {
      movements.push({ label: `Order #${order.id}`, quantity: `-${item.quantity}`, detail: `${item.quantity} sold on ${formatLongDate(order.created_at)}` });
    });
  } else {
    movements.push({ label: "Current stock", quantity: `+${product.quantity_in_stock}`, detail: "No order-driven movements have been recorded yet." });
  }

  movements.push({ label: "Current on hand", quantity: `${product.quantity_in_stock}`, detail: "Live stock snapshot from the products table." });

  return movements.slice(0, 8);
}

const AUTH_PATHS = {
  login: "/auth/login",
  register: "/auth/register",
  forgotPassword: "/auth/forgot-password",
  resetPassword: "/auth/reset-password",
  verifyEmail: "/auth/verify-email",
  profile: "/auth/profile",
  security: "/auth/security",
};

const ADMIN_PATHS = {
  dashboard: "/admin/dashboard",
  inventory: "/admin/inventory",
  products: "/admin/products",
  customers: "/admin/customers",
  orders: "/admin/orders",
  users: "/admin/users",
  reports: "/admin/reports",
  settings: "/admin/settings",
  profile: "/admin/profile",
};

const CUSTOMER_PATHS = {
  dashboard: "/",
  products: "/products",
  orders: "/orders",
  profile: "/profile",
};

function normalizeRoutePath(pathname) {
  const cleaned = String(pathname || "").split("?")[0].split("#")[0].replace(/\/+$/, "");
  return cleaned || "/";
}

function defaultRouteForRole(role) {
  return role === "CUSTOMER" ? CUSTOMER_PATHS.dashboard : ADMIN_PATHS.dashboard;
}

function routePathForView(view, role) {
  if (role === "CUSTOMER") {
    if (view === "products") return CUSTOMER_PATHS.products;
    if (view === "orders") return CUSTOMER_PATHS.orders;
    if (view === "profile") return CUSTOMER_PATHS.profile;
    return CUSTOMER_PATHS.dashboard;
  }

  if (view === "inventory") return ADMIN_PATHS.inventory;
  if (view === "products") return ADMIN_PATHS.products;
  if (view === "customers") return ADMIN_PATHS.customers;
  if (view === "orders") return ADMIN_PATHS.orders;
  if (view === "users") return ADMIN_PATHS.users;
  if (view === "reports") return ADMIN_PATHS.reports;
  if (view === "settings") return ADMIN_PATHS.settings;
  if (view === "profile") return ADMIN_PATHS.profile;
  return ADMIN_PATHS.dashboard;
}

function viewForRoute(pathname, role) {
  const routePath = normalizeRoutePath(pathname);

  if (routePath === AUTH_PATHS.register) return "register";
  if (routePath === AUTH_PATHS.forgotPassword) return "forgot-password";
  if (routePath === AUTH_PATHS.resetPassword) return "reset-password";
  if (routePath === AUTH_PATHS.verifyEmail) return "verify-email";
  if (routePath === AUTH_PATHS.profile) return "profile";
  if (routePath === AUTH_PATHS.security) return "security";

  if (role === "CUSTOMER") {
    if (routePath === CUSTOMER_PATHS.products) return "products";
    if (routePath === CUSTOMER_PATHS.orders) return "orders";
    if (routePath === CUSTOMER_PATHS.profile) return "profile";
    return "dashboard";
  }

  if (routePath === ADMIN_PATHS.inventory) return "inventory";
  if (routePath === ADMIN_PATHS.products) return "products";
  if (routePath === ADMIN_PATHS.customers) return "customers";
  if (routePath === ADMIN_PATHS.orders) return "orders";
  if (routePath === ADMIN_PATHS.users) return "users";
  if (routePath === ADMIN_PATHS.reports) return "reports";
  if (routePath === ADMIN_PATHS.settings) return "settings";
  if (routePath === ADMIN_PATHS.profile) return "profile";
  return "dashboard";
}

function authModeForRoute(pathname) {
  return normalizeRoutePath(pathname) === AUTH_PATHS.register ? "register" : "login";
}

function resolveRoutePath(pathname, role, isAuthed) {
  const routePath = normalizeRoutePath(pathname);

  if (!isAuthed) {
    if (routePath === AUTH_PATHS.register) return AUTH_PATHS.register;
    return AUTH_PATHS.login;
  }

  if (role === "CUSTOMER") {
    if (Object.values(CUSTOMER_PATHS).includes(routePath)) return routePath;
    return CUSTOMER_PATHS.dashboard;
  }

  if (Object.values(ADMIN_PATHS).includes(routePath)) return routePath;
  return ADMIN_PATHS.dashboard;
}

export default function AppSaaS() {
  const [auth, setAuthState] = useState(getAuth());
  const [routePath, setRoutePath] = useState(() => resolveRoutePath(window.location.pathname, getAuth()?.user?.role ?? null, Boolean(getAuth()?.access_token)));
  const [authMode, setAuthMode] = useState(() => authModeForRoute(window.location.pathname));
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [busyAction, setBusyAction] = useState(null);
  const [toasts, setToasts] = useState([]);

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderDetails, setOrderDetails] = useState([]);
  const [users, setUsers] = useState([]);
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [settings, setSettings] = useState(emptySettings);

  // V3 Real observations & notifications states
  const [notifications, setNotifications] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  // Command Palette & AI Operations Assistant states
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState("");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState([
    { sender: "assistant", text: "👋 **Welcome to the StockFlow V3 Operations Assistant!**\n\nI have real-time access to database-backed stock levels, historical orders, and system activity logs.\n\nTry sending a message or click one of our operational quick commands below:", time: new Date() }
  ]);
  const [assistantInput, setAssistantInput] = useState("");

  const [loginForm, setLoginForm] = useState(emptyLogin);
  const [registerForm, setRegisterForm] = useState(emptyRegister);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [customerForm, setCustomerForm] = useState(emptyCustomer);
  const [orderForm, setOrderForm] = useState(emptyOrder);
  const [profileForm, setProfileForm] = useState(emptyProfile);
  const [passwordForm, setPasswordForm] = useState(emptyPassword);

  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productDialogMode, setProductDialogMode] = useState("create");
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productDrawerOpen, setProductDrawerOpen] = useState(false);
  const [productDrawerTab, setProductDrawerTab] = useState("overview");
  const [productSearch, setProductSearch] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [productSort, setProductSort] = useState("name");

  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);
  const [customerDrawerMode, setCustomerDrawerMode] = useState("view");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");

  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderSearch, setOrderSearch] = useState("");

  const [userSearch, setUserSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  // New Shopping Cart and Multi-Step Checkout States
  const [cart, setCart] = useState([]);
  const [checkoutStep, setCheckoutStep] = useState(1); // 1 = Cart Review, 2 = Customer Select, 3 = Confirmation, 4 = Complete
  const [checkoutCustomerId, setCheckoutCustomerId] = useState("");
  const [placedOrder, setPlacedOrder] = useState(null);

  const currentUser = auth?.user ?? null;
  const isAuthed = Boolean(auth?.access_token);
  const role = currentUser?.role ?? null;
  const view = useMemo(() => viewForRoute(routePath, role), [routePath, role]);
  const canManageCatalog = role === "ADMIN" || role === "STAFF";
  const canManageUsers = role === "ADMIN";
  const canManageProducts = canManageCatalog;
  const canManageOrders = role === "ADMIN" || role === "STAFF";

  const navItems = useMemo(() => {
    if (role === "CUSTOMER") {
      return [
        { key: "dashboard", label: "Home" },
        { key: "products", label: "Catalog" },
        { key: "orders", label: "My Orders" },
        { key: "profile", label: "Profile" },
      ];
    }

    const items = [
      { key: "dashboard", label: "Dashboard" },
      { key: "inventory", label: "Inventory" },
      { key: "products", label: "Products" },
      { key: "orders", label: "Orders" },
      { key: "customers", label: "Customers" },
      { key: "reports", label: "Reports" },
      { key: "settings", label: "Settings" },
    ];

    if (role === "ADMIN") {
      items.splice(6, 0, { key: "users", label: "Users" });
    }

    items.push({ key: "profile", label: "Profile" });
    return items;
  }, [role]);

  // Global Ctrl+K Keypress Hook
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const activeSearchValue =
    view === "products"
      ? productSearch
      : view === "customers"
        ? customerSearch
        : view === "orders"
          ? orderSearch
          : view === "users"
            ? userSearch
            : "";

  const activeSearchPlaceholder =
    view === "products"
      ? "Search products"
      : view === "customers"
        ? "Search customers"
        : view === "orders"
          ? "Search orders"
          : view === "users"
            ? "Search users"
            : "Search workspace (Ctrl+K)";

  const lowStockProducts = dashboard.low_stock_products;

  // Extract unique categories for catalog filter
  const uniqueCategories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return ["all", ...cats];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const search = productSearch.toLowerCase();
    const filtered = products
      .filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(search))
      .filter((product) => {
        if (productFilter === "low") return product.quantity_in_stock <= 2;
        if (productFilter === "healthy") return product.quantity_in_stock > 2;
        return true;
      })
      .filter((product) => {
        if (selectedCategoryFilter === "all") return true;
        return product.category === selectedCategoryFilter;
      });

    const sorted = [...filtered].sort((left, right) => {
      if (productSort === "stock") return Number(left.quantity_in_stock) - Number(right.quantity_in_stock);
      if (productSort === "price") return Number(right.price) - Number(left.price);
      return String(left.name).localeCompare(String(right.name));
    });

    return sorted;
  }, [products, productSearch, productFilter, selectedCategoryFilter, productSort]);

  const filteredCustomers = useMemo(() => customers.filter((customer) => `${customer.full_name} ${customer.email}`.toLowerCase().includes(customerSearch.toLowerCase())), [customers, customerSearch]);
  const filteredOrders = useMemo(() => orders.filter((order) => `${order.id} ${order.status} ${order.customer_id}`.toLowerCase().includes(orderSearch.toLowerCase())), [orders, orderSearch]);
  const filteredUsers = useMemo(() => users.filter((user) => `${user.full_name} ${user.username} ${user.email}`.toLowerCase().includes(userSearch.toLowerCase())), [users, userSearch]);
  const revenueSeries = useMemo(() => buildRevenueSeries(orders, 7), [orders]);
  const orderStatusSeries = useMemo(() => buildStatusSeries(orders), [orders]);
  const stockDistributionSeries = useMemo(() => {
    return products.slice(0, 5).map(p => ({ label: p.name, value: Number(p.quantity_in_stock || 0) }));
  }, [products]);
  const topCustomers = useMemo(() => buildTopCustomers(customers, orders), [customers, orders]);
  const ordersToday = useMemo(() => orders.filter((order) => new Date(order.created_at) >= startOfDay(new Date())).length, [orders]);
  const ordersThisMonth = useMemo(() => orders.filter((order) => new Date(order.created_at) >= startOfMonth(new Date())).length, [orders]);
  const averageOrderValue = useMemo(() => (orders.length ? orders.reduce((sum, order) => sum + toNumber(order.total_amount), 0) / orders.length : 0), [orders]);
  const repeatCustomers = useMemo(() => topCustomers.filter((customer) => customer.orders > 1).length, [topCustomers]);
  const totalUnitsInStock = useMemo(() => products.reduce((sum, product) => sum + toNumber(product.quantity_in_stock), 0), [products]);
  const totalUnitsReserved = useMemo(() => orderDetails.filter((order) => isOpenStatus(order.status)).reduce((sum, order) => sum + (order.items || []).reduce((itemSum, item) => itemSum + toNumber(item.quantity), 0), 0), [orderDetails]);
  const inventoryTurnover = useMemo(() => {
    const unitsSold = orderDetails.reduce((sum, order) => sum + (order.items || []).reduce((itemSum, item) => itemSum + toNumber(item.quantity), 0), 0);
    const baseInventory = totalUnitsInStock + unitsSold;
    return baseInventory > 0 ? unitsSold / baseInventory : 0;
  }, [orderDetails, totalUnitsInStock]);
  const inventoryMovements = useMemo(() => {
    const feed = [];

    orderDetails
      .slice()
      .sort((left, right) => new Date(right.created_at) - new Date(left.created_at))
      .slice(0, 6)
      .forEach((order) => {
        (order.items || []).forEach((item) => {
          const product = products.find((entry) => entry.id === item.product_id);
          feed.push({
            label: `Order #${order.id}`,
            quantity: `-${item.quantity}`,
            detail: `${product?.name || `Product #${item.product_id}`} · ${formatLongDate(order.created_at)}`,
          });
        });
      });

    return feed.slice(0, 8);
  }, [orderDetails, products]);
  const operationalPulse = useMemo(() => ({
    lowStockAlerts: lowStockProducts.length,
    stuckOrders: orders.filter((order) => ["pending", "processing"].includes(String(order.status).toLowerCase())).length,
    completedOrders: orders.filter((order) => String(order.status).toLowerCase() === "delivered").length,
    fastMovingProducts: dashboard.top_products.length,
  }), [lowStockProducts.length, orders, dashboard.top_products.length]);
  const selectedCustomerOrders = useMemo(() => (selectedCustomer?.id ? orders.filter((order) => order.customer_id === selectedCustomer.id) : []), [orders, selectedCustomer]);
  const selectedCustomerSpent = useMemo(() => selectedCustomerOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0), [selectedCustomerOrders]);
  const selectedProductAnalytics = useMemo(() => (selectedProduct ? buildProductAnalytics(selectedProduct, orderDetails, settings.low_stock_threshold) : null), [selectedProduct, orderDetails, settings.low_stock_threshold]);
  const selectedProductMovements = useMemo(() => (selectedProduct ? buildInventoryMovements(selectedProduct, orderDetails) : []), [selectedProduct, orderDetails]);
  const selectedProductOrderCount = selectedProductAnalytics?.relatedOrders.length || 0;
  const selectedProductLatestOrders = selectedProductAnalytics?.relatedOrders.slice(0, 5) || [];

  function toast(variant, title, description) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { id, variant, title, description }]);
    window.setTimeout(() => setToasts((current) => current.filter((entry) => entry.id !== id)), 4200);
  }

  function withBusy(actionName, handler) {
    return async (event) => {
      event.preventDefault();
      setBusyAction(actionName);
      try {
        return await handler(event);
      } finally {
        setBusyAction(null);
      }
    };
  }

  function clearWorkspaceState() {
    setProducts([]);
    setCustomers([]);
    setOrders([]);
    setOrderDetails([]);
    setUsers([]);
    setNotifications([]);
    setActivityLogs([]);
    setDashboard(emptyDashboard);
    setProductForm(emptyProduct);
    setCustomerForm(emptyCustomer);
    setOrderForm(emptyOrder);
    setProfileForm(emptyProfile);
    setPasswordForm(emptyPassword);
    setSelectedProductId(null);
    setSelectedProduct(null);
    setSelectedCustomer(null);
    setSelectedOrder(null);
    setProductDialogOpen(false);
    setProductDrawerOpen(false);
    setCustomerDrawerOpen(false);
    setOrderDrawerOpen(false);
    setConfirmAction(null);
    setProductDrawerTab("overview");
  }

  function handleSessionError(error) {
    if (error?.status !== 401) return false;
    clearAuth();
    setAuthState(null);
    clearWorkspaceState();
    setMessage("Session expired. Please sign in again.");
    return true;
  }

  async function loadWorkspace() {
    setIsLoading(true);
    try {
      const headers = authHeaders();
      const storedAuth = getAuth();
      const isManager = storedAuth?.user?.role === "ADMIN" || storedAuth?.user?.role === "STAFF";

      const [productList, customerList, orderList, profile, userList, notificationList, activityLogList] = await Promise.all([
        apiFetch("/products/", { headers }),
        canManageCatalog ? apiFetch("/customers/", { headers }) : Promise.resolve([]),
        apiFetch(role === "CUSTOMER" ? "/orders/my-orders" : "/orders/", { headers }),
        apiFetch("/auth/me", { headers }),
        canManageUsers ? apiFetch("/users/", { headers }) : Promise.resolve([]),
        isManager ? apiFetch("/notifications/", { headers }) : Promise.resolve([]),
        isManager ? apiFetch("/activity-logs/", { headers }) : Promise.resolve([]),
      ]);

      const now = new Date();
      const dayStart = startOfDay(now);
      const monthStart = startOfMonth(now);
      const recentOrders = orderList.slice(0, 5);
      const detailedOrders = await Promise.all(
        orderList.map(async (order) => {
          try {
            return await apiFetch(`/orders/${order.id}`, { headers });
          } catch {
            return null;
          }
        }),
      );

      const completeOrders = detailedOrders.filter(Boolean);

      const productSales = new Map();
      completeOrders.forEach((orderDetail) => {
        orderDetail.items?.forEach((item) => {
          productSales.set(item.product_id, (productSales.get(item.product_id) || 0) + Number(item.quantity || 0));
        });
      });

      const topProducts = [...productSales.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 5)
        .map(([productId, quantity]) => ({ product_id: productId, quantity, name: productList.find((product) => product.id === productId)?.name || `Product #${productId}` }));

      const revenueToday = orderList.filter((order) => new Date(order.created_at) >= dayStart).reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
      const revenueMonth = orderList.filter((order) => new Date(order.created_at) >= monthStart).reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

      setProducts(productList);
      setCustomers(customerList);
      setOrders(orderList);
      setOrderDetails(completeOrders);
      setUsers(userList);
      setNotifications(notificationList || []);
      setActivityLogs(activityLogList || []);

      setDashboard({
        total_products: productList.length,
        total_customers: customerList.length,
        total_orders: orderList.length,
        low_stock_products: productList.filter((product) => product.quantity_in_stock <= 2),
        revenue_today: revenueToday,
        revenue_month: revenueMonth,
        inventory_value: productList.reduce((sum, product) => sum + Number(product.price || 0) * Number(product.quantity_in_stock || 0), 0),
        pending_orders: orderList.filter((order) => isOpenStatus(order.status)).length,
        processing_orders: orderList.filter((order) => String(order.status).toLowerCase() === "processing").length,
        delivered_orders: orderList.filter((order) => String(order.status).toLowerCase() === "delivered").length,
        cancelled_orders: orderList.filter((order) => ["cancelled", "canceled"].includes(String(order.status).toLowerCase())).length,
        top_products: topProducts,
        recent_orders: recentOrders,
      });

      setProfileForm({ full_name: profile.full_name || "", email: profile.email || "", phone_number: profile.phone_number || "" });
      if (storedAuth?.access_token) {
        const nextAuth = { ...storedAuth, user: profile };
        setAuth(nextAuth, true);
        setAuthState(nextAuth);
      }
    } catch (error) {
      if (!handleSessionError(error)) setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthed) {
      clearWorkspaceState();
      return;
    }
    loadWorkspace();
  }, [isAuthed, role, canManageCatalog, canManageUsers]);

  useEffect(() => {
    const handlePopState = () => {
      const storedAuth = getAuth();
      const nextPath = resolveRoutePath(window.location.pathname, storedAuth?.user?.role ?? role, Boolean(storedAuth?.access_token));
      setRoutePath(nextPath);
      if (!storedAuth?.access_token) {
        setAuthMode(authModeForRoute(nextPath));
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [role]);

  useEffect(() => {
    const nextPath = resolveRoutePath(window.location.pathname, role, isAuthed);
    if (nextPath !== routePath) {
      setRoutePath(nextPath);
    }
  }, [role, isAuthed, routePath]);

  useEffect(() => {
    const canonicalPath = resolveRoutePath(routePath, role, isAuthed);
    if (canonicalPath !== routePath) {
      window.history.replaceState({}, "", canonicalPath);
      setRoutePath(canonicalPath);
      return;
    }

    if (!isAuthed) {
      const nextAuthMode = authModeForRoute(routePath);
      if (nextAuthMode !== authMode) {
        setAuthMode(nextAuthMode);
      }
    }
  }, [routePath, role, isAuthed, authMode]);

  useEffect(() => {
    if (!isAuthed) return;
    const allowed = navItems.map((item) => item.key);
    if (!allowed.includes(view)) {
      setRoutePath(routePathForView(roleHome(role), role));
    }
  }, [isAuthed, navItems, view, role]);

  useEffect(() => {
    if (!isAuthed || !currentUser) return;
    setProfileForm({ full_name: currentUser.full_name || "", email: currentUser.email || "", phone_number: currentUser.phone_number || "" });
  }, [isAuthed, currentUser]);

  function handleLogout() {
    clearAuth();
    setAuthState(null);
    clearWorkspaceState();
    window.history.replaceState({}, "", AUTH_PATHS.login);
    setRoutePath(AUTH_PATHS.login);
    setAuthMode("login");
    setMessage("");
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    try {
      const response = await apiFetch("/auth/login", { method: "POST", body: loginForm });
      setAuth(response, true);
      setAuthState(response);
      setLoginForm(emptyLogin);
      setMessage("");
      const nextPath = routePathForView(roleHome(response.user.role), response.user.role);
      window.history.replaceState({}, "", nextPath);
      setRoutePath(nextPath);
      toast("success", `Welcome back, ${response.user.username}.`, "Workspace loaded.");
    } catch (error) {
      if (!handleSessionError(error)) setMessage(error.message);
    }
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    if (registerForm.password !== registerForm.confirm_password) {
      setMessage("Passwords do not match.");
      return;
    }
    try {
      const response = await apiFetch("/auth/register", { method: "POST", body: registerForm });
      setAuth(response, true);
      setAuthState(response);
      setRegisterForm(emptyRegister);
      setMessage("");
      const nextPath = routePathForView(roleHome(response.user.role), response.user.role);
      window.history.replaceState({}, "", nextPath);
      setRoutePath(nextPath);
      toast("success", `Account created for ${response.user.username}.`, "Customer access is ready.");
    } catch (error) {
      if (!handleSessionError(error)) setMessage(error.message);
    }
  }

  function navigateToView(nextView, options = {}) {
    const nextPath = routePathForView(nextView, role);
    if (options.replace) {
      window.history.replaceState({}, "", nextPath);
    } else {
      window.history.pushState({}, "", nextPath);
    }
    setRoutePath(nextPath);
  }

  function setView(nextView) {
    navigateToView(nextView);
  }

  function openProductDialog(mode, product = null) {
    if (mode === "edit" && product) {
      setProductForm({ name: product.name, sku: product.sku, price: product.price, quantity_in_stock: product.quantity_in_stock, category: product.category || "" });
      setSelectedProductId(product.id);
    } else {
      setProductForm(emptyProduct);
      setSelectedProductId(null);
    }
    setProductDialogMode(mode);
    setProductDialogOpen(true);
  }

  function closeProductDialog() {
    setProductDialogOpen(false);
    setProductDialogMode("create");
    setSelectedProductId(null);
    setProductForm(emptyProduct);
  }

  function openProductDrawer(product) {
    setSelectedProduct(product);
    setProductDrawerTab("overview");
    setProductDrawerOpen(true);
  }

  function closeProductDrawer() {
    setSelectedProduct(null);
    setProductDrawerOpen(false);
    setProductDrawerTab("overview");
  }

  async function submitProduct(event) {
    event.preventDefault();
    const payload = { 
      name: productForm.name, 
      sku: productForm.sku, 
      price: Number(productForm.price), 
      quantity_in_stock: Number(productForm.quantity_in_stock),
      category: productForm.category || "Uncategorized"
    };
    try {
      const headers = authHeaders();
      if (productDialogMode === "edit" && selectedProductId) {
        await apiFetch(`/products/${selectedProductId}`, { method: "PUT", headers, body: payload });
        toast("success", "Product updated.", "Inventory changes saved.");
      } else {
        await apiFetch("/products/", { method: "POST", headers, body: payload });
        toast("success", "Product created.", "It now appears in the catalog.");
      }
      closeProductDialog();
      await loadWorkspace();
    } catch (error) {
      if (!handleSessionError(error)) setMessage(error.message);
    }
  }

  function requestDelete(kind, label, action) {
    setConfirmAction({ kind, label, action });
  }

  async function performDelete() {
    const nextAction = confirmAction;
    if (!nextAction) return;
    setConfirmAction(null);
    await nextAction.action();
  }

  function removeProduct(product) {
    requestDelete("product", product.name, async () => {
      try {
        await apiFetch(`/products/${product.id}`, { method: "DELETE", headers: authHeaders() });
        if (selectedProduct?.id === product.id) closeProductDrawer();
        toast("success", "Product deleted.", "Catalog refreshed.");
        await loadWorkspace();
      } catch (error) {
        if (!handleSessionError(error)) setMessage(error.message);
      }
    });
  }

  function openCustomerDrawer(customer, mode = "view") {
    setSelectedCustomer(customer);
    setCustomerForm({ full_name: customer.full_name || "", email: customer.email || "", phone_number: customer.phone_number || "" });
    setCustomerDrawerMode(mode);
    setCustomerDrawerOpen(true);
  }

  function closeCustomerDrawer() {
    setCustomerDrawerOpen(false);
    setSelectedCustomer(null);
    setCustomerDrawerMode("view");
    setCustomerForm(emptyCustomer);
  }

  async function submitCustomer(event) {
    event.preventDefault();
    try {
      const payload = { full_name: customerForm.full_name, email: customerForm.email, phone_number: customerForm.phone_number };
      if (selectedCustomer?.id) {
        await apiFetch(`/customers/${selectedCustomer.id}`, { method: "PUT", headers: authHeaders(), body: payload });
        toast("success", "Customer updated.", "Profile drawer refreshed.");
      } else {
        await apiFetch("/customers/", { method: "POST", headers: authHeaders(), body: payload });
        toast("success", "Customer created.", "A new profile is available.");
      }
      closeCustomerDrawer();
      await loadWorkspace();
    } catch (error) {
      if (!handleSessionError(error)) setMessage(error.message);
    }
  }

  function removeCustomer(customer) {
    requestDelete("customer", customer.full_name, async () => {
      try {
        await apiFetch(`/customers/${customer.id}`, { method: "DELETE", headers: authHeaders() });
        if (selectedCustomer?.id === customer.id) closeCustomerDrawer();
        toast("success", "Customer deleted.", "The profile was removed.");
        await loadWorkspace();
      } catch (error) {
        if (!handleSessionError(error)) setMessage(error.message);
      }
    });
  }

  async function openOrderDrawer(orderId) {
    try {
      const orderDetail = await apiFetch(`/orders/${orderId}`, { headers: authHeaders() });
      setSelectedOrder(orderDetail);
      setOrderDrawerOpen(true);
      setOrders((currentOrders) => currentOrders.map((order) => (order.id === orderDetail.id ? orderDetail : order)));
    } catch (error) {
      if (!handleSessionError(error)) setMessage(error.message);
    }
  }

  function closeOrderDrawer() {
    setOrderDrawerOpen(false);
    setSelectedOrder(null);
  }

  async function submitOrder(event) {
    event.preventDefault();
    const payload = { items: [{ product_id: Number(orderForm.product_id), quantity: Number(orderForm.quantity) }] };
    if (role !== "CUSTOMER") payload.customer_id = Number(orderForm.customer_id);

    try {
      await apiFetch("/orders/", { method: "POST", headers: authHeaders(), body: payload });
      setOrderForm(emptyOrder);
      toast("success", "Order created.", "Stock levels updated automatically.");
      await loadWorkspace();
    } catch (error) {
      if (!handleSessionError(error)) setMessage(error.message);
    }
  }

  // Shopping Cart & Multi-Step Checkout Actions
  function addToCart(product, quantity = 1) {
    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.product.id === product.id);
      if (existing) {
        const nextQty = Math.min(product.quantity_in_stock, existing.quantity + quantity);
        if (nextQty > existing.quantity) {
          toast("success", "Quantity Updated", `Increased ${product.name} quantity to ${nextQty} in cart.`);
        } else {
          toast("warning", "Stock Limit Reached", `Only ${product.quantity_in_stock} units available.`);
        }
        return currentCart.map((item) => item.product.id === product.id ? { ...item, quantity: nextQty } : item);
      }
      toast("success", "Item Added", `Added ${product.name} to cart.`);
      return [...currentCart, { product, quantity: Math.min(product.quantity_in_stock, quantity) }];
    });
  }

  function updateCartQuantity(productId, nextQty) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const finalQty = Math.max(1, Math.min(product.quantity_in_stock, nextQty));
    setCart((currentCart) =>
      currentCart.map((item) => item.product.id === productId ? { ...item, quantity: finalQty } : item)
    );
  }

  function removeFromCart(productId) {
    setCart((currentCart) => currentCart.filter((item) => item.product.id !== productId));
    toast("info", "Removed from Cart", "The item was removed from your shopping cart.");
  }

  function clearCart() {
    setCart([]);
    setCheckoutStep(1);
    setCheckoutCustomerId("");
    setPlacedOrder(null);
  }

  async function submitCartOrder(event) {
    if (event) event.preventDefault();
    if (!cart.length) {
      toast("warning", "Cart is Empty", "Add items to your cart first.");
      return;
    }
    
    const payload = {
      items: cart.map((item) => ({
        product_id: Number(item.product.id),
        quantity: Number(item.quantity)
      }))
    };
    
    if (role !== "CUSTOMER") {
      if (!checkoutCustomerId) {
        toast("warning", "Select Customer", "A customer must be assigned to this order.");
        setCheckoutStep(2);
        return;
      }
      payload.customer_id = Number(checkoutCustomerId);
    }

    try {
      setBusyAction("order");
      const newOrder = await apiFetch("/orders/", { method: "POST", headers: authHeaders(), body: payload });
      setPlacedOrder(newOrder);
      setCart([]);
      setCheckoutCustomerId("");
      setCheckoutStep(4);
      toast("success", "Order successfully placed!", `Order #${newOrder.id} complete. Inventory updated.`);
      await loadWorkspace();
    } catch (error) {
      if (!handleSessionError(error)) setMessage(error.message);
    } finally {
      setBusyAction(null);
    }
  }

  async function patchOrderStatus(orderId, nextStatus) {
    try {
      setBusyAction("order-status");
      const updatedOrder = await apiFetch(`/orders/${orderId}/status`, {
        method: "PATCH",
        headers: authHeaders(),
        body: { status: nextStatus }
      });
      setSelectedOrder(updatedOrder);
      setOrders(currentOrders => currentOrders.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
      toast("success", "Order Status Advanced", `Order #${orderId} is now ${nextStatus.toUpperCase()}.`);
      await loadWorkspace();
    } catch (error) {
      if (!handleSessionError(error)) setMessage(error.message);
    } finally {
      setBusyAction(null);
    }
  }

  async function submitProfile(event) {
    event.preventDefault();
    try {
      const updatedProfile = await apiFetch("/auth/me", { method: "PATCH", headers: authHeaders(), body: profileForm });
      const storedAuth = getAuth();
      if (storedAuth?.access_token) {
        const nextAuth = { ...storedAuth, user: updatedProfile };
        setAuth(nextAuth, true);
        setAuthState(nextAuth);
      }
      toast("success", "Profile updated.", "Your account information was saved.");
      await loadWorkspace();
    } catch (error) {
      if (!handleSessionError(error)) setMessage(error.message);
    }
  }

  async function submitPasswordChange(event) {
    event.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setMessage("Passwords do not match.");
      return;
    }
    try {
      await apiFetch("/auth/change-password", { method: "POST", headers: authHeaders(), body: passwordForm });
      setPasswordForm(emptyPassword);
      toast("success", "Password changed.", "Use the new password on your next sign-in.");
    } catch (error) {
      if (!handleSessionError(error)) setMessage(error.message);
    }
  }

  async function updateUserRole(userId, roleName) {
    try {
      const updatedUser = await apiFetch(`/users/${userId}/role`, { method: "PATCH", headers: authHeaders(), body: { role: roleName } });
      setUsers((currentUsers) => currentUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
      toast("success", "User role updated.", `${updatedUser.username} now has ${updatedUser.role} access.`);
    } catch (error) {
      if (!handleSessionError(error)) setMessage(error.message);
    }
  }

  function removeUser(user) {
    requestDelete("user", user.username, async () => {
      try {
        await apiFetch(`/users/${user.id}`, { method: "DELETE", headers: authHeaders() });
        toast("success", "User deleted.", "Account removed from the workspace.");
        await loadWorkspace();
      } catch (error) {
        if (!handleSessionError(error)) setMessage(error.message);
      }
    });
  }

  function dismissToast(id) {
    setToasts((current) => current.filter((toastItem) => toastItem.id !== id));
  }

  function handleTopbarSearchChange(nextValue) {
    if (view === "products") setProductSearch(nextValue);
    if (view === "customers") setCustomerSearch(nextValue);
    if (view === "orders") setOrderSearch(nextValue);
    if (view === "users") setUserSearch(nextValue);
  }

  // Real Database Notifications Dispatcher Actions
  async function markNotificationAsRead(id) {
    try {
      await apiFetch(`/notifications/${id}/read`, {
        method: "PATCH",
        headers: authHeaders(),
        body: { is_read: true }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      toast("info", "Alert cleared", "Marked item as read.");
      await loadWorkspace();
    } catch (error) {
      toast("error", "Action failed", error.message);
    }
  }

  async function clearAllNotifications() {
    try {
      await apiFetch("/notifications/clear-all", {
        method: "POST",
        headers: authHeaders()
      });
      setNotifications([]);
      toast("success", "All alerts cleared", "Clear all notifications triggered.");
      await loadWorkspace();
    } catch (error) {
      toast("error", "Action failed", error.message);
    }
  }

  async function handleReseedDemoData() {
    setIsLoading(true);
    try {
      await apiFetch("/admin/generate-demo-data", {
        method: "POST",
        headers: authHeaders()
      });
      toast("success", "Demo Dataset Seeded", "Generated 50 products across categories, 20 customers, and 100 historical orders!");
      await loadWorkspace();
    } catch (error) {
      toast("error", "Seeding failed", error.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Command Palette matching algorithms
  const commandMatches = useMemo(() => {
    const s = commandSearch.toLowerCase().trim();
    const list = [];
    
    // Core Admin actions
    if ("add product create item".includes(s) && canManageProducts) {
      list.push({ 
        label: "Create New Product", 
        description: "Open the product creation details form", 
        icon: "plus", 
        action: () => { setCommandPaletteOpen(false); openProductDialog("create"); } 
      });
    }
    if ("generate demo data reseed database hydrate postgres".includes(s) && canManageCatalog) {
      list.push({ 
        label: "Reseed System Demo Data", 
        description: "Generate 50 products, 20 customers, and 100 orders distributed over 30 days", 
        icon: "sparkles", 
        action: () => { setCommandPaletteOpen(false); handleReseedDemoData(); } 
      });
    }
    if ("toggle theme dark mode light mode appearance background".includes(s)) {
      list.push({ 
        label: "Toggle System Appearance", 
        description: "Switch between Light and Dark mode options", 
        icon: "sun", 
        action: () => { 
          setCommandPaletteOpen(false); 
          const root = document.documentElement;
          const current = root.classList.contains("dark") ? "dark" : "light";
          const next = current === "light" ? "dark" : "light";
          if (next === "dark") root.classList.add("dark");
          else root.classList.remove("dark");
          localStorage.setItem("theme", next);
        } 
      });
    }
    
    // Module Navigation mapping
    navItems.forEach(item => {
      if (item.label.toLowerCase().includes(s)) {
        list.push({
          label: `Navigate to: ${item.label}`,
          description: `Switch view directly to the ${item.label} section`,
          icon: item.key,
          action: () => { setCommandPaletteOpen(false); setView(item.key); }
        });
      }
    });

    // In-memory catalog matching
    if (s.length > 0) {
      products.forEach(p => {
        if (p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s)) {
          list.push({
            label: `Inspect Product: ${p.name}`,
            description: `SKU: ${p.sku} | Price: ${money(p.price)} | Stock: ${p.quantity_in_stock}`,
            icon: "products",
            action: () => { setCommandPaletteOpen(false); openProductDrawer(p); }
          });
        }
      });

      // In-memory order tracking matching
      orders.forEach(o => {
        if (String(o.id).includes(s) || o.status.toLowerCase().includes(s)) {
          list.push({
            label: `Inspect Order #${o.id}`,
            description: `Status: ${o.status.toUpperCase()} | Total: ${money(o.total_amount)}`,
            icon: "orders",
            action: () => { setCommandPaletteOpen(false); openOrderDrawer(o.id); }
          });
        }
      });
    }

    return list;
  }, [commandSearch, products, orders, canManageProducts, canManageCatalog, navItems]);

  // Operations Assistant natural language command runner
  function handleAssistantSend(textToSend = null) {
    const text = (textToSend || assistantInput).trim();
    if (!text) return;
    
    const userMsg = { sender: "user", text, time: new Date() };
    setAssistantMessages((prev) => [...prev, userMsg]);
    setAssistantInput("");

    setTimeout(() => {
      let reply = "";
      const lower = text.toLowerCase();

      if (lower.startsWith("/help")) {
        reply = "🛠️ **Available Operational Commands**:\n\n" +
                "• `/status` - Get an executive inventory and sales overview\n" +
                "• `/low-stock` - List all catalog items with low-stock warnings\n" +
                "• `/reseed` - Re-generate a full 30-day corporate dataset\n" +
                "• `/categories` - Breakdown stock distribution by product categories\n" +
                "• `/help` - Show this instructions menu";
      } else if (lower.startsWith("/status")) {
        const totalProducts = products.length;
        const lowStockCount = products.filter(p => p.quantity_in_stock <= 2).length;
        const pendingOrders = orders.filter(o => isOpenStatus(o.status)).length;
        const totalRev = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
        
        reply = `📊 **StockFlow System Status Snapshot**:\n\n` +
                `• **Total Products**: ${totalProducts} items cataloged\n` +
                `• **Low-Stock Alert items**: ${lowStockCount} items requiring reorder attention\n` +
                `• **Open Pending Orders**: ${pendingOrders} orders active\n` +
                `• **Historical Monitored Revenue**: **${money(totalRev)}**`;
      } else if (lower.startsWith("/low-stock")) {
        const lowStock = products.filter(p => p.quantity_in_stock <= 2);
        if (lowStock.length === 0) {
          reply = "✅ **Catalog Health is Optimal!** No items are currently below the low-stock alert threshold (<= 2 units on hand).";
        } else {
          reply = `⚠️ **Active Low Stock Warnings** (${lowStock.length} items):\n\n` +
                  lowStock.map((p, idx) => `${idx + 1}. **${p.name}** (SKU: \`${p.sku}\`): **${p.quantity_in_stock} on hand**`).join("\n");
        }
      } else if (lower.startsWith("/categories")) {
        const categories = {};
        products.forEach(p => {
          const cat = p.category || "Uncategorized";
          categories[cat] = (categories[cat] || 0) + Number(p.quantity_in_stock || 0);
        });
        
        reply = "🗂️ **Stock Distribution by Category**:\n\n" +
                Object.entries(categories).map(([cat, qty]) => `• **${cat}**: ${qty} units in stock`).join("\n");
      } else if (lower.startsWith("/reseed")) {
        reply = "⚡ **Triggering corporate seeding database upgrade...** Please hold on while the server hydrates the PostgreSQL stack.";
        handleReseedDemoData();
      } else {
        const matchedProducts = products.filter(p => p.name.toLowerCase().includes(lower) || p.sku.toLowerCase().includes(lower));
        if (matchedProducts.length > 0) {
          reply = `🔍 **Found ${matchedProducts.length} matching products**:\n\n` +
                  matchedProducts.slice(0, 5).map(p => `• **${p.name}** (SKU: \`${p.sku}\`): **${money(p.price)}** | On hand: **${p.quantity_in_stock}**`).join("\n") +
                  (matchedProducts.length > 5 ? "\n*(Only first 5 results displayed)*" : "");
        } else {
          reply = `🤖 **Operations Assistant Response**:\n\n` +
                  `I received your query: *"${text}"*.\n\n` +
                  `To get concrete database metrics, try typing one of our commands: \`/status\`, \`/low-stock\`, \`/categories\`, or \`/reseed\`.`;
        }
      }

      setAssistantMessages((prev) => [...prev, { sender: "assistant", text: reply, time: new Date() }]);
    }, 600);
  }

  if (!isAuthed) {
    return (
      <div className="auth-shell">
        <div className="auth-hero">
          <div className="brand-block brand-block--large">
            <div className="brand-mark">SF</div>
            <div>
              <p className="brand-name">StockFlow V3</p>
              <p className="brand-copy">A high-fidelity enterprise console for real-time inventory metrics, checkout workflows, and audit observables.</p>
            </div>
          </div>
          <div className="auth-hero-copy">
            <Badge tone="success">Operational Console</Badge>
            <h1>High-fidelity inventory engineering that behaves like a production SaaS platform, not a basic form tracker.</h1>
            <p>Role-aware separation, audit timeline observables, live notification streams, and shopping cart checkout flows are integrated native into the core console.</p>
            <div className="auth-points">
              <span>Admin, Operations Staff, & Client Portals</span>
              <span>Centralized Observabilities Activity Logs</span>
              <span>Fully Responsive Command Palette & AI Assistant</span>
            </div>
          </div>
        </div>

        <Card className="auth-card">
          <div className="auth-switcher">
            <Button variant={authMode === "login" ? "primary" : "ghost"} onClick={() => setAuthMode("login")} type="button">Sign in</Button>
            <Button variant={authMode === "register" ? "primary" : "ghost"} onClick={() => setAuthMode("register")} type="button">Create account</Button>
          </div>

          {authMode === "login" ? (
            <form className="auth-form" onSubmit={withBusy("login", handleLoginSubmit)}>
              <Input label="Email or username" placeholder="admin" autoComplete="username" value={loginForm.identifier} onChange={(event) => setLoginForm({ ...loginForm, identifier: event.target.value })} />
              <PasswordField label="Password" placeholder="Enter your password" autoComplete="current-password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} />
              <Button variant="primary" type="submit" disabled={busyAction === "login"}>Continue</Button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={withBusy("register", handleRegisterSubmit)}>
              <Input label="Full name" placeholder="Taylor Reed" value={registerForm.full_name} onChange={(event) => setRegisterForm({ ...registerForm, full_name: event.target.value })} />
              <Input label="Username" placeholder="taylor" autoComplete="username" value={registerForm.username} onChange={(event) => setRegisterForm({ ...registerForm, username: event.target.value })} />
              <Input label="Email" type="email" placeholder="taylor@company.com" autoComplete="email" value={registerForm.email} onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })} />
              <PasswordField label="Password" placeholder="Create a password" autoComplete="new-password" value={registerForm.password} onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })} />
              <PasswordField label="Confirm password" placeholder="Repeat the password" autoComplete="new-password" value={registerForm.confirm_password} onChange={(event) => setRegisterForm({ ...registerForm, confirm_password: event.target.value })} />
              <Button variant="primary" type="submit" disabled={busyAction === "register"}>Create account</Button>
            </form>
          )}

          <div className="auth-footer">
            <Badge tone="success">admin / password</Badge>
            <Badge tone="warning">staff / password</Badge>
            <Badge tone="neutral">customer / password</Badge>
          </div>
          {message ? <p className="inline-message">{message}</p> : null}
        </Card>
      </div>
    );
  }

  return (
    <AppChrome
      navigation={navItems}
      activeView={view}
      onNavigate={setView}
      currentUser={currentUser}
      role={role}
      searchValue={activeSearchValue}
      searchPlaceholder={activeSearchPlaceholder}
      onSearchChange={handleTopbarSearchChange}
      notifications={notifications}
      onNotificationRead={markNotificationAsRead}
      onNotificationClearAll={clearAllNotifications}
      onAssistantTrigger={() => setAssistantOpen(prev => !prev)}
      onCommandPaletteTrigger={() => setCommandPaletteOpen(true)}
      onProfile={() => setView("profile")}
      onLogout={handleLogout}
    >
      {message ? <div className="notice notice--inline">{message}</div> : null}
      {isLoading ? <div className="notice notice--inline notice--loading">Synchronizing StockFlow workspace...</div> : null}

      <section className="page-hero">
        <div>
          <Badge tone={roleBadgeTone(role)}>{role} portal active</Badge>
          <h1>
            {view === "dashboard"
              ? role === "CUSTOMER"
                ? "Self-service home"
                : "Command center"
              : view === "inventory"
                ? "Inventory Observability"
                : view === "products"
                  ? role === "CUSTOMER" ? "Catalog" : "Products"
                  : view === "customers"
                    ? "Customers"
                    : view === "orders"
                      ? role === "CUSTOMER" ? "My orders" : "Orders"
                      : view === "users"
                        ? "Users"
                        : view === "reports"
                          ? "Reports"
                          : view === "settings"
                            ? "Settings"
                            : "Profile"}
          </h1>
          <p>
            {view === "dashboard"
              ? role === "CUSTOMER"
                ? "Browse products and track your orders in a self-service workspace."
                : "Business command center with live KPIs, alerts, and workflow shortcuts."
              : view === "inventory"
                ? "Inventory health, stock level, and movement-oriented operations."
                : view === "products"
                  ? "Search, inspect, and manage product records from a table-first module."
                  : view === "customers"
                    ? "View customer profiles, order history, and current spend."
                    : view === "orders"
                      ? "Track status, inspect details, and manage order operations."
                      : view === "users"
                        ? "Assign roles and manage account access."
                        : view === "reports"
                          ? "Operational reporting and trend summaries."
                          : view === "settings"
                            ? "Company, inventory, and security settings."
                            : "Update profile and security settings."}
          </p>
        </div>
        <div className="page-hero-actions">
          {view === "products" && canManageProducts ? <Button variant="primary" onClick={() => openProductDialog("create")}>Add product</Button> : null}
          {view === "customers" && canManageCustomers ? <Button variant="primary" onClick={() => openCustomerDrawer({ id: null, ...emptyCustomer }, "edit")}>Add customer</Button> : null}
          {view === "orders" && canManageOrders ? <Button variant="primary" onClick={() => setOrderForm(emptyOrder)}>New order</Button> : null}
        </div>
      </section>

      {view === "dashboard" ? (
        role === "CUSTOMER" ? (
          <div className="dashboard-grid dashboard-grid--customer">
            <Card className="panel-card panel-card--hero">
              <SectionHeader kicker="Self-service" title="My account" description="Use the catalog, review order activity, and keep your profile current." />
              <div className="action-grid action-grid--wide">
                <Button variant="primary" onClick={() => setView("orders")}>My orders</Button>
                <Button variant="secondary" onClick={() => setView("products")}>Catalog</Button>
                <Button variant="ghost" onClick={() => setView("profile")}>Profile</Button>
              </div>
            </Card>

            <Card className="panel-card">
              <SectionHeader kicker="Recent orders" title="Latest activity" action={<Button variant="ghost" size="sm" onClick={() => setView("orders")}>Open orders</Button>} />
              {orders.length ? (
                <div className="mini-list">
                  {orders.slice(0, 5).map((order) => (
                    <button key={order.id} className="mini-row" type="button" onClick={() => openOrderDrawer(order.id)}>
                      <span>
                        <strong>Order #{order.id}</strong>
                        <span>{order.status}</span>
                      </span>
                      <Badge tone={isOpenStatus(order.status) ? "warning" : "success"}>{money(order.total_amount)}</Badge>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="empty-state compact"><h3>No orders yet</h3><p>Your order history will appear here.</p></div>
              )}
            </Card>

            <Card className="panel-card">
              <SectionHeader kicker="Catalog" title="Browse products" />
              <div className="mini-list">
                {products.slice(0, 5).map((product) => (
                  <div key={product.id} className="alert-row">
                    <div>
                      <strong>{product.name}</strong>
                      <p>SKU {product.sku} | Category: {product.category || "General"}</p>
                    </div>
                    <Badge tone={product.quantity_in_stock <= 2 ? "warning" : "success"}>{product.quantity_in_stock} in stock</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : (
          <div className="dashboard-grid" style={{ display: "grid", gap: "24px" }}>
            <div className="dashboard-metrics">
              {isLoading ? (
                <>
                  <Skeleton className="metric-skeleton" />
                  <Skeleton className="metric-skeleton" />
                  <Skeleton className="metric-skeleton" />
                  <Skeleton className="metric-skeleton" />
                </>
              ) : (
                <>
                  <StatCard label="Revenue today" value={money(dashboard.revenue_today)} hint="Orders placed today" tone="primary" />
                  <StatCard label="Revenue this month" value={money(dashboard.revenue_month)} hint="Month-to-date sales" tone="primary" />
                  <StatCard label="Pending orders" value={dashboard.pending_orders} hint="Need processing" />
                  <StatCard label="Inventory value" value={money(dashboard.inventory_value)} hint="On-hand stock value" tone="alert" />
                </>
              )}
            </div>

            {!isLoading && (
              <div className="dashboard-charts" style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: "20px" }}>
                <Card className="panel-card" style={{ padding: "20px" }}>
                  <SectionHeader kicker="7-Day Performance" title="Sales Revenue Trend" description="Real-time sales revenue history tracked across the last 7 calendar days." />
                  <div style={{ padding: "16px 0 0" }}>
                    <SalesTrendChart data={revenueSeries} />
                  </div>
                </Card>
                <Card className="panel-card" style={{ padding: "20px" }}>
                  <SectionHeader kicker="Inventory Split" title="Stock Distribution" description="Visual breakdown of the stock quantities of your fast-moving inventory items." />
                  <div style={{ padding: "16px 0 0", display: "flex", justifyContent: "center" }}>
                    <StockDistributionChart data={stockDistributionSeries} />
                  </div>
                </Card>
              </div>
            )}

            <div className="dashboard-content">
              <Card className="panel-card">
                <SectionHeader kicker="Orders" title="Latest activity" action={<Button variant="ghost" size="sm" onClick={() => setView("orders")}>Open orders</Button>} />
                {dashboard.recent_orders.length ? (
                  <div className="mini-list">
                    {dashboard.recent_orders.map((order) => (
                      <button key={order.id} className="mini-row" type="button" onClick={() => openOrderDrawer(order.id)}>
                        <span>
                          <strong>Order #{order.id}</strong>
                          <span>{money(order.total_amount)}</span>
                        </span>
                        <Badge tone={isOpenStatus(order.status) ? "warning" : "success"}>{order.status}</Badge>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state compact"><h3>No orders yet</h3><p>Create the first order to populate the activity feed.</p></div>
                )}
              </Card>

              <Card className="panel-card">
                <SectionHeader kicker="Inventory alerts" title="Needs attention" action={<Badge tone={lowStockProducts.length ? "warning" : "neutral"}>{lowStockProducts.length} alerts</Badge>} />
                {lowStockProducts.length ? (
                  <div className="mini-list">
                    {lowStockProducts.slice(0, 5).map((product) => (
                      <div key={product.id} className="alert-row">
                        <div>
                          <strong>{product.name}</strong>
                          <p>SKU {product.sku}</p>
                        </div>
                        <Badge tone="warning">{product.quantity_in_stock} left</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state compact"><h3>Stock looks healthy</h3><p>No products are below the low-stock threshold.</p></div>
                )}
              </Card>

              <Card className="panel-card">
                <SectionHeader kicker="Top products" title="Most sold items" />
                {dashboard.top_products.length ? (
                  <div className="mini-list">
                    {dashboard.top_products.map((product) => (
                      <div key={product.product_id} className="alert-row">
                        <div>
                          <strong>{product.name}</strong>
                          <p>{product.quantity} units sold</p>
                        </div>
                        <Badge tone="neutral">#{product.product_id}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state compact"><h3>No sales history</h3><p>Top products will appear after orders are loaded.</p></div>
                )}
              </Card>
            </div>

            {/* V3 Observability Audit Timeline */}
            <Card className="panel-card panel-card--wide">
              <SectionHeader 
                kicker="System observability" 
                title="Activity logs & corporate audit trail" 
                description="Live stream of administrative actions, order entries, and inventory state modifications." 
                action={
                  <Button variant="ghost" size="sm" onClick={loadWorkspace} disabled={isLoading}>
                    Refresh feed
                  </Button>
                }
              />
              {activityLogs.length ? (
                <div className="line-items line-items--timeline" style={{ display: "grid", gap: "10px", marginTop: "16px" }}>
                  {activityLogs.slice(0, 8).map((log) => (
                    <div key={log.id} className="line-item" style={{ padding: "12px", border: "1px solid var(--border)", borderRadius: "12px", background: "var(--surface-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ fontSize: "13px", color: "var(--text)" }}>{(log.event || log.action || "Event").replace(/_/g, ' ').toUpperCase()}</strong>
                        <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: "12px" }}>{log.details}</p>
                        <small style={{ color: "var(--muted)", fontSize: "10px", opacity: 0.8 }}>
                          System Event · {new Date(log.created_at).toLocaleString()}
                        </small>
                      </div>
                      <Badge tone={
                        (log.event || log.action || "").toLowerCase().includes("create") || (log.event || log.action || "").toLowerCase().includes("seed") || (log.event || log.action || "").toLowerCase().includes("init") ? "success" :
                        (log.event || log.action || "").toLowerCase().includes("delete") || (log.event || log.action || "").toLowerCase().includes("cancel") ? "danger" : "warning"
                      }>
                        {(log.event || log.action || "Activity").split(" ")[0]}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state compact"><h3>No audit entries recorded</h3><p>Mutations like creating products or completing orders will feed the timeline.</p></div>
              )}
            </Card>
          </div>
        )
      ) : null}

      {view === "inventory" && role !== "CUSTOMER" ? (
        <div className="page-stack">
          <div className="dashboard-metrics dashboard-metrics--reports">
            <StatCard label="Inventory value" value={money(dashboard.inventory_value)} tone="primary" />
            <StatCard label="Total units" value={totalUnitsInStock} />
            <StatCard label="Reserved stock" value={totalUnitsReserved} />
            <StatCard label="Low stock alerts" value={lowStockProducts.length} tone="alert" />
            <StatCard label="Turnover ratio" value={`${Math.round(inventoryTurnover * 100)}%`} />
          </div>

          <div className="dashboard-content dashboard-content--inventory">
            <Card className="panel-card panel-card--wide">
              <SectionHeader kicker="Inventory analytics" title="Stock health and movement" description="Track available stock, reserved units, and turnover." />
              <div className="inventory-analytics-grid">
                <div className="metric-rail">
                  <span>Fast moving products</span>
                  <strong>{dashboard.top_products.length}</strong>
                  <small>Products driving the most sales volume.</small>
                </div>
                <div className="metric-rail">
                  <span>Dead stock items</span>
                  <strong>{Math.max(0, products.length - dashboard.top_products.length)}</strong>
                  <small>Items not yet appearing in the sales mix.</small>
                </div>
                <div className="metric-rail">
                  <span>Average coverage</span>
                  <strong>{totalUnitsInStock ? `${Math.max(1, Math.round(totalUnitsInStock / Math.max(1, lowStockProducts.length || 1)))} days` : "—"}</strong>
                  <small>Simple signal for stock endurance.</small>
                </div>
              </div>
            </Card>

            <Card className="table-card">
              <SectionHeader kicker="Inventory table" title="Inventory by product" description="A dedicated module for stock health and quantity management." />
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Product</th><th>Category</th><th>Current Stock</th><th>Reserved</th><th>Available</th><th>Threshold</th><th>Status</th><th>Risk</th></tr></thead>
                  <tbody>
                    {products.map((product) => {
                      const reserved = orderDetails.filter((order) => isOpenStatus(order.status)).reduce((sum, order) => sum + (order.items || []).filter((item) => item.product_id === product.id).reduce((itemSum, item) => itemSum + toNumber(item.quantity), 0), 0);
                      return (
                        <tr key={product.id}>
                          <td>{product.name}</td>
                          <td><Badge tone="neutral">{product.category || "Uncategorized"}</Badge></td>
                          <td>{product.quantity_in_stock}</td>
                          <td>{reserved}</td>
                          <td>{Math.max(0, product.quantity_in_stock - reserved)}</td>
                          <td>{settings.low_stock_threshold}</td>
                          <td><Badge tone={product.quantity_in_stock <= settings.low_stock_threshold ? "warning" : "success"}>{product.quantity_in_stock <= settings.low_stock_threshold ? "Low" : "Healthy"}</Badge></td>
                          <td>{product.quantity_in_stock <= settings.low_stock_threshold ? "High" : "Watch"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="panel-card panel-card--wide">
              <SectionHeader kicker="Movement log" title="Recent inventory movements" description="Derived from order items and current on-hand stock." />
              {inventoryMovements.length ? (
                <div className="line-items line-items--timeline">
                  {inventoryMovements.map((movement, index) => (
                    <div key={`${movement.label}-${index}`} className="line-item">
                      <div>
                        <strong>{movement.label}</strong>
                        <p>{movement.detail}</p>
                      </div>
                      <Badge tone={movement.quantity.startsWith("-") ? "warning" : "success"}>{movement.quantity}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state compact"><h3>No movements yet</h3><p>Inventory changes will appear here after orders are processed.</p></div>
              )}
            </Card>
          </div>
        </div>
      ) : null}

      {view === "products" ? (
        <div className="page-stack">
          <Card className="toolbar-card">
            <div className="toolbar-card__row">
              <Input label="Search products" placeholder="Search by name or SKU" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} />
              
              <label className="field">
                <span className="field-label">Category</span>
                <select className="ui-input" value={selectedCategoryFilter} onChange={(event) => setSelectedCategoryFilter(event.target.value)}>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat === "all" ? "All Categories" : cat}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field-label">Stock Status</span>
                <select className="ui-input" value={productFilter} onChange={(event) => setProductFilter(event.target.value)}>
                  <option value="all">All stock</option>
                  <option value="healthy">Healthy stock</option>
                  <option value="low">Low stock</option>
                </select>
              </label>

              <label className="field">
                <span className="field-label">Sort By</span>
                <select className="ui-input" value={productSort} onChange={(event) => setProductSort(event.target.value)}>
                  <option value="name">Name</option>
                  <option value="stock">Stock</option>
                  <option value="price">Price</option>
                </select>
              </label>
            </div>
            <div className="toolbar-card__actions">{canManageProducts ? <Button variant="primary" onClick={() => openProductDialog("create")}>Add product</Button> : null}</div>
          </Card>

          <Card className="table-card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Category</th><th>SKU</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredProducts.length ? filteredProducts.map((product) => (
                    <tr key={product.id} className="table-row-hover">
                      <td>{product.name}</td>
                      <td><Badge tone="neutral">{product.category || "Uncategorized"}</Badge></td>
                      <td>{product.sku}</td>
                      <td>{money(product.price)}</td>
                      <td>{product.quantity_in_stock}</td>
                      <td><Badge tone={product.quantity_in_stock <= 2 ? "warning" : "success"}>{product.quantity_in_stock <= 2 ? "Low stock" : "Healthy"}</Badge></td>
                      <td>
                        <div className="row-actions">
                          <Button variant="ghost" size="sm" onClick={() => openProductDrawer(product)}>View</Button>
                          <Button variant="secondary" size="sm" onClick={() => addToCart(product, 1)} disabled={product.quantity_in_stock <= 0}>
                            {product.quantity_in_stock <= 0 ? "Out of stock" : "Add to cart"}
                          </Button>
                          {canManageProducts ? <Button variant="secondary" size="sm" onClick={() => openProductDialog("edit", product)}>Edit</Button> : null}
                          {canManageProducts ? <Button variant="danger" size="sm" onClick={() => removeProduct(product)}>Delete</Button> : null}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={7}><div className="empty-state inline"><h3>No products found</h3><p>{productSearch ? "Try another search." : "Create your first product to populate the catalog."}</p>{canManageProducts ? <Button variant="primary" onClick={() => openProductDialog("create")}>Add product</Button> : null}</div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}

      {/* Shopping Cart & Multi-Step Checkout UI Panel (Always accessible in product view or layout sidebar) */}
      {view === "products" && cart.length > 0 && (
        <Card className="panel-card" style={{ marginTop: "24px", border: "2px solid var(--accent-strong)" }}>
          <SectionHeader kicker="Checkout Flow" title="Shopping Cart Drawer" action={<Button variant="ghost" size="sm" onClick={clearCart}>Clear Cart</Button>} />
          
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "20px", marginTop: "16px" }}>
            {/* Step 1: Cart review */}
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "12px" }}>Selected Products ({cart.length})</h3>
              <div className="line-items" style={{ display: "grid", gap: "8px" }}>
                {cart.map((item) => (
                  <div key={item.product.id} className="line-item" style={{ padding: "12px", border: "1px solid var(--border)", borderRadius: "10px", background: "var(--surface-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong>{item.product.name}</strong>
                      <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: "12px" }}>{money(item.product.price)} each • Max: {item.product.quantity_in_stock}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input 
                        type="number" 
                        min="1" 
                        max={item.product.quantity_in_stock} 
                        value={item.quantity} 
                        onChange={(e) => updateCartQuantity(item.product.id, parseInt(e.target.value))} 
                        style={{ width: "60px", padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--border)" }}
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeFromCart(item.product.id)}>×</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right side check info */}
            <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: "20px" }}>
              <div style={{ display: "grid", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Subtotal:</span>
                  <strong>{money(cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0))}</strong>
                </div>

                {role !== "CUSTOMER" && (
                  <label className="field">
                    <span className="field-label">Assign Customer:</span>
                    <select className="ui-input" value={checkoutCustomerId} onChange={(e) => setCheckoutCustomerId(e.target.value)}>
                      <option value="">-- Choose Customer --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>
                      ))}
                    </select>
                  </label>
                )}

                <Button 
                  variant="primary" 
                  onClick={submitCartOrder} 
                  disabled={busyAction === "order" || (role !== "CUSTOMER" && !checkoutCustomerId)}
                  style={{ width: "100%", marginTop: "8px" }}
                >
                  {busyAction === "order" ? "Placing Order..." : "Confirm & Place Order"}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {view === "customers" && role !== "CUSTOMER" ? (
        <div className="page-stack">
          <Card className="toolbar-card">
            <div className="toolbar-card__row">
              <Input label="Search customers" placeholder="Search by name or email" value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} />
            </div>
            <div className="toolbar-card__actions">{canManageCustomers ? <Button variant="primary" onClick={() => openCustomerDrawer({ id: null, ...emptyCustomer }, "edit")}>Add customer</Button> : null}</div>
          </Card>

          <Card className="table-card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredCustomers.length ? filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="table-row-hover">
                      <td>{customer.full_name}</td>
                      <td>{customer.email}</td>
                      <td>{customer.phone_number || "—"}</td>
                      <td>
                        <div className="row-actions">
                          <Button variant="ghost" size="sm" onClick={() => openCustomerDrawer(customer, "view")}>View profile</Button>
                          {canManageCustomers ? <Button variant="secondary" size="sm" onClick={() => openCustomerDrawer(customer, "edit")}>Edit</Button> : null}
                          {canManageCustomers ? <Button variant="danger" size="sm" onClick={() => removeCustomer(customer)}>Delete</Button> : null}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4}><div className="empty-state inline"><h3>No customers found</h3><p>{customerSearch ? "Try another search." : "Add your first customer profile to start tracking spend."}</p>{canManageCustomers ? <Button variant="primary" onClick={() => openCustomerDrawer({ id: null, ...emptyCustomer }, "edit")}>Add customer</Button> : null}</div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}

      {view === "orders" ? (
        <div className="page-stack">
          <Card className="toolbar-card">
            <div className="toolbar-card__row">
              <Input label="Search orders" placeholder="Search by order ID or status" value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} />
            </div>
            <div className="toolbar-card__actions">{canManageOrders ? <Button variant="primary" onClick={() => setView("products")}>Create Order in Catalog</Button> : null}</div>
          </Card>

          <Card className="table-card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Order ID</th><th>Customer ID</th><th>Status</th><th>Total</th><th>Date Placed</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredOrders.length ? filteredOrders.map((order) => (
                    <tr key={order.id} className="table-row-hover">
                      <td><strong>Order #{order.id}</strong></td>
                      <td>Customer #{order.customer_id}</td>
                      <td><Badge tone={isOpenStatus(order.status) ? "warning" : "success"}>{order.status.toUpperCase()}</Badge></td>
                      <td><strong>{money(order.total_amount)}</strong></td>
                      <td>{formatLongDate(order.created_at)}</td>
                      <td>
                        <div className="row-actions">
                          <Button variant="ghost" size="sm" onClick={() => openOrderDrawer(order.id)}>Inspect details</Button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6}><div className="empty-state inline"><h3>No orders found</h3><p>{orderSearch ? "Try another search." : "No orders are currently available."}</p></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}

      {view === "users" && role === "ADMIN" ? (
        <div className="page-stack">
          <Card className="toolbar-card">
            <div className="toolbar-card__row">
              <Input label="Search users" placeholder="Search by name, email or username" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} />
            </div>
          </Card>

          <Card className="table-card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Assigned Role</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredUsers.length ? filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.full_name}</td>
                      <td><strong>{user.username}</strong></td>
                      <td>{user.email}</td>
                      <td><Badge tone={roleBadgeTone(user.role)}>{user.role}</Badge></td>
                      <td>
                        {user.id !== currentUser.id && (
                          <div className="row-actions">
                            <select className="ui-input" style={{ width: "120px", height: "30px", minHeight: "30px", padding: "2px 6px", fontSize: "12px", borderRadius: "6px" }} value={user.role} onChange={(e) => updateUserRole(user.id, e.target.value)}>
                              <option value="ADMIN">ADMIN</option>
                              <option value="STAFF">STAFF</option>
                              <option value="CUSTOMER">CUSTOMER</option>
                            </select>
                            <Button variant="danger" size="sm" onClick={() => removeUser(user)}>Revoke</Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5}><div className="empty-state inline"><h3>No workspace users</h3></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}

      {view === "reports" && role !== "CUSTOMER" ? (
        <div className="page-stack">
          <div className="dashboard-metrics dashboard-metrics--reports">
            <StatCard label="Total Revenue" value={money(orders.reduce((sum, o) => sum + toNumber(o.total_amount), 0))} hint="Maturity value" tone="primary" />
            <StatCard label="Orders Completed" value={orders.filter(o => o.status === "delivered").length} />
            <StatCard label="Avg Order value" value={money(averageOrderValue)} />
            <StatCard label="Repeat customers" value={repeatCustomers} tone="alert" />
          </div>

          <div className="dashboard-content dashboard-content--reports" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <Card className="panel-card">
              <SectionHeader kicker="Revenue trend" title="Daily billing curve" />
              <div style={{ padding: "16px 0 0" }}>
                <SalesTrendChart data={revenueSeries} />
              </div>
            </Card>
            
            <Card className="panel-card">
              <SectionHeader kicker="Status Breakdown" title="Orders status mix" />
              <div className="mini-list" style={{ marginTop: "16px" }}>
                {orderStatusSeries.map(series => (
                  <div key={series.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px", borderBottom: "1px solid var(--border)" }}>
                    <span>{series.label}</span>
                    <strong>{series.value} orders ({series.percent}%)</strong>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {view === "settings" && role !== "CUSTOMER" ? (
        <div className="page-stack">
          <Card className="panel-card">
            <SectionHeader kicker="Global parameters" title="Tenant and threshold configs" />
            <div style={{ display: "grid", gap: "16px", marginTop: "16px", maxWidth: "600px" }}>
              <Input label="Company console name" value={settings.company_name} onChange={(e) => setSettings({ ...settings, company_name: e.target.value })} />
              <label className="field">
                <span className="field-label">Low Stock Observability Alert Threshold</span>
                <input type="number" className="ui-input" value={settings.low_stock_threshold} onChange={(e) => setSettings({ ...settings, low_stock_threshold: parseInt(e.target.value) })} />
              </label>
              <Button variant="primary" onClick={() => toast("success", "Settings Saved", "System configurations successfully updated globally.")}>Save Settings</Button>
            </div>
          </Card>
        </div>
      ) : null}

      {view === "profile" ? (
        <div className="page-stack">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <Card className="panel-card">
              <SectionHeader kicker="Account information" title="Edit your profile Details" />
              <form className="auth-form" onSubmit={submitProfile} style={{ display: "grid", gap: "16px", marginTop: "16px" }}>
                <Input label="Full Name" value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} />
                <Input label="Email address" type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} />
                <Input label="Phone number" value={profileForm.phone_number} onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })} />
                <Button variant="primary" type="submit">Update profile</Button>
              </form>
            </Card>

            <Card className="panel-card">
              <SectionHeader kicker="Account security" title="Change workspace password" />
              <form className="auth-form" onSubmit={submitPasswordChange} style={{ display: "grid", gap: "16px", marginTop: "16px" }}>
                <PasswordField label="Current Password" value={passwordForm.current_password} onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })} />
                <PasswordField label="New Password" value={passwordForm.new_password} onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })} />
                <PasswordField label="Confirm Password" value={passwordForm.confirm_password} onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })} />
                <Button variant="primary" type="submit">Update password</Button>
              </form>
            </Card>
          </div>
        </div>
      ) : null}

      {/* Global Command Palette Dialog */}
      <Dialog 
        open={commandPaletteOpen} 
        onClose={() => { setCommandPaletteOpen(false); setCommandSearch(""); }} 
        title="StockFlow Command Palette" 
        description="Type below to search products, track orders, trigger database actions, or jump between modules."
      >
        <div style={{ display: "grid", gap: "16px" }}>
          <input
            autoFocus
            className="ui-input"
            placeholder="Type a command (e.g. /reseed, Add, or product name)..."
            value={commandSearch}
            onChange={(e) => setCommandSearch(e.target.value)}
            style={{ fontSize: "15px", padding: "12px", border: "2px solid var(--accent)" }}
          />
          <div style={{ maxHeight: "300px", overflowY: "auto", display: "grid", gap: "6px" }}>
            {commandMatches.length > 0 ? (
              commandMatches.map((match, idx) => (
                <button 
                  key={idx} 
                  onClick={match.action}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "10px",
                    background: "var(--surface-soft)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%"
                  }}
                  className="table-row-hover"
                >
                  <div>
                    <strong style={{ fontSize: "13px", color: "var(--text)" }}>{match.label}</strong>
                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--muted)" }}>{match.description}</p>
                  </div>
                  <Badge tone="neutral">{match.icon}</Badge>
                </button>
              ))
            ) : (
              <div style={{ padding: "20px", textTransform: "uppercase", fontSize: "11px", fontWeight: "700", color: "var(--muted)", textAlign: "center" }}>
                No commands found. Try typing "theme", "/reseed", or product keywords.
              </div>
            )}
          </div>
        </div>
      </Dialog>

      {/* Operations Assistant Sidebar Drawer */}
      <Drawer 
        open={assistantOpen} 
        onClose={() => setAssistantOpen(false)} 
        title="StockFlow Operations Assistant" 
        description="Data-aware AI coprocessor connected to your live PostgreSQL catalog."
        wide
        footer={
          <div style={{ display: "flex", gap: "8px", width: "100%" }}>
            <input 
              className="ui-input" 
              placeholder="Ask a question or type a command (/status)..."
              value={assistantInput}
              onChange={(e) => setAssistantInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAssistantSend()}
              style={{ flex: 1 }}
            />
            <Button variant="primary" onClick={() => handleAssistantSend()}>Send</Button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "16px" }}>
          
          {/* Quick reply command chips */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {["/status", "/low-stock", "/categories", "/reseed"].map((cmd) => (
              <button 
                key={cmd}
                onClick={() => handleAssistantSend(cmd)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  border: "1px solid var(--border-strong)",
                  background: "var(--surface-soft)",
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "var(--accent)",
                  cursor: "pointer"
                }}
              >
                {cmd}
              </button>
            ))}
          </div>

          {/* Conversation history area */}
          <div style={{ flex: 1, overflowY: "auto", display: "grid", gap: "12px", paddingRight: "4px" }}>
            {assistantMessages.map((msg, idx) => (
              <div 
                key={idx} 
                style={{
                  alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                  justifySelf: msg.sender === "user" ? "end" : "start",
                  maxWidth: "85%",
                  padding: "12px 14px",
                  borderRadius: "14px",
                  background: msg.sender === "user" ? "var(--accent)" : "var(--surface-soft)",
                  border: msg.sender === "user" ? "none" : "1px solid var(--border)",
                  color: msg.sender === "user" ? "#fff" : "var(--text)",
                  fontSize: "13px",
                  lineHeight: "1.5",
                  whiteSpace: "pre-line"
                }}
              >
                {msg.text}
              </div>
            ))}
          </div>
        </div>
      </Drawer>

      <Dialog open={productDialogOpen} onClose={closeProductDialog} title={productDialogMode === "edit" ? "Edit product" : "Create product"} description="Keep the catalog visible while editing product details." wide footer={<div className="dialog-actions"><Button variant="ghost" onClick={closeProductDialog} type="button">Cancel</Button><Button variant="primary" type="submit" form="product-form" disabled={busyAction === "product"}>Save</Button></div>}>
        <form id="product-form" className="auth-form" onSubmit={withBusy("product", submitProduct)}>
          <Input label="Name" value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} />
          <Input label="Category" placeholder="e.g. Electronics, Apparel, Accessories" value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })} />
          <Input label="SKU" value={productForm.sku} onChange={(event) => setProductForm({ ...productForm, sku: event.target.value })} />
          <Input label="Price" type="number" step="0.01" min="0" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} />
          <Input label="Stock" type="number" min="0" value={productForm.quantity_in_stock} onChange={(event) => setProductForm({ ...productForm, quantity_in_stock: event.target.value })} />
        </form>
      </Dialog>

      <Drawer open={productDrawerOpen} onClose={closeProductDrawer} title={selectedProduct ? selectedProduct.name : "Product details"} description="Inspect the product record and jump into editing from the drawer." wide footer={selectedProduct ? <div className="dialog-actions"><Button variant="secondary" type="button" onClick={() => { closeProductDrawer(); openProductDialog("edit", selectedProduct); }}>Edit product</Button>{canManageProducts ? <Button variant="danger" type="button" onClick={() => removeProduct(selectedProduct)}>Delete product</Button> : null}</div> : null}>
        {selectedProduct ? (
          <div className="drawer-summary">
            <div className="drawer-tabs" role="tablist" aria-label="Product detail sections">
              {[
                ["overview", "Overview"],
                ["inventory", "Inventory"],
                ["sales", "Sales"],
                ["orders", "Orders"],
                ["history", "History"],
              ].map(([tabKey, label]) => (
                <button key={tabKey} type="button" className={productDrawerTab === tabKey ? "drawer-tab drawer-tab--active" : "drawer-tab"} onClick={() => setProductDrawerTab(tabKey)}>
                  {label}
                </button>
              ))}
            </div>

            {productDrawerTab === "overview" ? (
              <div className="drawer-panel-stack">
                <div className="info-grid">
                  <div><span>Name</span><strong>{selectedProduct.name}</strong></div>
                  <div><span>Category</span><strong>{selectedProduct.category || "Uncategorized"}</strong></div>
                  <div><span>SKU</span><strong>{selectedProduct.sku}</strong></div>
                  <div><span>Price</span><strong>{money(selectedProduct.price)}</strong></div>
                  <div><span>Stock</span><strong>{selectedProduct.quantity_in_stock}</strong></div>
                  <div><span>Units sold</span><strong>{selectedProductAnalytics?.unitsSold || 0}</strong></div>
                  <div><span>Revenue</span><strong>{money(selectedProductAnalytics?.revenueGenerated || 0)}</strong></div>
                </div>
                <div className="detail-list-block"><h3>Availability</h3><Badge tone={selectedProduct.quantity_in_stock <= settings.low_stock_threshold ? "warning" : "success"}>{selectedProduct.quantity_in_stock <= settings.low_stock_threshold ? "Low stock" : "Healthy stock"}</Badge></div>
              </div>
            ) : null}

            {productDrawerTab === "inventory" ? (
              <div className="drawer-panel-stack">
                <div className="inventory-analytics-grid">
                  <div className="metric-rail"><span>Reserved</span><strong>{selectedProductAnalytics?.reservedStock || 0}</strong><small>Units held for open orders.</small></div>
                  <div className="metric-rail"><span>Available</span><strong>{selectedProductAnalytics?.availableStock ?? selectedProduct.quantity_in_stock}</strong><small>Units ready to sell.</small></div>
                  <div className="metric-rail"><span>Reorder level</span><strong>{settings.low_stock_threshold}</strong><small>Threshold used to trigger attention.</small></div>
                  <div className="metric-rail"><span>Days until stockout</span><strong>{selectedProductAnalytics?.daysUntilStockout ? Math.max(0, Math.round(selectedProductAnalytics.daysUntilStockout)) : "—"}</strong><small>Based on recent sales velocity.</small></div>
                </div>
              </div>
            ) : null}

            {productDrawerTab === "sales" ? (
              <div className="drawer-panel-stack">
                <div className="inventory-analytics-grid">
                  <div className="metric-rail"><span>Units sold</span><strong>{selectedProductAnalytics?.unitsSold || 0}</strong><small>Across all loaded orders.</small></div>
                  <div className="metric-rail"><span>Revenue generated</span><strong>{money(selectedProductAnalytics?.revenueGenerated || 0)}</strong><small>Total attributable revenue.</small></div>
                  <div className="metric-rail"><span>Average daily sales</span><strong>{selectedProductAnalytics?.averageDailySales ? selectedProductAnalytics.averageDailySales.toFixed(1) : "—"}</strong><small>Derived from sales history.</small></div>
                  <div className="metric-rail"><span>Turnover</span><strong>{selectedProductAnalytics ? `${Math.round(selectedProductAnalytics.turnover * 100)}%` : "—"}</strong><small>Share of sold units versus live base stock.</small></div>
                </div>
              </div>
            ) : null}

            {productDrawerTab === "orders" ? (
              <div className="drawer-panel-stack">
                <SectionHeader kicker="Product orders" title="Recent order impact" />
                {selectedProductLatestOrders.length ? (
                  <div className="line-items">
                    {selectedProductLatestOrders.map((order) => {
                      const orderItem = (order.items || []).find((item) => item.product_id === selectedProduct.id);
                      return (
                        <div key={order.id} className="line-item">
                          <div>
                            <strong>Order #{order.id}</strong>
                            <p>{formatLongDate(order.created_at)} • {order.status}</p>
                          </div>
                          <Badge tone={isOpenStatus(order.status) ? "warning" : "success"}>{orderItem ? `${orderItem.quantity} units` : "No item"}</Badge>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state compact"><h3>No product orders yet</h3><p>This item has not appeared in the order stream.</p></div>
                )}
              </div>
            ) : null}

            {productDrawerTab === "history" ? (
              <div className="drawer-panel-stack">
                <SectionHeader kicker="Inventory history" title="Derived movement log" description="Built from live order data and on-hand stock." />
                {selectedProductMovements.length ? (
                  <div className="line-items line-items--timeline">
                    {selectedProductMovements.map((movement, index) => (
                      <div key={`${movement.label}-${index}`} className="line-item">
                        <div>
                          <strong>{movement.label}</strong>
                          <p>{movement.detail}</p>
                        </div>
                        <Badge tone={movement.quantity.startsWith("-") ? "warning" : "success"}>{movement.quantity}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state compact"><h3>No history available</h3><p>Movement entries will appear once orders hit this product.</p></div>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </Drawer>

      <Drawer open={customerDrawerOpen} onClose={closeCustomerDrawer} title={selectedCustomer && selectedCustomer.id ? (customerDrawerMode === "edit" ? "Edit customer" : selectedCustomer.full_name) : "Create customer"} description="Profile, order history, and edit workflows live in a drawer so the list stays visible." wide footer={<div className="dialog-actions"><Button variant="ghost" onClick={closeCustomerDrawer} type="button">Cancel</Button><Button variant="primary" type="submit" form="customer-form" disabled={busyAction === "customer"}>Save customer</Button></div>}>
        {customerDrawerMode === "view" && selectedCustomer?.id ? (
          <div className="drawer-summary">
            <div className="info-grid">
              <div><span>Name</span><strong>{selectedCustomer.full_name}</strong></div>
              <div><span>Email</span><strong>{selectedCustomer.email}</strong></div>
              <div><span>Phone</span><strong>{selectedCustomer.phone_number}</strong></div>
              <div><span>Linked user</span><strong>{selectedCustomer.user_id ?? "None"}</strong></div>
              <div><span>Total spent</span><strong>{money(selectedCustomerSpent)}</strong></div>
            </div>
            <div className="detail-list-block">
              <SectionHeader kicker="Order history" title="Recent purchases" />
              {selectedCustomerOrders.length ? (
                <div className="line-items">
                  {selectedCustomerOrders.slice(0, 5).map((order) => (
                    <div key={order.id} className="line-item"><div><strong>Order #{order.id}</strong><p>{order.status} • {new Date(order.created_at).toLocaleDateString()}</p></div><Badge tone={isOpenStatus(order.status) ? "warning" : "success"}>{money(order.total_amount)}</Badge></div>
                  ))}
                </div>
              ) : <div className="empty-state compact"><h3>No orders yet</h3><p>This customer has not placed any orders.</p></div>}
            </div>
          </div>
        ) : (
          <form id="customer-form" className="auth-form" onSubmit={withBusy("customer", submitCustomer)}>
            <Input label="Full name" value={customerForm.full_name} onChange={(event) => setCustomerForm({ ...customerForm, full_name: event.target.value })} />
            <Input label="Email" type="email" value={customerForm.email} onChange={(event) => setCustomerForm({ ...customerForm, email: event.target.value })} />
            <Input label="Phone" value={customerForm.phone_number} onChange={(event) => setCustomerForm({ ...customerForm, phone_number: event.target.value })} />
          </form>
        )}
      </Drawer>

      <Drawer open={orderDrawerOpen} onClose={closeOrderDrawer} title={selectedOrder ? `Order #${selectedOrder.id}` : "Order details"} description="Inspect the full order payload, line items, and inventory effect." wide footer={selectedOrder && canManageOrders ? <Button variant="danger" onClick={() => requestDelete("order", `Order #${selectedOrder.id}`, async () => { await apiFetch(`/orders/${selectedOrder.id}`, { method: "DELETE", headers: authHeaders() }); closeOrderDrawer(); await loadWorkspace(); toast("success", "Order deleted.", "Inventory was restored."); })} type="button">Delete order</Button> : null}>
        {selectedOrder ? (
          <div className="drawer-summary" style={{ display: "grid", gap: "20px" }}>
            
            {/* Status Workflow Progress Tracker */}
            {["pending", "processing", "shipped", "delivered"].includes(selectedOrder.status.toLowerCase()) ? (
              <div style={{ margin: "8px 0 16px", display: "grid", gap: "12px" }}>
                <h4 style={{ margin: 0, fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.5px" }}>Workflow State Tracker</h4>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", padding: "0 10px", height: "50px" }}>
                  {/* Connector Bar Background */}
                  <div style={{ position: "absolute", left: "24px", right: "24px", height: "2px", background: "var(--border)", zIndex: 1 }} />
                  {/* Connector Bar Completed Progress */}
                  <div style={{ 
                    position: "absolute", 
                    left: "24px", 
                    width: selectedOrder.status.toLowerCase() === "delivered" ? "calc(100% - 48px)" : 
                           selectedOrder.status.toLowerCase() === "shipped" ? "calc(66.6% - 32px)" : 
                           selectedOrder.status.toLowerCase() === "processing" ? "calc(33.3% - 16px)" : "0px", 
                    height: "2px", 
                    background: "var(--accent)", 
                    zIndex: 2, 
                    transition: "width 0.3s ease" 
                  }} />
                  
                  {/* Steps */}
                  {["pending", "processing", "shipped", "delivered"].map((step, idx) => {
                    const statuses = ["pending", "processing", "shipped", "delivered"];
                    const currentIdx = statuses.indexOf(selectedOrder.status.toLowerCase());
                    const isCompleted = idx <= currentIdx;
                    const isActive = idx === currentIdx;
                    
                    return (
                      <div key={step} style={{ display: "grid", justifyItems: "center", gap: "6px", zIndex: 3, position: "relative" }}>
                        <div style={{ 
                          width: "28px", 
                          height: "28px", 
                          borderRadius: "50%", 
                          background: isActive ? "var(--accent)" : isCompleted ? "var(--success)" : "var(--surface)", 
                          border: `2px solid ${isActive ? "var(--accent)" : isCompleted ? "var(--success)" : "var(--border-strong)"}`, 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center",
                          color: isActive || isCompleted ? "#fff" : "var(--muted)",
                          fontSize: "11px",
                          fontWeight: "700",
                          boxShadow: isActive ? "0 0 10px var(--accent-alpha)" : "none",
                          transition: "all 0.2s ease"
                        }}>
                          {isCompleted && !isActive ? "✓" : idx + 1}
                        </div>
                        <span style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: isActive ? "var(--accent)" : "var(--text)", opacity: isActive ? 1 : 0.6 }}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ padding: "14px", background: "var(--danger-soft)", border: "1px solid var(--danger)", borderRadius: "10px", display: "flex", gap: "10px", alignItems: "center", margin: "8px 0 16px" }}>
                <span style={{ fontSize: "18px" }}>⚠️</span>
                <div style={{ fontSize: "12px", color: "var(--text)" }}>
                  <strong>Order Terminated / Cancelled</strong>
                  <p style={{ margin: "2px 0 0", opacity: 0.8 }}>This order was cancelled. Items have been restocked to the catalog.</p>
                </div>
              </div>
            )}

            {/* Administrative workflow transitions */}
            {role !== "CUSTOMER" && !["delivered", "cancelled", "canceled"].includes(selectedOrder.status.toLowerCase()) && (
              <div style={{ padding: "16px", borderRadius: "12px", background: "var(--surface-soft)", border: "1px solid var(--border)", display: "grid", gap: "12px" }}>
                <h4 style={{ margin: 0, fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.5px" }}>Admin Workflow Actions</h4>
                <div style={{ display: "flex", gap: "10px" }}>
                  {selectedOrder.status.toLowerCase() === "pending" && (
                    <Button variant="primary" style={{ flex: 1 }} onClick={() => patchOrderStatus(selectedOrder.id, "processing")} disabled={busyAction === "order-status"}>
                      Start Fulfillment
                    </Button>
                  )}
                  {selectedOrder.status.toLowerCase() === "processing" && (
                    <Button variant="primary" style={{ flex: 1 }} onClick={() => patchOrderStatus(selectedOrder.id, "shipped")} disabled={busyAction === "order-status"}>
                      Ship Package
                    </Button>
                  )}
                  {selectedOrder.status.toLowerCase() === "shipped" && (
                    <Button variant="primary" style={{ flex: 1 }} onClick={() => patchOrderStatus(selectedOrder.id, "delivered")} disabled={busyAction === "order-status"}>
                      Mark as Delivered
                    </Button>
                  )}
                  <Button variant="danger" onClick={() => patchOrderStatus(selectedOrder.id, "cancelled")} disabled={busyAction === "order-status"}>
                    Cancel Order
                  </Button>
                </div>
              </div>
            )}

            <div className="info-grid">
              <div><span>Customer ID</span><strong>Customer #{selectedOrder.customer_id}</strong></div>
              <div><span>Current Status</span><strong style={{ color: "var(--accent)" }}>{selectedOrder.status.toUpperCase()}</strong></div>
              <div><span>Total Amount</span><strong>{money(selectedOrder.total_amount)}</strong></div>
              <div><span>Items Count</span><strong>{selectedOrder.items?.length || 0} products</strong></div>
            </div>

            <div className="detail-list-block">
              <h3 style={{ fontSize: "14px", margin: "0 0 10px", fontWeight: "700" }}>Line items</h3>
              {selectedOrder.items?.length ? (
                <div className="line-items">
                  {selectedOrder.items.map((item) => (
                    <div key={`${selectedOrder.id}-${item.product_id}`} className="line-item" style={{ padding: "12px", border: "1px solid var(--border)", borderRadius: "10px", margin: "4px 0" }}>
                      <div>
                        <strong>Product ID #{item.product_id}</strong>
                        <p style={{ margin: "2px 0 0", color: "var(--muted)" }}>Allocated quantity: {item.quantity}</p>
                      </div>
                      <Badge tone="neutral">{money(item.unit_price)} each</Badge>
                    </div>
                  ))}
                </div>
              ) : <div className="empty-state compact"><h3>No items loaded</h3><p>Open the order again to refresh the details payload.</p></div>}
            </div>
          </div>
        ) : null}
      </Drawer>

      <Dialog open={Boolean(confirmAction)} onClose={() => setConfirmAction(null)} title={`Delete ${confirmAction?.kind || "item"}?`} description={confirmAction ? `${confirmAction.label} will be removed. This action cannot be undone.` : ""} footer={<div className="dialog-actions"><Button variant="ghost" onClick={() => setConfirmAction(null)} type="button">Cancel</Button><Button variant="danger" onClick={performDelete} type="button">Delete</Button></div>}>
        <p>This will permanently remove the selected record from the workspace.</p>
      </Dialog>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </AppChrome>
  );
}
