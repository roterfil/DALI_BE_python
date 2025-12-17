import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import AdminLayout from './components/AdminLayout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

// Public Pages
import Home from './pages/Home'
import Shop from './pages/Shop'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Stores from './pages/Stores'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'

// Protected Pages
import Profile from './pages/Profile'
import Checkout from './pages/Checkout'
import OrderDetail from './pages/OrderDetail'
import OrderSuccess from './pages/OrderSuccess'
import PaymentSuccess from './pages/PaymentSuccess'
import ChangePassword from './pages/ChangePassword'

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin'
import AdminHome from './pages/admin/AdminHome'
import AdminInventory from './pages/admin/AdminInventory'
import AdminOrders from './pages/admin/AdminOrders'
import AdminOrderDetail from './pages/admin/AdminOrderDetail'
import AdminProductDetail from './pages/admin/AdminProductDetail'
import AdminAudit from './pages/admin/AdminAudit'

function App() {
  return (
    <Routes>
      {/* Public Routes with Main Layout */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/stores" element={<Stores />} />
      </Route>

      {/* Auth Pages (no layout) */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/order/:id" element={<OrderDetail />} />
          <Route path="/change-password" element={<ChangePassword />} />
        </Route>
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-success" element={<OrderSuccess />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminHome />} />
          <Route path="/admin/inventory" element={<AdminInventory />} />
          <Route path="/admin/inventory/:id" element={<AdminProductDetail />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/orders/:id" element={<AdminOrderDetail />} />
          <Route path="/admin/audit" element={<AdminAudit />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
