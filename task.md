# Full Stack Developer Case Study — Complete Implementation Task

## Objective

Build and deliver a fully working **Mini ERP + CRM Operations Portal** for a wholesale/distribution company.

This must be a real full-stack application, not a static UI or prototype. All major screens must be connected to a real backend API and database, with authentication, authorization, validation, business rules, error handling, responsive UI, deployment configuration, documentation, and testable flows.

The application should support internal employees such as Admin, Sales, Warehouse, and Accounts.

---

## 1. Required Technology Stack

### Backend
- Node.js
- TypeScript
- Express.js or NestJS
- PostgreSQL or MySQL
- REST APIs
- Proper request validation
- Proper HTTP status codes
- Consistent API error handling

### Frontend
- React
- TypeScript or JavaScript
- HTML/CSS
- Responsive admin-style UI

### Deployment
Use a free hosting platform where possible.

Acceptable examples from the assignment:
- Frontend: Vercel, Netlify, Render Static Site, or similar
- Backend: Render, Railway, Fly.io, or similar
- Database: Supabase, Neon, Render Postgres, or similar

AWS deployment is optional and is a bonus.

---

# 2. Core Product Requirements

## 2.1 Authentication and Role-Based Access

Implement secure login functionality.

### Required roles
- Admin
- Sales
- Warehouse
- Accounts

JWT-based authentication is acceptable.

### Requirements
- Login page
- JWT/session handling
- Protected API routes
- Protected frontend routes
- Role-based permissions
- Logout
- Current-user endpoint
- Unauthorized and forbidden handling
- Passwords must never be stored as plain text
- Authentication errors must not expose sensitive information

### Suggested access model

Admin:
- Full access

Sales:
- Customers/CRM
- Sales challans
- Relevant product/stock viewing

Warehouse:
- Products
- Inventory
- Stock movement

Accounts:
- Relevant customer/challan/accounting views

Do not rely only on hiding frontend buttons. Authorization must also be enforced by the backend.

---

# 3. Customer CRM Module

Create a customer management section.

## Customer fields

- Customer name
- Mobile number
- Email
- Business name
- GST number — optional
- Customer type:
  - Retail
  - Wholesale
  - Distributor
- Address
- Status:
  - Lead
  - Active
  - Inactive
- Follow-up date
- Notes

## Required features

- Add customer
- Edit customer
- Search customer
- View customer detail page
- Add follow-up notes

## UI requirements

Provide:
- Customer list/table
- Search
- Useful filters
- Pagination
- Add customer form
- Edit customer form
- Customer detail page
- Follow-up/history section
- Loading state
- Empty state
- Validation errors
- API error state
- Success feedback

Forms must validate input on the frontend and the backend.

---

# 4. Product and Inventory Module

Create product and stock management.

## Product fields

- Product name
- SKU/code
- Category
- Unit price
- Current stock
- Minimum stock alert quantity
- Location/warehouse

## Required features

- Add product
- Edit product
- Product list
- Product search/filter
- Stock visibility
- Low-stock indication
- Product detail where useful

## Stock Movement Log

Track every stock movement.

Each movement must contain:

- Product
- Quantity changed
- Movement type:
  - IN
  - OUT
- Reason
- Created by
- Timestamp

Stock changes must be auditable.

Do not silently modify stock without recording the corresponding stock movement.

---

# 5. Sales Challan Module

Create a complete sales challan workflow.

A Sales user must be able to:

1. Select a customer
2. Add multiple products
3. Enter quantity for each product
4. Generate a challan number automatically
5. Save the challan as Draft
6. Confirm the challan
7. View challan details
8. Cancel a challan where allowed

## Challan fields

- Challan number
- Customer
- Products
- Total quantity
- Status:
  - Draft
  - Confirmed
  - Cancelled
- Created by
- Created date

---

# 6. Critical Business Logic

These rules are mandatory.

## Confirming a challan

When a challan changes from Draft to Confirmed:

- Reduce stock for every product
- Create OUT stock movement records
- Do not allow stock to become negative
- Validate all requested quantities before modifying any stock
- If any item has insufficient stock, reject the confirmation
- Return a proper API error
- Do not partially update stock
- Preserve the challan's product snapshot data

## Product snapshot

A challan must store product snapshot information, not only the product ID.

For example, store enough information to preserve the product information used when the challan was created, such as:
- Product ID
- Product name
- SKU
- Unit price
- Quantity

This protects historical challan data if the product is later edited.

## Transaction safety

The stock update and stock movement creation must be handled atomically.

