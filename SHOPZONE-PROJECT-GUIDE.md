# ShopZone project walkthrough and run guide

This guide explains the ShopZone e-commerce project in simple English. It can be used to present the project to a manager and to run it on a development computer.

## A simple explanation for a manager

> ShopZone is an online shopping project built from separate parts. Customers use a website to browse products, manage a cart, sign in, and place orders. The website is divided into small frontend modules. Each business module has its own API and database, and the API Gateway gives the frontends one address for backend requests. PostgreSQL stores the data. An optional Docker Compose setup can run the older single API with PostgreSQL for backend testing.

### How the project was put together

1. **Plan the shopping features.** Divide the work into areas such as products, accounts, cart, checkout, orders, reviews, and inventory.
2. **Set up the data layer.** Use PostgreSQL for persistent data. Define each implemented module's database connection, models, and migrations.
3. **Build the APIs.** Give each business module its own backend so it can handle its own requests and data.
4. **Connect the APIs.** Add the API Gateway so the frontends can use one base URL and the gateway can forward each request to the correct backend.
5. **Build the frontend modules.** Implement the user interface for each business area as an independently built module.
6. **Bring the modules together.** Use the host website and module federation to load the frontend modules in one experience.
7. **Add test and support tools.** Include migrations, seed data, tests, Postman requests, and setup documentation so the project can be checked and demonstrated.
8. **Run and demonstrate the shopping flow.** Start the database and application services, then demonstrate signing in, finding products, adding them to a cart, and using checkout.

## 1. What is in this project?

ShopZone is arranged as a host website plus separate frontend and backend projects for each implemented business module.

- **Host website** is the shared page shell. It displays navigation and loads a module inside the page.
- **Module frontend** is the user interface for one area, such as Products or Orders.
- **Module API** is the backend for that area.
- **PostgreSQL database** stores that module's data.
- **API Gateway** gives the frontends one API address and forwards each request to the right module API.
- **Sequelize** connects each implemented API to its own PostgreSQL database and manages its models and migrations.

The project currently contains ten module projects. Five modules from the larger plan are not implemented yet; they are listed below so that the planned ports and database names are clear.

## 2. Port and database list

| Website or module | Frontend port | Backend port | Database | Current status |
|---|---:|---:|---|---|
| Host website | 3000 | — | — | Implemented |
| Product | 3002 | 5002 | `shopzone_products` | Implemented |
| Cart | 3003 | 5003 | `shopzone_cart` | Implemented |
| Authentication | 3004 | 5001 | `shopzone_auth` | Implemented |
| Admin | 3005 | 5013 | `shopzone_admin` | Implemented |
| Wishlist | 3006 | 5006 | `shopzone_wishlist` | Implemented |
| Order | 3007 | 5004 | `shopzone_orders` | Implemented |
| Checkout | 3008 | 5014 | `shopzone_checkout` | Implemented |
| Review | 3009 | 5007 | `shopzone_reviews` | Implemented |
| Contact | 3010 | 5009 | `shopzone_auth` (`contact` schema) | Implemented |
| Inventory | 3011 | 5008 | `shopzone_inventory` | Implemented |
| Payment | 3016 | 5005 | `shopzone_payments` | Planned; project not implemented |
| Notification | 3012 | 5015 | `shopzone_notifications` | Planned; project not implemented |
| User Profile | 3013 | 5010 | `shopzone_profiles` | Planned; project not implemented |
| Shipping | 3014 | 5011 | `shopzone_shipping` | Planned; project not implemented |
| Coupon | 3015 | 5012 | `shopzone_coupons` | Planned; project not implemented |
| API Gateway | — | **5000** | — | Implemented |
| PostgreSQL | — | **5432** | — | Local database server |

**Important:** this checkout uses gateway port **5000**, not 4000. The host, gateway, and individual module ports must be free before starting their services. The Contact form uses frontend port **3010** and API port **5009**; the API gateway forwards `/api/contact` to the Contact API.

