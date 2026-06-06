# VendorBridge API Architecture

Backend requests follow this flow:

Route -> Controller -> Service -> Repository -> PostgreSQL

- Routes define URL paths and attach authentication/role middleware.
- Controllers translate HTTP requests and responses only.
- Services contain validation, calculations, transactions, and cross-module orchestration.
- Repositories contain SQL queries and database access.

Authentication remains cookie/JWT based and uses the existing `/api/auth/*` endpoints.