If one part fails:
- Roll back the transaction
- Do not leave partial stock changes
- Do not create an apparently successful challan confirmation

Prevent:
- Negative inventory
- Duplicate stock deductions
- Double confirmation
- Race-condition-related overselling where reasonably possible

---

# 7. REST API Requirements

Build clean REST APIs.

Example endpoints:

- POST `/auth/login`
- GET `/auth/me`
- GET `/customers`
- POST `/customers`
- GET `/customers/:id`
- PUT/PATCH `/customers/:id`
- POST `/customers/:id/follow-ups`
- GET `/products`
- POST `/products`
- GET `/products/:id`
- PUT/PATCH `/products/:id`
- GET `/stock-movements`
- GET `/challans`
- POST `/challans`
- GET `/challans/:id`
- PUT/PATCH `/challans/:id`
- POST `/challans/:id/confirm`
- POST `/challans/:id/cancel`

You may adjust endpoint naming if the architecture benefits from it, but maintain clear REST conventions.

## API requirements

Every relevant endpoint must support:

- Input validation
- Authentication where required
- Role authorization
- Proper HTTP status codes
- Consistent JSON response structure
- Useful error messages
- Pagination where needed
- Search/filter where needed
- Server-side validation
- Database error handling
- Not-found handling

Do not expose stack traces, SQL errors, passwords, secrets, JWT secrets, or other sensitive internals to clients.

---

# 8. Standard API Error Format

Use one predictable format throughout the backend.

Example:

```json
{
  "success": false,
  "message": "Insufficient stock",
  "code": "INSUFFICIENT_STOCK",
  "errors": [
    {
      "field": "quantity",
      "message": "Requested quantity exceeds available stock"
    }
  ]
}
```

Successful responses should also follow a consistent structure.

The exact structure may be improved if needed, but consistency is mandatory.

---

# 9. Error Handling

Implement comprehensive error handling.

Handle at minimum:

### Frontend
- Network failure
- API unavailable
- 400 validation errors
- 401 unauthenticated
- 403 unauthorized
- 404 not found
- 409 business conflict
- 422 validation errors if used
- 500 server errors
- Expired authentication
- Empty API responses
- Loading states
- Form submission failures

### Backend
- Invalid request body
- Invalid IDs
- Missing required fields
- Invalid enum values
- Duplicate SKU
- Duplicate/conflicting data
- Customer not found
- Product not found
- Challan not found
- Insufficient stock
- Invalid challan state transition
- Database constraint errors
- Unexpected server errors

Create centralized error handling middleware rather than repeating error logic throughout controllers.

---

# 10. Database Design

Use PostgreSQL or MySQL.

Design a normalized relational schema.

Suggested entities:

- users
- customers
- customer_follow_ups
- products
- stock_movements
- challans
- challan_items

You may add supporting tables where required.

## Database requirements

- Primary keys
- Foreign keys
- Appropriate indexes
- Unique constraints where needed
- NOT NULL constraints where appropriate
- Timestamps
- Appropriate numeric/data types
- Referential integrity

Do not store relational data as one giant JSON object when a proper relational structure is more appropriate.

---

# 11. Seed Data

Provide database seed data for development/testing.

Include at least one user for each role:

- Admin
- Sales
- Warehouse
- Accounts

Also seed:
- Several customers
- Several products
- Different stock quantities
- Useful stock movement examples
- Example challan data where appropriate

Document the test credentials in the README.

Never use real passwords or production secrets.

---

# 12. Frontend Application

Create a clean professional admin-style interface.

## Suggested layout

- Login
- Sidebar navigation
- Header/top bar
- Main content area
- Responsive mobile navigation

## Suggested dashboard

Show useful operational information such as:

- Total customers
- Active leads/customers
- Total products
- Low-stock products
- Recent stock movements
- Recent challans

Only display metrics that can be backed by real API/database data.

Do not create fake dashboard numbers in the production implementation.

---

# 13. Responsive Design

The application must work on:

- Desktop
- Laptop
- Tablet
- Mobile

Tables should remain usable on smaller screens.

Forms should adapt to mobile layouts.

Avoid:
- Horizontal overflow
- Broken navigation
- Unusable buttons
- Text clipping
- Fixed-width layouts that break on mobile

---

# 14. UX Requirements

Every major asynchronous operation should have:

- Loading state
- Success feedback
- Error feedback

Every list should have:

- Loading state
- Empty state
- Error state

Every destructive or irreversible action should have confirmation where appropriate.