The Contact API uses a dedicated `contact` schema in `shopzone_auth`, separate from the Auth tables. It creates that schema and the `contact_messages` table on startup, using the Contact database connection in `modules/contact/backend/.env`.

## 3. What each service does

- **Product:** shows the product catalogue. Sample data contains 22 products.
- **Cart:** keeps a signed-in customer's selected products.
- **Authentication:** registers and signs in customers and checks their account token.
- **Admin:** stores administrative audit records. Products added by a Super Admin, Manager, or Seller are also recorded there as snapshots; the Products service remains the source of truth for the live catalogue.
- **Wishlist:** saves products for later.
- **Order:** stores orders, their items, totals, status, and delivery address.
- **Checkout:** collects delivery details and coordinates order placement with other services.
- **Review:** stores product reviews.
- **Inventory:** stores stock and reserves available units during checkout.
- **Contact:** accepts customer enquiries and stores their messages and submission dates in its own database.
- **Payment, Notification, User Profile, Shipping, and Coupon:** planned but not yet available as independent projects in this workspace.

The Checkout API calls other APIs over HTTP. It does not read their databases directly. Cash on Delivery checkout needs the Cart, Product, Inventory, Order, and Checkout APIs, a non-empty cart, and available stock. COD does not call Payment or Shipping because those services are not implemented. Online payment is not available.

## 4. Project folders

```text
.vscode/
  settings.json                 Workspace editor settings
apps/
  host/                         Main React/Vite host website on port 3000
docs/
  openapi.yaml                  API reference for the older single-API application
infrastructure/
  api-gateway/                  Express API gateway on port 5000 for microservices
  create-databases.sql          SQL listing the planned database names
modules/
  products/
    frontend/                   Product frontend module (MFE) on port 3002
    backend/
      src/                      Product API code
      migrations/               Product database table changes
  cart/
    frontend/
    backend/
  auth/
    frontend/
    backend/
  admin/
    frontend/
    backend/
  wishlist/
    frontend/
    backend/
  orders/
    frontend/
    backend/
  checkout/
    frontend/
    backend/
  reviews/
    frontend/
    backend/
  contact/
    frontend/                   Contact form module (MFE) on port 3010
    backend/                    Contact API and isolated contact schema on port 5009
  inventory/
    frontend/
    backend/
  shared/                       Shared frontend presentation/event utilities
postman/
  ShopZone.postman_collection.json  Requests for testing the microservice APIs
scripts/
  federation-serve.js           Serves built frontend modules on their ports
  federation-dev.js              Builds and serves one frontend module during development
  stop-port.js                   Stops a listener on an approved project port
services/
  api/
    src/                         Separate, older single-API application code
    migrations/                  Database changes for that single API
    Dockerfile                   Instructions to package that API as a container
docker-compose.yml               Optional setup for the older API and PostgreSQL
```

Each implemented backend contains its own `.env`, `src/`, `src/models/`, `src/routes/`, `src/controllers/` where needed, and `migrations/`. Each frontend contains its own `package.json`, `.env`, Vite configuration, and `src/`.

The `modules/shared` folder contains shared frontend utilities; it is not a shared backend or database. The nine implemented business APIs each use a separate database.

The actual folder names are `infrastructure/` and `scripts/` (plural). The `services/api/` project is a separate single API with its own migrations; it is not the same code as the APIs in `modules/`.

## 5. First-time setup

### Requirements

- Node.js and npm
- PostgreSQL running on port 5432
- The project-specific private `.env` files

From PowerShell, move into the project folder and install dependencies:

```powershell
Set-Location C:\Users\acer\Documents\e-commecre
npm install
```

Before starting the microservice setup, make sure PostgreSQL is running and each implemented backend has a private `.env` file with its own database connection and required settings. Use the matching `.env.example` as a template if needed. Keep secrets private; do not put real passwords in this guide, paste them into chat, or commit them to source control. The scaffolder previously provisioned dedicated database roles and databases for the nine implemented services. If setting up a new machine, make sure each database and matching role exist before starting its API.

