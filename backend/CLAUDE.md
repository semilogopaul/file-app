# File App — Backend

> NestJS backend service. TypeScript / NestJS / class-validator / class-transformer.

## Quick Reference

### Commands

```bash
# Setup
npm install                    # Install dependencies

# Development
npm run start:dev              # Start with watch mode
npm run start:debug            # Start with debug + watch mode
npm run build                  # Build for production
npm run start:prod             # Run compiled production build

# Testing
npm run test                   # Unit tests
npm run test:watch             # Unit tests, watch mode
npm run test:cov               # Test coverage
npm run test:e2e               # End-to-end tests

# Code Quality
npm run lint                   # ESLint
npm run format                 # Prettier
```

### Project Structure

```
src/
├── app.module.ts
├── main.ts
├── config/
│   ├── configuration.ts
│   └── validation.schema.ts
├── modules/
│   └── <feature>/
│       ├── <feature>.module.ts
│       ├── <feature>.controller.ts
│       ├── <feature>.service.ts
│       ├── dto/
│       ├── entities/
│       └── interfaces/
├── common/
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   └── utils/
└── health/
    └── health.controller.ts
```

Every feature lives under `modules/<feature>/` as a self-contained NestJS module. Nothing outside `common/` should be imported across modules directly — go through the module's exported providers.

## 1. Structural Rules

- Controllers must not contain business logic
- Business logic must reside in services
- Shared logic must be placed under `common/`
- Cross-module access must occur only via exported providers

## 2. Coding Standards

### 2.1 TypeScript Standards

- `strict: true` must be enabled in `tsconfig.json`
- Use of `any` is prohibited unless explicitly justified (with an inline comment explaining why)
- Prefer immutability (`readonly`)
- `interface` defines contracts; `type` defines unions

### 2.2 NestJS Best Practices

- Dependency injection via constructors only
- Providers must have a single responsibility
- Avoid circular dependencies

## 3. API Development Standards

### 3.1 REST API Conventions

- Use plural resource naming
- Follow RESTful HTTP verb semantics
- APIs must be versioned

```
GET    /v1/transactions
POST   /v1/transactions
GET    /v1/transactions/{id}
```

### 3.2 DTO Enforcement

- All inbound and outbound payloads must use DTOs
- Validation via `class-validator`
- Transformation via `class-transformer`

## 4. Error Handling Standards

### 4.1 Global Error Handling

- A global exception filter is mandatory
- Internal error details must not be exposed to clients

Standard error response format:

```json
{
  "errorCode": "RESOURCE_NOT_FOUND",
  "message": "Resource not found",
  "timestamp": "ISO-8601",
  "traceId": "uuid"
}
```

### 4.2 Custom Exceptions

- Domain-specific exceptions must be defined
- Generic `Error` usage is prohibited

## 5. Logging & Observability

### 5.1 Logging

- Use an approved structured logger (e.g., Winston, Pino)
- Required log levels: `error`, `warn`, `info`, `debug` (non-production only)

### 5.2 Monitoring

- Include `traceId` in all log lines
- Expose `/health` endpoint
- Expose `/metrics` endpoint (if applicable)

## 6. Configuration Management

- Use `@nestjs/config`
- Configuration must be environment-based
- Environment variables must:
  - Be validated at startup (`config/validation.schema.ts`)
  - Be documented in the service README

## 7. Security Requirements

- Enable security middleware (e.g., Helmet for HTTP services)
- Configure CORS with explicit origins (no wildcards in production)
- Authentication mechanisms must follow approved standards
- Sensitive data must never be logged