Examples:
- Confirm challan
- Cancel challan
- Important stock actions

Use clear status badges for:
- Lead
- Active
- Inactive
- Draft
- Confirmed
- Cancelled
- Low stock

---

# 15. Validation

Implement validation at both levels.

## Frontend validation

Validate:
- Required fields
- Email format
- Mobile format
- Numeric quantities
- Positive quantities
- Valid dates
- Valid enum values

## Backend validation

Never trust frontend validation.

Repeat validation on the API.

The backend is the final authority.

---

# 16. Security Requirements

Implement sensible application security.

At minimum:

- Password hashing
- JWT authentication
- Authorization middleware
- Environment variables for secrets
- CORS configuration
- Secure HTTP headers where appropriate
- Input validation
- Parameterized ORM/database queries
- No secret values committed to Git
- `.env` excluded from Git
- Safe error responses

Do not hardcode:
- JWT secrets
- Database passwords
- API keys
- Production credentials

---

# 17. Project Structure

Use a maintainable structure.

Suggested:

```text
project/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   └── ...
│
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   ├── middleware/
│   │   ├── database/
│   │   ├── utils/
│   │   ├── config/
│   │   └── app.ts
│   └── ...
│
├── README.md
├── .gitignore
└── ...
```

Adapt the structure to the selected framework if necessary.

---

# 18. Environment Variables

Create example environment files.

For example:

```text
DATABASE_URL=
JWT_SECRET=
PORT=
FRONTEND_URL=
NODE_ENV=
```

Do not commit real secret values.

Provide `.env.example`.

Document every required environment variable.

---

# 19. API Documentation

Provide either:

- Postman collection
- Swagger/OpenAPI documentation
- Or both

The API documentation must explain:

- Authentication
- Required headers
- Request bodies
- Response formats
- Error responses
- Role requirements
- Important business rules

Include examples for the main endpoints.

---

# 20. Testing

Create meaningful automated tests for critical backend behavior.

At minimum test:

### Authentication
- Successful login
- Invalid login
- Protected route without authentication
- Forbidden role access

### Customers
- Create customer
- Validation failure
- Fetch customer
- Update customer

### Products
- Create product
- Update product
- Duplicate SKU handling

### Challans
- Create draft challan
- Confirm challan successfully
- Stock decreases after confirmation
- Stock movement is created
- Insufficient stock is rejected
- Stock does not become negative
- Failed confirmation does not partially modify inventory
- Already confirmed challan cannot be confirmed twice
- Product snapshot is preserved

Tests should verify actual business behavior rather than only checking that endpoints return 200.

---

# 21. Deployment

Deploy the application using free hosting where possible.

Preferred options from the assignment include:

### Frontend
- Vercel
- Netlify
- Render Static Site
- Similar platform

### Backend
- Render
- Railway
- Fly.io
- Similar platform

### Database
- Supabase
- Neon
- Render Postgres
- Similar platform

AWS is optional and should be treated as a bonus.

## Deployment requirements

The deployed application must:

- Load successfully
- Connect to the production database
- Authenticate users
- Load real data
- Perform CRUD operations
- Confirm challans
- Correctly update stock
- Handle API errors
- Work from the deployed frontend to the deployed backend

Do not consider deployment complete until the complete primary workflow has been tested end-to-end.

---

# 22. README

Create a professional README containing:

1. Project overview
2. Features
3. Architecture
4. Technology stack
5. Folder structure
6. Prerequisites
7. Environment variables
8. Database setup
9. Migration instructions
10. Seed instructions
11. Local development setup
12. Frontend setup
13. Backend setup
14. Test commands
15. API documentation
16. Deployment instructions
17. Test credentials
18. Architecture explanation
19. Assumptions
20. Known limitations
21. Live frontend URL
22. Live backend API URL

The assignment specifically requires documentation for server setup, environment variables, local execution, deployment, and assumptions.

---

# 23. Git Requirements

Use Git with meaningful commits.

Examples:

```text
feat: initialize full stack project
feat: add database schema and migrations
feat: implement authentication and roles
feat: implement customer CRM
feat: implement product inventory
feat: implement stock movements
feat: implement sales challans
feat: add frontend dashboard
feat: add validation and error handling
test: add inventory business logic tests
docs: add setup and deployment documentation
fix: handle insufficient stock transaction safely
```

Do not make the entire project one giant commit if avoidable.

---

# 24. Bonus Features

Implement these only after all required functionality is complete.

Possible bonuses from the assignment:

