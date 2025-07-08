# Contributing to EGDC

## Development Workflow

### Branch Strategy

We use a **Git Flow** approach with two main branches:

- **`main`**: Production-ready code. Protected branch.
- **`development`**: Integration branch for new features. All development happens here.

### Feature Development

1. **Create Feature Branch**
   ```bash
   git checkout development
   git pull origin development
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write code following the project conventions
   - Add tests for new functionality
   - Update documentation as needed

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description
   
   - Detailed description of changes
   - Why this change was made
   - Any breaking changes
   
   🤖 Generated with [Claude Code](https://claude.ai/code)
   
   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

4. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a Pull Request to `development` branch.

### Commit Message Convention

Use conventional commits format:

```
type(scope): short description

Detailed description of what was changed and why.

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

#### Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or fixing tests
- `chore`: Maintenance tasks

### Pre-commit Checklist

Before committing, ensure:

- [ ] Code follows TypeScript best practices
- [ ] All tests pass: `npm test`
- [ ] Type checking passes: `npm run type-check`
- [ ] Linting passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Documentation is updated
- [ ] No sensitive data in commit

### Testing

```bash
# Run all tests
npm test

# Run specific test
npm test -- --testNamePattern="your test name"

# Run tests in watch mode
npm run test:watch

# Run API endpoint tests
npx tsx scripts/test-api-endpoints.ts

# Test database connection
npx tsx scripts/test-connection.ts
```

### Code Quality

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Development Environment

### Setup

1. **Clone Repository**
   ```bash
   git clone https://github.com/Kadokk/snake-game-project.git
   cd snake-game-project/EGDC
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

### Database Development

```bash
# Test database connection
npx tsx scripts/test-connection.ts

# Check database schema
npx tsx scripts/check-schema.ts

# Run database migrations (if needed)
npx tsx scripts/setup-db.ts
```

### Docker Services

```bash
# Start n8n automation
./scripts/start-n8n.sh

# Start monitoring stack
./scripts/start-monitoring.sh
```

## Code Style Guidelines

### TypeScript

- Use strict TypeScript configuration
- Prefer `interface` over `type` for object shapes
- Use proper return types for functions
- Avoid `any` type - use proper typing

### React/Next.js

- Use functional components with hooks
- Prefer named exports over default exports
- Use proper TypeScript props interfaces
- Follow React best practices

### Database

- Use parameterized queries to prevent SQL injection
- Implement proper error handling
- Use connection pooling
- Log database operations appropriately

### Security

- Never commit sensitive data
- Use environment variables for configuration
- Implement proper input validation
- Add security headers to responses

## Project Structure

```
EGDC/
├── app/                     # Next.js app directory
│   ├── api/                 # API endpoints
│   └── ...                  # Pages and layouts
├── components/              # React components
├── lib/                     # Utility libraries
│   ├── postgres.ts          # Database connection
│   ├── security.ts          # Security utilities
│   └── ...
├── scripts/                 # Database and utility scripts
├── n8n/                     # Workflow automation
├── monitoring/              # Monitoring configuration
├── docs/                    # Documentation
└── ...
```

## API Development

### Creating New Endpoints

1. **Create Route File**
   ```typescript
   // app/api/your-endpoint/route.ts
   import { NextRequest, NextResponse } from 'next/server'
   import { secureEndpoint } from '@/lib/middleware'
   
   async function handler(request: NextRequest) {
     // Your endpoint logic
     return NextResponse.json({ success: true })
   }
   
   export const GET = secureEndpoint(handler)
   export const POST = secureEndpoint(handler, { 
     validationType: 'product' 
   })
   ```

2. **Add Tests**
   ```typescript
   // Add test to scripts/test-api-endpoints.ts
   ```

3. **Update Documentation**
   - Add endpoint to API documentation
   - Update CLAUDE.md if needed

### Database Operations

```typescript
// Use PostgresManager for database operations
import { PostgresManager } from '@/lib/postgres'

// Query data
const result = await PostgresManager.query(
  'SELECT * FROM products WHERE categoria = $1',
  [category]
)

// Use helper methods
const products = await PostgresManager.getProducts()
const product = await PostgresManager.getProductById(id)
```

## Deployment

### Development Deployment

1. **Build and Test**
   ```bash
   npm run build
   npm run type-check
   npm run lint
   ```

2. **Test Database Connection**
   ```bash
   npx tsx scripts/test-connection.ts
   ```

3. **Deploy to Development**
   ```bash
   # Deploy to your development environment
   ```

### Production Deployment

1. **Merge to Main**
   ```bash
   git checkout main
   git merge development
   git push origin main
   ```

2. **Tag Release**
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```

## Issue Reporting

When reporting issues:

1. **Use GitHub Issues**
2. **Provide Context**
   - Environment details
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages/logs

3. **Include Relevant Information**
   - Database connection status
   - API endpoint behavior
   - Browser/Node.js version
   - Any relevant screenshots

## Security

### Security Guidelines

- Never commit `.env` files
- Use environment variables for secrets
- Implement proper input validation
- Follow OWASP security guidelines
- Regular security updates

### Reporting Security Issues

For security issues, please:
1. **DO NOT** create public GitHub issues
2. Email security concerns privately
3. Provide detailed information
4. Allow time for fixes before disclosure

## Getting Help

- **Documentation**: Check project documentation first
- **GitHub Issues**: For bugs and feature requests
- **Code Review**: Request reviews on Pull Requests
- **Ask Questions**: Use GitHub Discussions for questions

## Release Process

1. **Feature Development** → `development` branch
2. **Testing** → Thorough testing on development
3. **Code Review** → PR review process
4. **Integration** → Merge to `development`
5. **Production** → Merge `development` to `main`
6. **Deployment** → Deploy from `main` branch
7. **Tagging** → Tag releases for tracking

This workflow ensures code quality and prevents breaking changes from reaching production.