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

const emptyProduct = { name: "", sku: "", price: "", quantity_in_stock: "" };
const emptyCustomer = { full_name: "", email: "", phone_number: "" };
const emptyOrder = { customer_id: "", product_id: "", quantity: 1 };
const emptyLogin = { identifier: "", password: "" };
const emptyRegister = { full_name: "", username: "", email: "", password: "", confirm_password: "" };
const emptyProfile = { full_name: "", email: "", phone_number: "" };
const emptyPassword = { current_password: "", new_password: "", confirm_password: "" };
const emptyDashboard = {
  total_products: 0,
  total_customers: 0,
  total_orders: 0,
  low_stock_products: [],
  pending_orders: 0,
  revenue_today: 0,
  revenue_month: 0,
  inventory_value: 0,
  top_products: [],
  recent_orders: [],
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function formatMoney(value) {
  return currencyFormatter.format(Number(value || 0));
}

function getDefaultViewForRole(roleName) {
  return roleName === "CUSTOMER" ? "orders" : "dashboard";
}

function isActionableOrderStatus(status) {
  const normalized = String(status || "").toLowerCase();
  return !["completed", "cancelled", "canceled", "delivered"].includes(normalized);
}

function startOfDay(dateValue) {
  return new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());
}

function startOfMonth(dateValue) {
  return new Date(dateValue.getFullYear(), dateValue.getMonth(), 1);
}

