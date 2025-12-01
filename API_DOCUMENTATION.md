# DALI E-Commerce API Documentation

## Table of Contents
1. [Home](#home)
2. [Account Management](#account-management)
3. [Password Management](#password-management)
4. [Products](#products)
5. [Shopping Cart](#shopping-cart)
6. [Checkout](#checkout)
7. [Orders](#orders)
8. [Payment](#payment)
9. [Addresses](#addresses)
10. [Stores](#stores)
11. [Locations](#locations)
12. [Admin Panel](#admin-panel)

---

## Home

### GET `/`
**Description:** Display the home page  
**Authentication:** Not required  
**Returns:** Home page view

---

## Account Management

### GET `/register`
**Description:** Display registration form  
**Authentication:** Not required  
**Returns:** Registration page view

### POST `/register`
**Description:** Register a new user account  
**Authentication:** Not required  
**Parameters:**
- `account` (body): Account object with user details
  - `email`: User's email address
  - `password`: User's password
  - `firstName`: User's first name
  - `lastName`: User's last name
  - `phoneNumber`: User's phone number

**Returns:** 
- Success: Redirect to home page (auto-login) or login page
- Error: Redirect to registration with error message

**Notes:** Automatically logs in the user and merges session cart with user cart

### GET `/login`
**Description:** Display login form  
**Authentication:** Not required  
**Returns:** Login page view

### GET `/profile`
**Description:** View user profile and order history  
**Authentication:** Required  
**Returns:** Profile page with user details and orders

### GET `/profile/details/edit`
**Description:** Get editable profile details form fragment  
**Authentication:** Required  
**Returns:** HTMX fragment with editable profile form

### GET `/profile/details/view`
**Description:** Get read-only profile details view fragment  
**Authentication:** Required  
**Returns:** HTMX fragment with read-only profile view

### POST `/profile/details/update`
**Description:** Update user profile details  
**Authentication:** Required  
**Parameters:**
- `account` (body): Updated account information
  - `firstName`: Updated first name
  - `lastName`: Updated last name
  - `phoneNumber`: Updated phone number

**Returns:** HTMX fragment with updated profile view

### GET `/profile/change-password`
**Description:** Display password change page  
**Authentication:** Required  
**Returns:** Change password page view

### POST `/profile/change-password`
**Description:** Process password change request  
**Authentication:** Required  
**Parameters:**
- `currentPassword`: User's current password
- `newPassword`: New password
- `confirmPassword`: Password confirmation

**Returns:** 
- Success: Redirect to login page (requires re-authentication)
- Error: Redirect back with error message

---

## Password Management

### GET `/forgot-password`
**Description:** Display forgot password form  
**Authentication:** Not required  
**Returns:** Forgot password page view

### POST `/forgot-password`
**Description:** Process forgot password request and send reset email  
**Authentication:** Not required  
**Parameters:**
- `email`: User's email address

**Returns:** 
- Success: Redirect with success message
- Error: Redirect with error message if email not found

### GET `/reset-password`
**Description:** Display password reset form  
**Authentication:** Not required  
**Parameters:**
- `token`: Password reset token from email

**Returns:** 
- Valid token: Password reset page
- Invalid token: Redirect to login with error

### POST `/reset-password`
**Description:** Process password reset  
**Authentication:** Not required  
**Parameters:**
- `token`: Password reset token
- `password`: New password
- `confirmPassword`: Password confirmation

**Returns:** 
- Success: Redirect to login with success message
- Error: Redirect back with error message

---

## Products

### GET `/shop`
**Description:** Display shop page with all products  
**Authentication:** Not required  
**Returns:** Shop page with products and categories

**Notes:** Shows available quantities based on cart contents

### GET `/shop/subcategories`
**Description:** Get subcategories for a selected category  
**Authentication:** Not required  
**Parameters:**
- `category`: Category name

**Returns:** HTMX fragment with subcategory list

### GET `/shop/products`
**Description:** Search and filter products  
**Authentication:** Not required  
**Parameters:**
- `query` (optional): Search query
- `category` (optional): Filter by category
- `subcategory` (optional): Filter by subcategory

**Returns:** HTMX fragment with filtered product list

### GET `/product/{id}`
**Description:** View product details  
**Authentication:** Not required  
**Path Variables:**
- `id`: Product ID

**Returns:** Product detail page with availability information

---

## Shopping Cart

### GET `/cart`
**Description:** View shopping cart  
**Authentication:** Not required (supports both session and authenticated carts)  
**Returns:** Cart page with items, subtotal, shipping, and total

### POST `/cart/add`
**Description:** Add item to cart  
**Authentication:** Not required  
**Parameters:**
- `productId`: ID of the product to add
- `quantity` (default: 1): Quantity to add

**Returns:** Redirect to shop with success message

### POST `/cart/update`
**Description:** Update quantity of item in cart  
**Authentication:** Not required  
**Parameters:**
- `productId`: ID of the product
- `quantity`: New quantity

**Returns:** Redirect to cart page

### POST `/cart/remove`
**Description:** Remove item from cart  
**Authentication:** Not required  
**Parameters:**
- `productId`: ID of the product to remove

**Returns:** Redirect to cart page

---

## Checkout

All checkout endpoints require authentication and use session attributes to maintain checkout state.

### GET `/checkout`
**Description:** Initialize checkout process  
**Authentication:** Required  
**Returns:** Redirect to address selection step

### GET `/checkout/address`
**Description:** Display address selection step  
**Authentication:** Required  
**Returns:** Checkout page with address selection

### POST `/checkout/address`
**Description:** Save selected address and proceed to shipping  
**Authentication:** Required  
**Parameters:**
- `addressId`: Selected address ID

**Returns:** Redirect to shipping step

### GET `/checkout/shipping`
**Description:** Display shipping method selection  
**Authentication:** Required  
**Returns:** Checkout page with shipping options and store selection for pickup

**Notes:** Calculates shipping fee based on selected address

### POST `/checkout/shipping`
**Description:** Save delivery method and proceed to payment  
**Authentication:** Required  
**Parameters:**
- `deliveryMethod`: Selected delivery method ("Standard Delivery", "Priority Delivery", or "Pickup Delivery")
- `storeId` (required for pickup): Store ID for pickup

**Returns:** 
- Success: Redirect to payment step
- Error: Redirect back with error message

### GET `/checkout/payment`
**Description:** Display payment method selection  
**Authentication:** Required  
**Returns:** Checkout page with payment options

### POST `/checkout/payment`
**Description:** Process payment and create order  
**Authentication:** Required  
**Parameters:**
- `paymentMethod`: Selected payment method ("Cash on delivery (COD)", "Maya", or "Credit/Debit Card")

**Returns:** 
- COD: Redirect to success page
- Maya/Card: Redirect to payment gateway
- Error: Redirect back with error message

### GET `/checkout/success`
**Description:** Display order success page  
**Authentication:** Required  
**Returns:** Order success page

### POST `/checkout/recalculate`
**Description:** Recalculate shipping fee when delivery method changes  
**Authentication:** Required  
**Parameters:**
- `deliveryMethod`: Selected delivery method

**Returns:** HTMX fragment with updated summary

---

## Orders

### GET `/order/{id}`
**Description:** View order details  
**Authentication:** Required  
**Path Variables:**
- `id`: Order ID

**Returns:** Order detail page

**Security:** Users can only view their own orders

### POST `/order/{id}/cancel`
**Description:** Cancel an order  
**Authentication:** Required  
**Path Variables:**
- `id`: Order ID

**Returns:** Redirect to order detail page with status message

---

## Payment

### GET `/payment/callback/success`
**Description:** Handle successful payment callback from payment gateway  
**Authentication:** Not required (uses order ID)  
**Parameters:**
- `orderId`: Order ID

**Returns:** Payment success page

**Notes:** Confirms payment and updates order status

### GET `/payment/callback/failure`
**Description:** Handle failed payment callback  
**Authentication:** Not required  
**Parameters:**
- `orderId`: Order ID

**Returns:** Redirect to payment step with error message

### GET `/payment/callback/cancel`
**Description:** Handle cancelled payment callback  
**Authentication:** Not required  
**Parameters:**
- `orderId`: Order ID

**Returns:** Redirect to payment step with cancellation message

---

## Addresses

### GET `/address/new`
**Description:** Get new address form fragment  
**Authentication:** Required  
**Parameters:**
- `context` (default: "checkout"): Context of the form

**Returns:** HTMX fragment with address form

### POST `/address/add`
**Description:** Add new address to user account  
**Authentication:** Required  
**Parameters:**
- `address`: Address object
  - `streetAddress`: Street address
  - `zipCode`: ZIP/Postal code
  - `isDefault`: Whether this is the default address
- `provinceId`: Province ID
- `cityId`: City ID
- `barangayId`: Barangay ID

**Returns:** Redirect to referring page

### GET `/address/link`
**Description:** Get address link fragment  
**Authentication:** Required  
**Parameters:**
- `context`: Context identifier

**Returns:** HTMX fragment with address link

### GET `/address/edit/{id}`
**Description:** Get edit address form fragment  
**Authentication:** Required  
**Path Variables:**
- `id`: Address ID
**Parameters:**
- `context`: Context identifier

**Returns:** HTMX fragment with pre-populated address form

### POST `/address/update/{id}`
**Description:** Update existing address  
**Authentication:** Required  
**Path Variables:**
- `id`: Address ID
**Parameters:**
- `address`: Updated address details
- `provinceId`: Province ID
- `cityId`: City ID
- `barangayId`: Barangay ID

**Returns:** Redirect to referring page

---

## Stores

### GET `/stores`
**Description:** Display all stores page  
**Authentication:** Not required  
**Returns:** Stores page with all stores

### GET `/stores/search`
**Description:** Search stores  
**Authentication:** Not required  
**Parameters:**
- `query` (optional): Search query for store name

**Returns:** HTMX fragment with filtered store list

### GET `/api/stores`
**Description:** Get all stores as JSON  
**Authentication:** Not required  
**Returns:** JSON array of all stores

**Response Format:**
```json
[
  {
    "id": 1,
    "name": "Store Name",
    "streetAddress": "123 Main St",
    "barangay": {...},
    "city": {...},
    "province": {...},
    "zipCode": "1234",
    "latitude": 14.5995,
    "longitude": 120.9842
  }
]
```

### GET `/stores/search-for-checkout`
**Description:** Search stores for checkout pickup selection  
**Authentication:** Required  
**Parameters:**
- `query` (optional): Search query

**Returns:** HTMX fragment with store list for checkout

---

## Locations

### GET `/api/locations/cities`
**Description:** Get cities for a province  
**Authentication:** Not required  
**Parameters:**
- `provinceId`: Province ID

**Returns:** HTMX fragment with city select options

### GET `/api/locations/barangays`
**Description:** Get barangays for a city  
**Authentication:** Not required  
**Parameters:**
- `cityId`: City ID

**Returns:** HTMX fragment with barangay select options

---

## Admin Panel

All admin endpoints require ADMIN role authentication.

### GET `/admin/login`
**Description:** Display admin login page  
**Authentication:** Not required  
**Returns:** Admin login page

### GET `/admin`
**Description:** Display admin dashboard  
**Authentication:** Required (ADMIN)  
**Returns:** Admin home page

### GET `/admin/inventory`
**Description:** Display inventory management page  
**Authentication:** Required (ADMIN)  
**Returns:** Inventory page with all products and categories

### GET `/admin/inventory/products`
**Description:** Search and filter inventory  
**Authentication:** Required (ADMIN)  
**Parameters:**
- `query` (optional): Product name search
- `category` (optional): Filter by category

**Returns:** HTMX fragment with filtered product list

### GET `/admin/product/{id}`
**Description:** View product details in admin panel  
**Authentication:** Required (ADMIN)  
**Path Variables:**
- `id`: Product ID

**Returns:** Admin product detail page

### POST `/admin/inventory/update`
**Description:** Update product stock quantity  
**Authentication:** Required (ADMIN)  
**Parameters:**
- `productId`: Product ID
- `quantity`: New stock quantity

**Returns:** Redirect to referring page with status message

### GET `/admin/orders`
**Description:** Display all orders  
**Authentication:** Required (ADMIN)  
**Returns:** Admin orders page with all orders (newest first)

### GET `/admin/orders/search`
**Description:** Search orders  
**Authentication:** Required (ADMIN)  
**Parameters:**
- `query` (optional): Search by order ID, customer name, or email

**Returns:** HTMX fragment with filtered order list

### GET `/admin/order/{id}`
**Description:** View order details in admin panel  
**Authentication:** Required (ADMIN)  
**Path Variables:**
- `id`: Order ID

**Returns:** Admin order detail page

### POST `/admin/order/{id}/update-status`
**Description:** Update order shipping status  
**Authentication:** Required (ADMIN)  
**Path Variables:**
- `id`: Order ID
**Parameters:**
- `status`: New shipping status
  - Allowed values: `PENDING`, `PROCESSING`, `SHIPPED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`

**Returns:** Redirect to order detail page with status message

---

## Common Response Patterns

### Success Redirects
Most POST endpoints redirect to a relevant page with success messages stored in flash attributes:
- `successMessage`: Success notification
- `message`: Informational message

### Error Redirects
Failed operations redirect with error messages:
- `errorMessage`: Error notification
- `error`: Error description

### HTMX Fragments
Many GET endpoints return Thymeleaf fragments for dynamic updates:
- Fragment format: `template-name :: fragment-name`
- Used for live search, filtering, and form updates without full page reloads

### Authentication
- User endpoints: Require authenticated user (any role)
- Admin endpoints: Require ADMIN role
- Public endpoints: No authentication required
- Session-based endpoints (cart): Support both authenticated and anonymous users

---

## Notes

1. **Cart Behavior**: The cart supports both session-based (anonymous) and database-based (authenticated) storage. When a user logs in or registers, session cart items are merged with their database cart.

2. **Checkout Flow**: The checkout process maintains state using `@SessionAttributes` and follows a strict sequential flow: Address → Shipping → Payment → Success.

3. **Payment Integration**: The application integrates with Maya payment gateway for card payments while also supporting Cash on Delivery.

4. **Address System**: Uses a hierarchical location system (Province → City → Barangay) with cascading dropdowns powered by HTMX.

5. **Admin Security**: All admin routes are protected and require ADMIN role authentication.

6. **HTMX Usage**: The application heavily uses HTMX for dynamic content updates, search functionality, and form submissions without full page reloads.