`infrastructure/create-databases.sql` lists all 14 planned database names. It is not a complete role-and-password provisioning script; do not run it blindly on a database server where those databases already exist.

## 6. Start the entire implemented site

Use this as the main way to run the current microfrontend and microservice project:

```powershell
Set-Location C:\Users\acer\Documents\e-commecre
npm run dev:all
```

The root development command first builds the host and the nine implemented frontend modules. It then starts the host, API Gateway, implemented module APIs, and frontend federation server. Keep the terminal open while using the site. Open:

- Host website: <http://localhost:3000>
- API gateway health: <http://localhost:5000/health>
- PostgreSQL: `localhost:5432`

The current `dev:all` command includes only the nine implemented modules. It cannot start the five planned modules because their projects have not been created.

### What to run, in order

1. Start PostgreSQL on port 5432. Confirm its databases and matching users are set up.
2. Install project packages once with `npm install`.
3. Configure the private environment files for the services you will run.
4. Start the full application with `npm run dev:all`. This command builds the frontend modules, prepares each API database one at a time, and waits for the APIs and gateway to pass their health checks before starting the website.
5. Open <http://localhost:3000> and test the customer journey.
6. When finished, press **Ctrl+C** in the terminal running the services.

To check the API Gateway separately, open <http://localhost:5000/health>. For a module API, use its health URL from the port table, for example <http://localhost:5004/health> for Orders.

## 7. Start one module by itself

For example, start the Orders backend:

```powershell
npm run dev --workspace @shopzone/orders-api
```

Its API listens on port 5004 and its health check is <http://localhost:5004/health>. Open My Orders in the host at <http://localhost:3000/orders>.

Start that module's frontend separately when needed:

```powershell
npm run dev --workspace @shopzone/orders-mfe
```

Its standalone frontend is on port 3007. The module frontend sends API requests through the gateway, so start the gateway too:

```powershell
npm run dev:gateway
```

Replace `orders` with another implemented module name, for example `products`, `cart`, `auth`, `admin`, `wishlist`, `checkout`, `reviews`, or `inventory`. Starting one API does not automatically start the other APIs. Some operations, especially checkout, need several services to be running.

Do not start a second copy of a service that is already running on its port.

If a port is already in use, first find the process in PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen |
  Select-Object LocalAddress, LocalPort, OwningProcess
Get-Process -Id <PID>
```

Only stop the process if you have confirmed it is an old ShopZone process that you no longer need:

```powershell
Stop-Process -Id <PID>
```

Replace `<PID>` with the number from the first command. Otherwise, stop the application's original terminal with **Ctrl+C** or choose a different port.

## 8. Normal customer journey

1. Open the host at <http://localhost:3000>.
2. Register a customer account or sign in using **Account / Sign in**.
3. Browse the catalogue under **Home & Shop**.
4. Add products to the cart. The cart belongs to the signed-in customer.
5. Open Checkout and enter recipient name, phone, street address, city, state, and PIN code.
6. Place the order using the currently supported Cash on Delivery option.
7. Open **My orders** to see the order, items, total, status, and delivery address. You can cancel an order while it is still placed; cancelled orders can be removed from your order history. Use **Write a review** under an item to review it.
8. Customers can also view and submit reviews from the product details window. Sign in before submitting a review.

For checkout, ensure the Product, Cart, Inventory, Order, and Checkout APIs are available, along with the gateway. Inventory must have enough stock for the products in the cart.

## 9. Databases, models, and migrations

Each implemented backend has a Sequelize connection configured in `backend/src/db.js`, a model under `backend/src/models/`, and a migration under `backend/migrations/`.

Examples:

- Orders model: `modules/orders/backend/src/models/Order.js`
- Orders migration: `modules/orders/backend/migrations/001-create-entity.js`
- Orders API: `modules/orders/backend/src/routes/index.js`
- Checkout API: `modules/checkout/backend/src/routes/index.js`
- Gateway routing: `infrastructure/api-gateway/src/server.js`

Run an individual backend migration using its workspace command. For Orders:

```powershell
npm run migrate --workspace @shopzone/orders-api
```

The development server also checks and applies its initial table migration at startup. Seed the Product catalogue with:

```powershell
npm run seed --workspace @shopzone/products-api
```

Migrations are versioned database changes: they create or update tables without mixing database setup into the website code. A migration under `modules/orders/backend/migrations/` is for the Orders database. A migration under `services/api/migrations/` is only for the separate single API.

Authentication has a seed command for safely creating a configured super-admin. Set the intended admin email and a strong password in the private Authentication backend `.env` first; never put the password in a committed file.

Run an individual module's tests like this:

```powershell
npm test --workspace @shopzone/orders-api
```

## 10. Postman testing

Import [ShopZone.postman_collection.json](./postman/ShopZone.postman_collection.json) into Postman. Its gateway URL is `http://localhost:5000`.