function PasswordField({ label, value, onChange, placeholder, autoComplete }) {
      {view === "dashboard" ? (
        role === "CUSTOMER" ? (
          <div className="dashboard-grid dashboard-grid--customer">
            <Card className="panel-card panel-card--hero">
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">Self-service</p>
                  <h2>My account</h2>
                </div>
              </div>
              <p className="panel-copy">
                Browse the catalog, review recent orders, and keep your profile information up to date without exposing inventory controls.
              </p>
              <div className="action-grid action-grid--wide">
                <Button variant="primary" onClick={() => setView("orders")}>
                  My orders
                </Button>
                <Button variant="secondary" onClick={() => setView("products")}>
                  Catalog
                </Button>
                <Button variant="ghost" onClick={() => setView("profile")}>
                  Profile
                </Button>
              </div>
            </Card>

            <Card className="panel-card">
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">Recent orders</p>
                  <h2>Latest activity</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setView("orders")}>
                  Open orders
                </Button>
              </div>
              {orders.length ? (
                <div className="mini-list">
                  {orders.slice(0, 5).map((order) => (
                    <button key={order.id} className="mini-row" type="button" onClick={() => openOrderDrawer(order.id)}>
                      <span>Order #{order.id}</span>
                      <span>{order.status}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="empty-state compact">
                  <h3>No orders yet</h3>
                  <p>Your orders will appear here once the first purchase is placed.</p>
                </div>
              )}
            </Card>

            <Card className="panel-card">
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">Catalog</p>
                  <h2>Browse products</h2>
                </div>
              </div>
              <div className="mini-list">
                {products.slice(0, 5).map((product) => (
                  <div key={product.id} className="alert-row">
                    <div>
                      <strong>{product.name}</strong>
                      <p>SKU {product.sku}</p>
                    </div>
                    <Badge tone={product.quantity_in_stock <= 2 ? "warning" : "success"}>{product.quantity_in_stock} in stock</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : (
          <div className="dashboard-grid">
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
                  <Card className="metric-card metric-card--primary">
                    <span>Revenue today</span>
                    <strong>{formatMoney(dashboard.revenue_today)}</strong>
                    <small>Orders placed today</small>
                  </Card>
                  <Card className="metric-card metric-card--primary">
                    <span>Revenue this month</span>
                    <strong>{formatMoney(dashboard.revenue_month)}</strong>
                    <small>Month-to-date sales</small>
                  </Card>
                  <Card className="metric-card">
                    <span>Pending orders</span>
                    <strong>{dashboard.pending_orders}</strong>
                    <small>Need processing</small>
                  </Card>
                  <Card className="metric-card metric-card--alert">
                    <span>Inventory valuation</span>
                    <strong>{formatMoney(dashboard.inventory_value)}</strong>
                    <small>On-hand stock value</small>
                  </Card>
                </>
              )}
            </div>

            <div className="dashboard-content">
              <Card className="panel-card">
                <div className="panel-header">
                  <div>
                    <p className="panel-kicker">Recent orders</p>
                    <h2>Latest activity</h2>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setView("orders")}>
                    Open orders
                  </Button>
                </div>
                {dashboard.recent_orders.length ? (
                  <div className="mini-list">
                    {dashboard.recent_orders.map((order) => (
                      <button key={order.id} className="mini-row" type="button" onClick={() => openOrderDrawer(order.id)}>
                        <span>
                          <strong>Order #{order.id}</strong>
                          <span>{formatMoney(order.total_amount)}</span>
                        </span>
                        <Badge tone={isActionableOrderStatus(order.status) ? "warning" : "success"}>{order.status}</Badge>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state compact">
                    <h3>No orders yet</h3>
                    <p>Create the first order to populate the activity feed.</p>
                  </div>
                )}
              </Card>

              <Card className="panel-card">
                <div className="panel-header">
                  <div>
                    <p className="panel-kicker">Inventory alerts</p>
                    <h2>Needs attention</h2>
                  </div>
                  <Badge tone={lowStockAlerts.length ? "warning" : "neutral"}>
                    {lowStockAlerts.length} alert{lowStockAlerts.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                {lowStockAlerts.length ? (
                  <div className="mini-list">
                    {lowStockAlerts.slice(0, 5).map((product) => (
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
                  <div className="empty-state compact">
                    <h3>Stock looks healthy</h3>
                    <p>No products are below the low-stock threshold.</p>
                  </div>
                )}
              </Card>

              <Card className="panel-card">
                <div className="panel-header">
                  <div>
                    <p className="panel-kicker">Top products</p>
                    <h2>Most sold items</h2>
                  </div>
                </div>
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
                  <div className="empty-state compact">
                    <h3>No sales history</h3>
                    <p>Top products will appear after order details are loaded.</p>
                  </div>
                )}
              </Card>

              <Card className="panel-card quick-actions">
                <div className="panel-header">
                  <div>
                    <p className="panel-kicker">Quick actions</p>
                    <h2>Common tasks</h2>
                  </div>
                </div>
                <div className="action-grid">
                  <Button variant="primary" onClick={() => setView("products")}>
                    Browse catalog
                  </Button>
                  {canManageProducts ? (
                    <Button variant="secondary" onClick={() => openProductDialog("create")}>Create product</Button>
                  ) : null}
                  {canManageCustomers ? (
                    <Button variant="secondary" onClick={() => openCustomerDrawer({ id: null, ...emptyCustomer }, "edit") }>
                      Add customer
                    </Button>
                  ) : null}
                  <Button variant="ghost" onClick={() => setView("profile")}>
                    Open profile
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )
      ) : null}
  const filteredProducts = useMemo(() => {
    const search = productSearch.toLowerCase();
    const filtered = products
      .filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(search))
      .filter((product) => {
        if (productStatusFilter === "low") {
          return product.quantity_in_stock <= 2;
        }
        if (productStatusFilter === "healthy") {
          return product.quantity_in_stock > 2;
        }
        return true;
      });

    const sorted = [...filtered].sort((left, right) => {
      if (productSort === "stock") {
        return Number(left.quantity_in_stock) - Number(right.quantity_in_stock);
      }
      if (productSort === "price") {
        return Number(right.price) - Number(left.price);
      }
      return String(left.name).localeCompare(String(right.name));
    });

    return sorted;
  }, [products, productSearch, productStatusFilter, productSort]);
  const filteredCustomers = useMemo(
    () => customers.filter((customer) => `${customer.full_name} ${customer.email}`.toLowerCase().includes(customerSearch.toLowerCase())),
    [customers, customerSearch],
  );
  const filteredOrders = useMemo(
    () => orders.filter((order) => `${order.id} ${order.status} ${order.customer_id}`.toLowerCase().includes(orderSearch.toLowerCase())),
    [orders, orderSearch],
  );
  const filteredUsers = useMemo(
    () => users.filter((user) => `${user.full_name} ${user.username} ${user.email}`.toLowerCase().includes(userSearch.toLowerCase())),
    [users, userSearch],
  );

  const selectedCustomerOrders = useMemo(() => {
    if (!selectedCustomer?.id) {
      return [];
    }
    return orders.filter((order) => order.customer_id === selectedCustomer.id);
  }, [orders, selectedCustomer]);

  const selectedCustomerTotalSpent = useMemo(
    () => selectedCustomerOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
    [selectedCustomerOrders],
  );

  const notificationItems = useMemo(() => {
    const alerts = [];
    dashboard.low_stock_products.slice(0, 3).forEach((product) => {
      alerts.push({ label: product.name, description: `Low stock: ${product.quantity_in_stock} left` });
    });
    orders
      .filter((order) => isActionableOrderStatus(order.status))
      .slice(0, 2)
      .forEach((order) => {
        alerts.push({ label: `Order #${order.id}`, description: `Status ${order.status}` });
      });
    return alerts.length ? alerts : [{ label: "All clear", description: "No urgent notifications" }];
  }, [dashboard.low_stock_products, orders]);

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
            : "Search workspace";

  function handleTopbarSearchChange(nextValue) {
    if (view === "products") {
      setProductSearch(nextValue);
    } else if (view === "customers") {
      setCustomerSearch(nextValue);
    } else if (view === "orders") {
      setOrderSearch(nextValue);
    } else if (view === "users") {
      setUserSearch(nextValue);
    }
  }

  const lowStockAlerts = dashboard.low_stock_products;

  function toast(variant, title, description) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { id, variant, title, description }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toastItem) => toastItem.id !== id));
    }, 4200);
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
    setUsers([]);
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
  }

  function handleSessionError(error) {
    if (error?.status !== 401) {
      return false;
    }
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
      const [productList, customerList, orderList, profile, userList] = await Promise.all([
        apiFetch("/products/", { headers }),
        canManageCatalog ? apiFetch("/customers/", { headers }) : Promise.resolve([]),
        apiFetch(orderPath, { headers }),
        apiFetch("/auth/me", { headers }),
        canManageUsers ? apiFetch("/users/", { headers }) : Promise.resolve([]),
      ]);

      const now = new Date();
      const todayStart = startOfDay(now);
      const monthStart = startOfMonth(now);
      const recentOrders = orderList.slice(0, 5);
      const orderDetails = await Promise.all(
        recentOrders.map(async (order) => {
          try {
            return await apiFetch(`/orders/${order.id}`, { headers });
          } catch (error) {
            return null;
          }
        }),
      );

      const topProductTotals = new Map();
      orderDetails.filter(Boolean).forEach((orderDetail) => {
        orderDetail.items?.forEach((item) => {
          topProductTotals.set(item.product_id, (topProductTotals.get(item.product_id) || 0) + Number(item.quantity || 0));
        });
      });

      const topProducts = [...topProductTotals.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 5)
        .map(([productId, quantity]) => ({
          product_id: productId,
          quantity,
          name: productList.find((product) => product.id === productId)?.name || `Product #${productId}`,
        }));

      const revenueToday = orderList
        .filter((order) => new Date(order.created_at) >= todayStart)
        .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
      const revenueMonth = orderList
        .filter((order) => new Date(order.created_at) >= monthStart)
        .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

      setProducts(productList);
      setCustomers(customerList);
      setOrders(orderList);
      setUsers(userList);
      setDashboard({
        total_products: productList.length,
        total_customers: customerList.length,
        total_orders: orderList.length,
        low_stock_products: productList.filter((product) => product.quantity_in_stock <= 2),
        pending_orders: orderList.filter((order) => isActionableOrderStatus(order.status)).length,
        revenue_today: revenueToday,
        revenue_month: revenueMonth,
        inventory_value: productList.reduce(
          (sum, product) => sum + Number(product.price || 0) * Number(product.quantity_in_stock || 0),
          0,
        ),
        top_products: topProducts,
        recent_orders: recentOrders,
      });
      setProfileForm({
        full_name: profile.full_name || "",
        email: profile.email || "",
        phone_number: profile.phone_number || "",
      });

      const storedAuth = getAuth();
      if (storedAuth?.access_token) {
        const nextAuth = { ...storedAuth, user: profile };
        setAuth(nextAuth, true);
        setAuthState(nextAuth);
      }
    } catch (error) {
      if (!handleSessionError(error)) {
        setMessage(error.message);
      }
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
  }, [isAuthed, orderPath, canManageUsers, canManageCatalog]);

  useEffect(() => {
    if (!isAuthed) {
      return;
    }
    const allowedViews = navItems.map((item) => item.key);
    if (!allowedViews.includes(view)) {
      setView(getDefaultViewForRole(role));
    }
  }, [isAuthed, role, navItems, view]);

  useEffect(() => {
    if (!isAuthed || !currentUser) {
      return;
    }
    setProfileForm({
      full_name: currentUser.full_name || "",
      email: currentUser.email || "",
      phone_number: currentUser.phone_number || "",
    });
  }, [isAuthed, currentUser]);

  async function handleLoginSubmit(event) {
    event.preventDefault();
    try {
      const response = await apiFetch("/auth/login", { method: "POST", body: loginForm });
      setAuth(response, true);
      setAuthState(response);
      setLoginForm(emptyLogin);
      setMessage("");
      toast("success", `Welcome back, ${response.user.username}.`, "Workspace loaded.");
      setView(getDefaultViewForRole(response.user.role));
    } catch (error) {
      if (!handleSessionError(error)) {
        setMessage(error.message);
      }
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
      toast("success", `Account created for ${response.user.username}.`, "Customer access is ready.");
      setView(getDefaultViewForRole(response.user.role));
    } catch (error) {
      if (!handleSessionError(error)) {
        setMessage(error.message);
      }
    }
  }

  function handleLogout() {
    clearAuth();
    setAuthState(null);
    clearWorkspaceState();
    setView("dashboard");
    setMessage("");
  }

  function openProductDialog(mode, product = null) {
    if (mode === "edit" && product) {
      setProductForm({
        name: product.name,
        sku: product.sku,
        price: product.price,
        quantity_in_stock: product.quantity_in_stock,
      });
      setSelectedProductId(product.id);
    } else {
      setProductForm(emptyProduct);
      setSelectedProductId(null);
    }
    setProductDialogMode(mode);
    setProductDialogOpen(true);
  }

  function openProductDrawer(product) {
    setSelectedProduct(product);
    setProductDrawerOpen(true);
  }

  function closeProductDialog() {
    setProductDialogOpen(false);
    setProductDialogMode("create");
    setSelectedProductId(null);
    setProductForm(emptyProduct);
  }

  function closeProductDrawer() {
    setProductDrawerOpen(false);
    setSelectedProduct(null);
  }

  async function submitProduct(event) {
    event.preventDefault();
    const payload = {
      name: productForm.name,
      sku: productForm.sku,
      price: Number(productForm.price),
      quantity_in_stock: Number(productForm.quantity_in_stock),
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
      if (!handleSessionError(error)) {
        setMessage(error.message);
      }
    }
  }

  function requestDelete(kind, label, action) {
    setConfirmAction({ kind, label, action });
  }

  function openCustomerDrawer(customer, mode = "view") {
    setSelectedCustomer(customer);
    setCustomerForm({
      full_name: customer.full_name || "",
      email: customer.email || "",
      phone_number: customer.phone_number || "",
    });
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
      const payload = {
        full_name: customerForm.full_name,
        email: customerForm.email,
        phone_number: customerForm.phone_number,
      };
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
      if (!handleSessionError(error)) {
        setMessage(error.message);
      }
    }
  }

  async function submitOrder(event) {
    event.preventDefault();
    const payload = {
      items: [{ product_id: Number(orderForm.product_id), quantity: Number(orderForm.quantity) }],
    };

    if (role !== "CUSTOMER") {
      payload.customer_id = Number(orderForm.customer_id);
    }

    try {
      await apiFetch("/orders/", { method: "POST", headers: authHeaders(), body: payload });
      setOrderForm(emptyOrder);
      toast("success", "Order created.", "Stock levels updated automatically.");
      await loadWorkspace();
    } catch (error) {
      if (!handleSessionError(error)) {
        setMessage(error.message);
      }
    }
  }

  async function openOrderDrawer(orderId) {
    try {
      const orderDetail = await apiFetch(`/orders/${orderId}`, { headers: authHeaders() });
      setSelectedOrder(orderDetail);
      setOrderDrawerOpen(true);
      setOrders((currentOrders) => currentOrders.map((order) => (order.id === orderDetail.id ? orderDetail : order)));
    } catch (error) {
      if (!handleSessionError(error)) {
        setMessage(error.message);
      }
    }
  }

  function closeOrderDrawer() {
    setOrderDrawerOpen(false);
    setSelectedOrder(null);
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
      if (!handleSessionError(error)) {
        setMessage(error.message);
      }
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
      if (!handleSessionError(error)) {
        setMessage(error.message);
      }
    }
  }

  async function updateUserRole(userId, roleName) {
    try {
      const updatedUser = await apiFetch(`/users/${userId}/role`, { method: "PATCH", headers: authHeaders(), body: { role: roleName } });
      setUsers((currentUsers) => currentUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
      toast("success", "User role updated.", `${updatedUser.username} now has ${updatedUser.role} access.`);
    } catch (error) {
      if (!handleSessionError(error)) {
        setMessage(error.message);
      }
    }
  }

  async function performDelete() {
    const nextAction = confirmAction;
    if (!nextAction) {
      return;
    }
    setConfirmAction(null);
    await nextAction.action();
  }

  function removeProduct(product) {
    requestDelete("product", product.name, async () => {
      try {
        await apiFetch(`/products/${product.id}`, { method: "DELETE", headers: authHeaders() });
        if (selectedProductId === product.id) {
          setSelectedProductId(null);
        }
        if (selectedProduct?.id === product.id) {
          closeProductDrawer();
        }
        toast("success", "Product deleted.", "Catalog refreshed.");
        await loadWorkspace();
      } catch (error) {
        if (!handleSessionError(error)) {
          setMessage(error.message);
        }
      }
    });
  }

  function removeCustomer(customer) {
    requestDelete("customer", customer.full_name, async () => {
      try {
        await apiFetch(`/customers/${customer.id}`, { method: "DELETE", headers: authHeaders() });
        if (selectedCustomer?.id === customer.id) {
          closeCustomerDrawer();
        }
        toast("success", "Customer deleted.", "The profile was removed.");
        await loadWorkspace();
      } catch (error) {
        if (!handleSessionError(error)) {
          setMessage(error.message);
        }
      }
    });
  }

  function removeOrder(order) {
    requestDelete("order", `Order #${order.id}`, async () => {
      try {
        await apiFetch(`/orders/${order.id}`, { method: "DELETE", headers: authHeaders() });
        if (selectedOrder?.id === order.id) {
          closeOrderDrawer();
        }
        toast("success", "Order deleted.", "Inventory was restored.");
        await loadWorkspace();
      } catch (error) {
        if (!handleSessionError(error)) {
          setMessage(error.message);
        }
      }
    });
  }

  function removeUser(user) {
    requestDelete("user", user.username, async () => {
      try {
        await apiFetch(`/users/${user.id}`, { method: "DELETE", headers: authHeaders() });
        toast("success", "User deleted.", "Account removed from the workspace.");
        await loadWorkspace();
      } catch (error) {
        if (!handleSessionError(error)) {
          setMessage(error.message);
        }
      }
    });
  }

  function dismissToast(id) {
    setToasts((current) => current.filter((toastItem) => toastItem.id !== id));
  }

  if (!isAuthed) {
    return (
      <div className="auth-shell">
        <div className="auth-hero">
          <div className="brand-block brand-block--large">
            <div className="brand-mark">IO</div>
            <div>
              <p className="brand-name">Inventory One</p>
              <p className="brand-copy">A modern operations workspace for inventory, orders, and customers.</p>
            </div>
          </div>
          <div className="auth-hero-copy">
            <Badge tone="neutral">2026 SaaS UI</Badge>
            <h1>Inventory management that feels built for a product team, not a spreadsheet.</h1>
            <p>
              Clean hierarchy, role-aware navigation, polished dialogs, and fast account flows. Demo logins are pre-seeded so a reviewer can move from sign-in to
              verification immediately.
            </p>
            <div className="auth-points">
              <span>Admin, staff, and customer roles</span>
              <span>Product, customer, and order workflows</span>
              <span>Profile and password management</span>
            </div>
          </div>
        </div>

        <Card className="auth-card">
          <div className="auth-switcher">
            <Button variant={authMode === "login" ? "primary" : "ghost"} onClick={() => setAuthMode("login")} type="button">
              Sign in
            </Button>
            <Button variant={authMode === "register" ? "primary" : "ghost"} onClick={() => setAuthMode("register")} type="button">
              Create account
            </Button>
          </div>

          {authMode === "login" ? (
            <form className="auth-form" onSubmit={withBusy("login", handleLoginSubmit)}>
              <Input
                label="Username or email"
                placeholder="admin"
                autoComplete="username"
                value={loginForm.identifier}
                onChange={(event) => setLoginForm({ ...loginForm, identifier: event.target.value })}
              />
              <PasswordField
                label="Password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={loginForm.password}
                onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
              />
              <Button variant="primary" type="submit" disabled={busyAction === "login"}>
                Continue
              </Button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={withBusy("register", handleRegisterSubmit)}>
              <Input label="Full name" placeholder="Taylor Reed" value={registerForm.full_name} onChange={(event) => setRegisterForm({ ...registerForm, full_name: event.target.value })} />
              <Input label="Username" placeholder="taylor" autoComplete="username" value={registerForm.username} onChange={(event) => setRegisterForm({ ...registerForm, username: event.target.value })} />
              <Input label="Email" type="email" placeholder="taylor@company.com" autoComplete="email" value={registerForm.email} onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })} />
              <PasswordField
                label="Password"
                placeholder="Create a password"
                autoComplete="new-password"
                value={registerForm.password}
                onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })}
              />
              <PasswordField
                label="Confirm password"
                placeholder="Repeat the password"
                autoComplete="new-password"
                value={registerForm.confirm_password}
                onChange={(event) => setRegisterForm({ ...registerForm, confirm_password: event.target.value })}
              />
              <Button variant="primary" type="submit" disabled={busyAction === "register"}>
                Create account
              </Button>
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
      notifications={notificationItems}
      onProfile={() => setView("profile")}
      onLogout={handleLogout}
    >
      {message ? <div className="notice notice--inline">{message}</div> : null}
      {isLoading ? <div className="notice notice--inline notice--loading">Loading workspace data...</div> : null}

      <section className="page-hero">
        <div>
          <Badge tone={role === "ADMIN" ? "success" : role === "STAFF" ? "warning" : "neutral"}>{role} access</Badge>
          <h1>
            {view === "dashboard"
              ? "Command center"
              : view === "products"
                ? role === "CUSTOMER"
                  ? "Catalog"
                  : "Products"
                : view === "customers"
                  ? "Customers"
                  : view === "orders"
                    ? role === "CUSTOMER"
                      ? "My orders"
                      : "Orders"
                    : view === "profile"
                      ? "Profile"
                      : "Users"}
          </h1>
          <p>
            {view === "dashboard"
              ? "Quick status, alerts, and shortcuts for the current role."
              : view === "products"
                ? "Search, inspect, create, and edit products in a faster table-first workflow."
                : view === "customers"
                  ? "Customer profiles open in a drawer so the list stays visible while you work."
                  : view === "orders"
                    ? "Review order status, line items, and inventory impact from a dedicated drawer."
                    : view === "profile"
                      ? "Review account information and update credentials without leaving the workspace."
                      : "Admin-only account management and role changes."}
          </p>
        </div>

        <div className="page-hero-actions">
          {view === "products" && canManageProducts ? (
            <Button variant="primary" onClick={() => openProductDialog("create")}>
              New product
            </Button>
          ) : null}
          {view === "customers" && canManageCustomers ? (
            <Button variant="primary" onClick={() => openCustomerDrawer({ id: null, ...emptyCustomer }, "edit")}>
              New customer
            </Button>
          ) : null}
        </div>
      </section>

      {view === "dashboard" ? (
        <div className="dashboard-grid">
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
                <Card className="metric-card">
                  <span>Total Products</span>
                  <strong>{dashboard.total_products}</strong>
                  <small>Live catalog count</small>
                </Card>
                <Card className="metric-card">
                  <span>Total Customers</span>
                  <strong>{dashboard.total_customers}</strong>
                  <small>Active customer records</small>
                </Card>
                <Card className="metric-card">
                  <span>Total Orders</span>
                  <strong>{dashboard.total_orders}</strong>
                  <small>Placed orders</small>
                </Card>
                <Card className="metric-card metric-card--alert">
                  <span>Low Stock Products</span>
                  <strong>{dashboard.low_stock_products.length}</strong>
                  <small>At or below 2 units</small>
                </Card>
              </>
            )}
          </div>

          <div className="dashboard-content">
            <Card className="panel-card">
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">Recent orders</p>
                  <h2>Latest activity</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setView("orders")}>
                  Open orders
                </Button>
              </div>
              {orders.length ? (
                <div className="mini-list">
                  {orders.slice(0, 5).map((order) => (
                    <button key={order.id} className="mini-row" type="button" onClick={() => openOrderDrawer(order.id)}>
                      <span>Order #{order.id}</span>
                      <span>{order.status}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="empty-state compact">
                  <h3>No orders yet</h3>
                  <p>Create the first order to populate the activity feed.</p>
                </div>
              )}
            </Card>

            <Card className="panel-card">
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">Inventory alerts</p>
                  <h2>Needs attention</h2>
                </div>
                <Badge tone={lowStockAlerts.length ? "warning" : "neutral"}>{lowStockAlerts.length} alert{lowStockAlerts.length === 1 ? "" : "s"}</Badge>
              </div>
              {lowStockAlerts.length ? (
                <div className="mini-list">
                  {lowStockAlerts.slice(0, 5).map((product) => (
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
                <div className="empty-state compact">
                  <h3>Stock looks healthy</h3>
                  <p>No products are below the low-stock threshold.</p>
                </div>
              )}
            </Card>

            <Card className="panel-card quick-actions">
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">Quick actions</p>
                  <h2>Common tasks</h2>
                </div>
              </div>
              <div className="action-grid">
                <Button variant="primary" onClick={() => setView("products")}>
                  Browse catalog
                </Button>
                {canManageProducts ? <Button variant="secondary" onClick={() => openProductDialog("create")}>Create product</Button> : null}
                {canManageCustomers ? (
                  <Button variant="secondary" onClick={() => openCustomerDrawer({ id: null, ...emptyCustomer }, "edit")}>
                    Add customer
                  </Button>
                ) : null}
                <Button variant="ghost" onClick={() => setView("profile")}>
                  Open profile
                </Button>
              </div>
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
                <span className="field-label">Filter</span>
                <select className="ui-input" value={productStatusFilter} onChange={(event) => setProductStatusFilter(event.target.value)}>
                  <option value="all">All stock</option>
                  <option value="healthy">Healthy stock</option>
                  <option value="low">Low stock</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">Sort</span>
                <select className="ui-input" value={productSort} onChange={(event) => setProductSort(event.target.value)}>
                  <option value="name">Name</option>
                  <option value="stock">Stock</option>
                  <option value="price">Price</option>
                </select>
              </label>
            </div>
            <div className="toolbar-card__actions">
              {canManageProducts ? (
                <Button variant="primary" onClick={() => openProductDialog("create")}>
                  Add product
                </Button>
              ) : null}
            </div>
          </Card>

          <Card className="table-card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>SKU</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length ? (
                    filteredProducts.map((product) => (
                      <tr key={product.id} className="table-row-hover">
                        <td>{product.name}</td>
                        <td>{product.sku}</td>
                        <td>{product.price}</td>
                        <td>{product.quantity_in_stock}</td>
                        <td>
                          <Badge tone={product.quantity_in_stock <= 2 ? "warning" : "success"}>{product.quantity_in_stock <= 2 ? "Low stock" : "Healthy"}</Badge>
                        </td>
                        <td>
                          <div className="row-actions">
                            <Button variant="ghost" size="sm" onClick={() => openProductDrawer(product)}>
                              View
                            </Button>
                            {canManageProducts ? <Button variant="secondary" size="sm" onClick={() => openProductDialog("edit", product)}>Edit</Button> : null}
                            {canManageProducts ? <Button variant="danger" size="sm" onClick={() => removeProduct(product)}>Delete</Button> : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state inline">
                          <h3>No products found</h3>
                          <p>{productSearch ? "Try a different search term." : "Create the first product to populate the catalog."}</p>
                          {canManageProducts ? <Button variant="primary" onClick={() => openProductDialog("create")}>Create product</Button> : null}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}

      {view === "customers" && canManageCustomers ? (
        <div className="page-stack">
          <Card className="toolbar-card">
            <Input label="Search customers" placeholder="Search by name or email" value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} />
            <Button variant="primary" onClick={() => openCustomerDrawer({ id: null, ...emptyCustomer }, "edit")}>
              Create customer
            </Button>
          </Card>

          <Card className="table-card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Linked user</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length ? (
                    filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="table-row-hover">
                        <td>{customer.full_name}</td>
                        <td>{customer.email}</td>
                        <td>{customer.phone_number}</td>
                        <td>{customer.user_id ?? "None"}</td>
                        <td>
                          <div className="row-actions">
                            <Button variant="ghost" size="sm" onClick={() => openCustomerDrawer(customer, "view")}>
                              Profile
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => openCustomerDrawer(customer, "edit")}>
                              Edit
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => openCustomerDrawer(customer, "view")}>
                              Orders
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => removeCustomer(customer)}>
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty-state inline">
                          <h3>No customers found</h3>
                          <p>{customerSearch ? "Try another search term." : "Add the first customer record to start linking orders."}</p>
                          <Button variant="primary" onClick={() => openCustomerDrawer({ id: null, ...emptyCustomer }, "edit")}>Create customer</Button>
                        </div>
                      </td>
                    </tr>
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
            <Input label="Search orders" placeholder="Search by ID, customer, or status" value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} />
          </Card>

          <Card className="table-card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length ? (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="table-row-hover">
                        <td>#{order.id}</td>
                        <td>{order.customer_id}</td>
                        <td><Badge tone={order.status === "COMPLETED" ? "success" : "neutral"}>{order.status}</Badge></td>
                        <td>{order.total_amount}</td>
                        <td>
                          <div className="row-actions">
                            <Button variant="ghost" size="sm" onClick={() => openOrderDrawer(order.id)}>
                              Details
                            </Button>
                            {canManageOrders ? <Button variant="danger" size="sm" onClick={() => removeOrder(order)}>Delete</Button> : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty-state inline">
                          <h3>No orders found</h3>
                          <p>{orderSearch ? "Try a different filter." : "Place an order to populate the table."}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="order-card">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Create order</p>
                <h2>New line item order</h2>
              </div>
            </div>
            <form className="auth-form" onSubmit={withBusy("order", submitOrder)}>
              {role !== "CUSTOMER" ? (
                <label className="field">
                  <span className="field-label">Customer</span>
                  <select className="ui-input" required value={orderForm.customer_id} onChange={(event) => setOrderForm({ ...orderForm, customer_id: event.target.value })}>
                    <option value="">Select customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.full_name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="notice notice--inline">Your linked customer profile is used automatically.</div>
              )}

              <label className="field">
                <span className="field-label">Product</span>
                <select className="ui-input" required value={orderForm.product_id} onChange={(event) => setOrderForm({ ...orderForm, product_id: event.target.value })}>
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.quantity_in_stock})
                    </option>
                  ))}
                </select>
              </label>

              <Input label="Quantity" type="number" min="1" value={orderForm.quantity} onChange={(event) => setOrderForm({ ...orderForm, quantity: event.target.value })} />
              <Button variant="primary" type="submit" disabled={busyAction === "order" || !products.length}>
                Create order
              </Button>
            </form>
          </Card>
        </div>
      ) : null}

      {view === "profile" ? (
        <div className="page-stack two-column">
          <Card className="profile-card">
            <div className="profile-header">
              <Badge tone={role === "ADMIN" ? "success" : role === "STAFF" ? "warning" : "neutral"}>{role}</Badge>
              <h2>{currentUser?.full_name || currentUser?.username}</h2>
              <p>{currentUser?.email}</p>
            </div>

            <div className="info-grid">
              <div>
                <span>Username</span>
                <strong>{currentUser?.username}</strong>
              </div>
              <div>
                <span>Role</span>
                <strong>{currentUser?.role}</strong>
              </div>
              <div>
                <span>Phone</span>
                <strong>{currentUser?.phone_number || "Not set"}</strong>
              </div>
            </div>
          </Card>

          <Card className="profile-card">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Account settings</p>
                <h2>Update profile</h2>
              </div>
            </div>
            <form className="auth-form" onSubmit={withBusy("profile", submitProfile)}>
              <Input label="Full name" value={profileForm.full_name} onChange={(event) => setProfileForm({ ...profileForm, full_name: event.target.value })} />
              <Input label="Email" type="email" value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} />
              <Input label="Phone" value={profileForm.phone_number} onChange={(event) => setProfileForm({ ...profileForm, phone_number: event.target.value })} />
              <Button variant="primary" type="submit" disabled={busyAction === "profile"}>
                Save profile
              </Button>
            </form>

            <div className="divider" />

            <div className="panel-header">
              <div>
                <p className="panel-kicker">Security</p>
                <h2>Change password</h2>
              </div>
            </div>
            <form className="auth-form" onSubmit={withBusy("password", submitPasswordChange)}>
              <PasswordField
                label="Current password"
                value={passwordForm.current_password}
                onChange={(event) => setPasswordForm({ ...passwordForm, current_password: event.target.value })}
                placeholder="Current password"
                autoComplete="current-password"
              />
              <PasswordField
                label="New password"
                value={passwordForm.new_password}
                onChange={(event) => setPasswordForm({ ...passwordForm, new_password: event.target.value })}
                placeholder="New password"
                autoComplete="new-password"
              />
              <PasswordField
                label="Confirm password"
                value={passwordForm.confirm_password}
                onChange={(event) => setPasswordForm({ ...passwordForm, confirm_password: event.target.value })}
                placeholder="Confirm new password"
                autoComplete="new-password"
              />
              <Button variant="secondary" type="submit" disabled={busyAction === "password"}>
                Update password
              </Button>
            </form>
          </Card>
        </div>
      ) : null}

      {view === "users" && canManageUsers ? (
        <div className="page-stack">
          <Card className="toolbar-card">
            <Input label="Search users" placeholder="Search by name, username, or email" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} />
          </Card>

          <Card className="table-card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Full name</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length ? (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="table-row-hover">
                        <td>{user.full_name}</td>
                        <td>{user.username}</td>
                        <td>{user.email}</td>
                        <td>
                          <select className="ui-input" value={user.role} onChange={(event) => updateUserRole(user.id, event.target.value)}>
                            <option value="ADMIN">ADMIN</option>
                            <option value="STAFF">STAFF</option>
                            <option value="CUSTOMER">CUSTOMER</option>
                          </select>
                        </td>
                        <td>
                          <Button variant="danger" size="sm" onClick={() => removeUser(user)}>
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty-state inline">
                          <h3>No users found</h3>
                          <p>{userSearch ? "Try a different search." : "User records will appear here after seeding or role assignment."}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}

      {view === "reports" && role === "ADMIN" ? (
        <div className="page-stack">
          <div className="dashboard-metrics dashboard-metrics--reports">
            <Card className="metric-card metric-card--primary">
              <span>Revenue this month</span>
              <strong>{formatMoney(dashboard.revenue_month)}</strong>
              <small>Order value across the platform</small>
            </Card>
            <Card className="metric-card">
              <span>Pending orders</span>
              <strong>{dashboard.pending_orders}</strong>
              <small>Need a status update</small>
            </Card>
            <Card className="metric-card">
              <span>Low stock products</span>
              <strong>{dashboard.low_stock_products.length}</strong>
              <small>Need replenishment</small>
            </Card>
            <Card className="metric-card">
              <span>Inventory value</span>
              <strong>{formatMoney(dashboard.inventory_value)}</strong>
              <small>On-hand stock value</small>
            </Card>
          </div>

          <div className="dashboard-content">
            <Card className="panel-card">
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">Reports</p>
                  <h2>Order activity</h2>
                </div>
              </div>
              <div className="mini-list">
                {dashboard.recent_orders.length ? (
                  dashboard.recent_orders.map((order) => (
                    <div key={order.id} className="alert-row">
                      <div>
                        <strong>Order #{order.id}</strong>
                        <p>{new Date(order.created_at).toLocaleDateString()} • {order.status}</p>
                      </div>
                      <Badge tone={isActionableOrderStatus(order.status) ? "warning" : "success"}>{formatMoney(order.total_amount)}</Badge>
                    </div>
                  ))
                ) : (
                  <div className="empty-state compact">
                    <h3>No report data</h3>
                    <p>Reports will populate when orders are available.</p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="panel-card">
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">Inventory</p>
                  <h2>Low stock items</h2>
                </div>
              </div>
              {dashboard.low_stock_products.length ? (
                <div className="mini-list">
                  {dashboard.low_stock_products.map((product) => (
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
                <div className="empty-state compact">
                  <h3>No low stock alerts</h3>
                  <p>Inventory is above the low-stock threshold.</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : null}

      {view === "settings" && role === "ADMIN" ? (
        <div className="page-stack two-column">
          <Card className="profile-card">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Profile</p>
                <h2>Account settings</h2>
              </div>
            </div>
            <form className="auth-form" onSubmit={withBusy("profile", submitProfile)}>
              <Input label="Full name" value={profileForm.full_name} onChange={(event) => setProfileForm({ ...profileForm, full_name: event.target.value })} />
              <Input label="Email" type="email" value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} />
              <Input label="Phone" value={profileForm.phone_number} onChange={(event) => setProfileForm({ ...profileForm, phone_number: event.target.value })} />
              <Button variant="primary" type="submit" disabled={busyAction === "profile"}>
                Save profile
              </Button>
            </form>
          </Card>

          <Card className="profile-card">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Security</p>
                <h2>Change password</h2>
              </div>
            </div>
            <form className="auth-form" onSubmit={withBusy("password", submitPasswordChange)}>
              <PasswordField
                label="Current password"
                value={passwordForm.current_password}
                onChange={(event) => setPasswordForm({ ...passwordForm, current_password: event.target.value })}
                placeholder="Current password"
                autoComplete="current-password"
              />
              <PasswordField
                label="New password"
                value={passwordForm.new_password}
                onChange={(event) => setPasswordForm({ ...passwordForm, new_password: event.target.value })}
                placeholder="New password"
                autoComplete="new-password"
              />
              <PasswordField
                label="Confirm password"
                value={passwordForm.confirm_password}
                onChange={(event) => setPasswordForm({ ...passwordForm, confirm_password: event.target.value })}
                placeholder="Confirm new password"
                autoComplete="new-password"
              />
              <Button variant="secondary" type="submit" disabled={busyAction === "password"}>
                Update password
              </Button>
            </form>
          </Card>

          <Card className="panel-card">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">System</p>
                <h2>Configuration</h2>
              </div>
            </div>
            <div className="detail-list-block">
              <div className="line-item">
                <div>
                  <strong>API keys</strong>
                  <p>Manage service credentials and integrations.</p>
                </div>
                <Badge tone="neutral">Planned</Badge>
              </div>
              <div className="line-item">
                <div>
                  <strong>Notifications</strong>
                  <p>Control order, stock, and account alerts.</p>
                </div>
                <Badge tone="neutral">Planned</Badge>
              </div>
              <div className="line-item">
                <div>
                  <strong>Inventory rules</strong>
                  <p>Set low-stock thresholds and reorder settings.</p>
                </div>
                <Badge tone="neutral">Planned</Badge>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      <Dialog
        open={productDialogOpen}
        onClose={closeProductDialog}
        title={productDialogMode === "edit" ? "Edit product" : "Create product"}
        description="Use the modal to keep the catalog visible while you work."
        wide
        footer={
          <div className="dialog-actions">
            <Button variant="ghost" onClick={closeProductDialog} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="product-form" disabled={busyAction === "product"}>
              Save
            </Button>
          </div>
        }
      >
        <form id="product-form" className="auth-form" onSubmit={withBusy("product", submitProduct)}>
          <Input label="Name" value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} />
          <Input label="SKU" value={productForm.sku} onChange={(event) => setProductForm({ ...productForm, sku: event.target.value })} />
          <Input label="Price" type="number" step="0.01" min="0" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} />
          <Input label="Stock" type="number" min="0" value={productForm.quantity_in_stock} onChange={(event) => setProductForm({ ...productForm, quantity_in_stock: event.target.value })} />
        </form>
      </Dialog>

      <Drawer
        open={productDrawerOpen}
        onClose={closeProductDrawer}
        title={selectedProduct ? selectedProduct.name : "Product details"}
        description="Inspect the product record and jump into editing from the drawer."
        wide
        footer={
          selectedProduct ? (
            <div className="dialog-actions">
              {canManageProducts ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    closeProductDrawer();
                    openProductDialog("edit", selectedProduct);
                  }}
                  type="button"
                >
                  Edit product
                </Button>
              ) : null}
              {canManageProducts ? (
                <Button variant="danger" onClick={() => removeProduct(selectedProduct)} type="button">
                  Delete product
                </Button>
              ) : null}
            </div>
          ) : null
        }
      >
        {selectedProduct ? (
          <div className="drawer-summary">
            <div className="info-grid">
              <div>
                <span>Name</span>
                <strong>{selectedProduct.name}</strong>
              </div>
              <div>
                <span>SKU</span>
                <strong>{selectedProduct.sku}</strong>
              </div>
              <div>
                <span>Price</span>
                <strong>{formatMoney(selectedProduct.price)}</strong>
              </div>
              <div>
                <span>Stock</span>
                <strong>{selectedProduct.quantity_in_stock}</strong>
              </div>
            </div>
            <div className="detail-list-block">
              <h3>Availability</h3>
              <Badge tone={selectedProduct.quantity_in_stock <= 2 ? "warning" : "success"}>
                {selectedProduct.quantity_in_stock <= 2 ? "Low stock" : "Healthy stock"}
              </Badge>
            </div>
          </div>
        ) : null}
      </Drawer>

      <Drawer
        open={customerDrawerOpen}
        onClose={closeCustomerDrawer}
        title={selectedCustomer && selectedCustomer.id ? (customerDrawerMode === "edit" ? "Edit customer" : selectedCustomer.full_name) : "Create customer"}
        description="Profile, order history, and edit workflows live in a drawer so the table stays visible."
        wide
        footer={
          <div className="dialog-actions">
            <Button variant="ghost" onClick={closeCustomerDrawer} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="customer-form" disabled={busyAction === "customer"}>
              Save customer
            </Button>
          </div>
        }
      >
        {customerDrawerMode === "view" && selectedCustomer?.id ? (
          <div className="drawer-summary">
            <div className="info-grid">
              <div>
                <span>Name</span>
                <strong>{selectedCustomer.full_name}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{selectedCustomer.email}</strong>
              </div>
              <div>
                <span>Phone</span>
                <strong>{selectedCustomer.phone_number}</strong>
              </div>
              <div>
                <span>Linked user</span>
                <strong>{selectedCustomer.user_id ?? "None"}</strong>
              </div>
              <div>
                <span>Total spent</span>
                <strong>{formatMoney(selectedCustomerTotalSpent)}</strong>
              </div>
            </div>
            <div className="detail-list-block">
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">Order history</p>
                  <h3>Recent purchases</h3>
                </div>
              </div>
              {selectedCustomerOrders.length ? (
                <div className="line-items">
                  {selectedCustomerOrders.slice(0, 5).map((order) => (
                    <div key={order.id} className="line-item">
                      <div>
                        <strong>Order #{order.id}</strong>
                        <p>{order.status} • {new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                      <Badge tone={isActionableOrderStatus(order.status) ? "warning" : "success"}>{formatMoney(order.total_amount)}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state compact">
                  <h3>No orders yet</h3>
                  <p>This customer has not placed any orders.</p>
                </div>
              )}
            </div>
            <div className="dialog-actions dialog-actions--start">
              <Button variant="secondary" onClick={() => setCustomerDrawerMode("edit")} type="button">
                Edit customer
              </Button>
              <Button variant="ghost" onClick={() => setView("orders")} type="button">
                Open orders page
              </Button>
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

      <Drawer
        open={orderDrawerOpen}
        onClose={closeOrderDrawer}
        title={selectedOrder ? `Order #${selectedOrder.id}` : "Order details"}
        description="Inspect the full order payload, line items, and inventory effect."
        wide
        footer={selectedOrder && canManageOrders ? <Button variant="danger" onClick={() => removeOrder(selectedOrder)} type="button">Delete order</Button> : null}
      >
        {selectedOrder ? (
          <div className="drawer-summary">
            <div className="info-grid">
              <div>
                <span>Customer</span>
                <strong>{selectedOrder.customer_id}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{selectedOrder.status}</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>{selectedOrder.total_amount}</strong>
              </div>
              <div>
                <span>Items</span>
                <strong>{selectedOrder.items?.length || 0}</strong>
              </div>
            </div>
            <div className="detail-list-block">
              <h3>Line items</h3>
              {selectedOrder.items?.length ? (
                <div className="line-items">
                  {selectedOrder.items.map((item) => (
                    <div key={`${selectedOrder.id}-${item.product_id}`} className="line-item">
                      <div>
                        <strong>Product #{item.product_id}</strong>
                        <p>Quantity {item.quantity}</p>
                      </div>
                      <Badge tone="neutral">{item.unit_price} each</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state compact">
                  <h3>No items loaded</h3>
                  <p>Open the order again to refresh the details payload.</p>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Drawer>

      <Dialog
        open={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        title={`Delete ${confirmAction?.kind || "item"}?`}
        description={confirmAction ? `${confirmAction.label} will be removed. This action cannot be undone.` : ""}
        footer={
          <div className="dialog-actions">
            <Button variant="ghost" onClick={() => setConfirmAction(null)} type="button">
              Cancel
            </Button>
            <Button variant="danger" onClick={performDelete} type="button">
              Delete
            </Button>
          </div>
        }
      >
        <p>This will permanently remove the selected record from the workspace.</p>
      </Dialog>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </AppChrome>
  );
}

export default App;