- Docker setup
- GitHub Actions deployment
- Export invoice as PDF
- Upload product image to AWS S3

Do not sacrifice required functionality for bonus features.

---

# 25. Definition of Done

The task is NOT complete if only the frontend looks finished.

Consider the project complete only when:

- [ ] Frontend builds successfully
- [ ] Backend builds successfully
- [ ] Database can be created from a clean setup
- [ ] Migrations work
- [ ] Seed data works
- [ ] Admin login works
- [ ] Sales login works
- [ ] Warehouse login works
- [ ] Accounts login works
- [ ] Role-based authorization works
- [ ] Customer CRUD works
- [ ] Customer search works
- [ ] Customer detail works
- [ ] Follow-up notes work
- [ ] Product CRUD works
- [ ] Product search/filter works
- [ ] Stock movement logging works
- [ ] Low-stock status works
- [ ] Draft challan creation works
- [ ] Multiple products can be added to a challan
- [ ] Challan number is generated automatically
- [ ] Challan confirmation works
- [ ] Confirmation decreases stock
- [ ] Stock movement is recorded
- [ ] Negative stock is impossible
- [ ] Insufficient stock returns a proper error
- [ ] Failed stock confirmation rolls back safely
- [ ] Product snapshot data is preserved
- [ ] Invalid challan transitions are rejected
- [ ] API validation works
- [ ] API errors are consistent
- [ ] Frontend loading states work
- [ ] Frontend empty states work
- [ ] Frontend error states work
- [ ] Responsive design works
- [ ] Automated tests pass
- [ ] Production build works
- [ ] Deployment works
- [ ] README is complete
- [ ] API documentation/Postman collection exists
- [ ] `.env.example` exists
- [ ] No secrets are committed
- [ ] Final end-to-end flow has been manually verified

---

# 26. Required End-to-End Verification

Before declaring success, test this exact workflow:

1. Login as Sales.
2. Open Customers.
3. Create a customer.
4. Open Products.
5. Select a product with sufficient stock.
6. Create a new challan.
7. Select the customer.
8. Add one or more products.
9. Enter quantities.
10. Save the challan as Draft.
11. Verify the draft appears in the challan list.
12. Open the challan.
13. Confirm the challan.
14. Verify stock decreased correctly.
15. Verify OUT stock movements were created.
16. Verify the challan status changed to Confirmed.
17. Attempt to confirm it again and verify the API rejects it safely.
18. Create another challan requesting more stock than available.
19. Confirm it.
20. Verify the API returns an insufficient-stock error.
21. Verify stock was not partially changed.
22. Verify no incorrect stock movement was created.
23. Verify the UI displays the error clearly.

This workflow must work against the real database.

---

# 27. AI Coding Agent Instructions

You are responsible for implementing the complete application.

Do not stop after generating a plan.

Do not generate only UI mockups.

Do not leave major functionality as TODOs.

Do not use fake API responses for functionality that is required to be real.

Do not declare a feature complete until:
1. The code is implemented.
2. The frontend connects to the real backend.
3. The backend connects to the real database.
4. Validation is implemented.
5. Error handling is implemented.
6. The feature has been tested.

When a requirement is ambiguous, choose the simplest production-appropriate implementation that remains consistent with the case study.

Prefer maintainable, readable code over unnecessary complexity.

---

# 28. Error-Handling-First Requirement

For every API operation, explicitly consider:

```text
What happens if:
- Authentication is missing?
- User lacks permission?
- Request body is invalid?
- Record does not exist?
- Record already exists?
- Database operation fails?
- Business rule is violated?
- Network request fails?
- User submits twice?
```

Implement the appropriate response and UI behavior.

Do not allow unhandled exceptions to crash the API process.

---

# 29. Final Deliverables

The final project must provide:

- GitHub repository
- Working frontend
- Working backend API
- Working database
- Live frontend URL
- Live backend API URL
- Test credentials for all roles
- Postman collection or API documentation
- README
- Architecture explanation
- Known limitations
- Setup instructions
- Deployment instructions

The original assignment requires these submission artifacts. 

---

# Final Instruction

Build the application end-to-end as a production-quality case-study submission.

Prioritize:

1. Correct business logic
2. Working backend APIs
3. Database integrity
4. Authentication and authorization
5. Inventory transaction safety
6. Validation and error handling
7. Functional frontend
8. Responsive UX
9. Testing
10. Deployment
11. Documentation

The final result should be a genuinely usable Mini ERP + CRM Operations Portal rather than a visual demonstration.