For a basic customer test:

1. Run **Gateway → Health**.
2. Run **Authentication → Register customer**.
3. Run **Authentication → Current user**. Postman should reuse the authentication cookie.
4. Run **Product → List products** to load the sample catalogue and select a product ID.
5. Use the Cart requests.
6. For checkout, first ensure inventory has stock and all required APIs are running.

Admin and inventory write tests require a super-admin or an authorized inventory account. The collection includes tests for the five planned services, but those requests will not work until the services are implemented and added to the gateway.

## 11. Troubleshooting

### My Orders reports 503

503 usually means the gateway could not reach the Orders API. Start it:

```powershell
npm run dev --workspace @shopzone/orders-api
```

Check <http://localhost:5004/health>, then refresh My Orders. A 401 means the API is reachable but you need to sign in. A 503 from the gateway means the Orders API is not running or cannot connect to its database.

Reviews use their own API and database. Check <http://localhost:5007/health>; product reviews are listed publicly, while submitting a review requires a signed-in customer.

### Port already in use

Only one process can listen on a port. Stop the existing service using its workspace's `stop` script, or stop the development terminal that started it, then start the service again.

### Checkout cannot place an order

Sign in, add a product to the cart, and make sure Inventory has stock. Check that the Cart, Product, Authentication, Inventory, Order, and Checkout APIs are available, along with the API Gateway. The current supported checkout option is Cash on Delivery; separate Payment and Shipping modules have not been implemented.

## 12. Current scope and known gaps

The workspace has the host, gateway, and nine module projects. Payment, Notification, User Profile, Shipping, and Coupon are not yet implemented as independent modules. The current gateway source routes only the existing nine modules. The original 14-module design requires adding those five projects, their database users and databases, Sequelize setup, models, migrations, routes, frontend projects, gateway routes, and start/stop support.

The old Bharat Bazaar application may also remain in the repository. Its API/frontend and Postman collection are separate from the ShopZone ports and instructions in this guide.

## A short live demonstration

For a manager presentation, you can explain and demonstrate the system in this order:

1. **Show the website:** open <http://localhost:3000> and explain that the host brings independently built shopping modules together.
2. **Show the catalogue:** open the shop and point out that product data comes from the Product API.
3. **Show account and cart:** sign in, add an item, and explain that protected customer data is associated with the signed-in user.
4. **Show checkout and orders:** explain that checkout contacts multiple APIs, while the Order API stores the order.
5. **Show the backend path:** open <http://localhost:5000/health> and explain that the Gateway routes API requests to the right module.
6. **Explain persistence and scope:** PostgreSQL stores service data, migrations define database changes, and five planned modules are not implemented yet.

Be clear that the primary setup is for development and checkout depends on the required services and available inventory.
