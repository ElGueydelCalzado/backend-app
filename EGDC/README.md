# 🏪 EGDC Inventory Management System

**Professional-grade inventory management solution for footwear products**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.3.4-black)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Latest-green)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.0-38B2AC)](https://tailwindcss.com/)

## 🚀 Overview

EGDC is a comprehensive inventory management system designed specifically for footwear retailers. It provides real-time inventory tracking, automated pricing calculations, multi-platform synchronization, and advanced analytics - all in a modern, responsive web interface.

### ✨ Key Features

- **📊 Real-time Dashboard** - Live inventory statistics and analytics
- **📝 Advanced Table Editing** - Direct cell editing with immediate feedback
- **🔄 Multi-platform Pricing** - Automated calculations for SHEIN, Shopify, MercadoLibre
- **🏢 Multi-location Tracking** - Inventory across 7 different locations
- **📈 Comprehensive Analytics** - Business insights and performance metrics
- **🔍 Advanced Search & Filtering** - Powerful data discovery tools
- **📤 Bulk Operations** - Import/export, mass updates, batch processing
- **🔐 Professional Security** - Enterprise-grade data protection
- **📱 Responsive Design** - Optimized for desktop, tablet, and mobile

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (RESTful)
- **Database**: Supabase (PostgreSQL) with real-time capabilities
- **State Management**: React Hooks + Custom hooks pattern
- **Performance**: Memoization, lazy loading, optimistic updates

### Project Structure
```
EGDC/
├── app/                 # Next.js pages and API routes
├── components/          # Reusable React components  
├── lib/                 # Utilities, types, and configurations
│   ├── hooks/           # Custom React hooks
│   └── types.ts         # Shared TypeScript definitions
├── scripts/             # Database and utility scripts
├── sql/                 # Database schema and migrations
└── docs/                # Comprehensive documentation
```

## 🚦 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/egdc-inventory.git
   cd egdc-inventory
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

4. **Database setup**
   ```bash
   # Run the setup script in Supabase SQL Editor
   npx tsx scripts/setup-db.ts
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm run start        # Start production server
npm run type-check   # TypeScript validation
npm run lint         # Code quality checks
```

### Database Management

```bash
npx tsx scripts/test-connection.ts    # Test database connection
npx tsx scripts/check-schema.ts       # Verify schema integrity
npx tsx scripts/setup-db.ts           # Complete database setup
```

## 🎯 Core Features

### Dashboard
- **Real-time Statistics**: Product counts, inventory totals, value metrics
- **Quick Actions**: Navigate to key functions
- **Performance Monitoring**: System health indicators

### Inventory Management
- **Live Editing**: Click-to-edit table cells with validation
- **Smart Filtering**: Category → Brand → Model cascade filtering  
- **Bulk Operations**: Import CSV, mass updates, export capabilities
- **Audit Trail**: Complete change history tracking

### Automated Pricing
- **SHEIN**: `CEILING((cost × modifier × 1.2) / 5) × 5`
- **Shopify/EGDC**: `CEILING(((cost × modifier + $100) × 1.25) / 5) × 5`
- **MercadoLibre**: `CEILING(((cost × modifier + $100) × 1.395) / 5) × 5`

### Multi-location Inventory
Track stock across 7 locations with automatic totaling:
- Main EGDC warehouse
- FAMI location  
- Principal warehouse
- Centro, Norte, Sur stores
- Online inventory

## 🔐 Security Features

- **Data Encryption**: At rest and in transit
- **Access Control**: Row Level Security (RLS)
- **Input Validation**: Comprehensive server-side validation
- **Audit Logging**: Complete change tracking
- **Error Handling**: Professional error management system

## 📈 Performance Optimizations

- **Memoization**: React.memo, useMemo for expensive calculations
- **Database Optimization**: Indexes, generated columns, triggers
- **Caching Strategy**: API response caching, optimistic updates
- **Bundle Optimization**: Code splitting, lazy loading

## 🚀 Deployment

### Production Build
```bash
npm run build
npm run start
```

### Environment Variables
Required for production:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_public_key  
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### Recommended Platforms
- **Vercel** (recommended for Next.js)
- **Netlify**
- **Railway**
- **Any Node.js hosting provider**

## 📚 Documentation

- [Architecture Guide](./docs/ARCHITECTURE.md) - Technical architecture overview
- [CLAUDE.md](./CLAUDE.md) - Claude Code integration guide

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Standards
- **TypeScript**: Strict type checking required
- **ESLint**: Code must pass linting
- **Testing**: Add tests for new features
- **Documentation**: Update docs for significant changes

## 📋 Roadmap

### Phase 1: Core Stability ✅
- [x] Complete CRUD operations
- [x] Real-time dashboard
- [x] Automated pricing
- [x] Multi-location tracking

### Phase 2: Advanced Features 🚧
- [ ] Real-time notifications
- [ ] Advanced analytics dashboard
- [ ] Mobile companion app
- [ ] API integrations

### Phase 3: Enterprise Features 📋
- [ ] User management & roles
- [ ] Advanced reporting
- [ ] Automated workflows
- [ ] Third-party integrations

## 🐛 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Verify environment variables
npx tsx scripts/test-connection.ts

# Check Supabase project status
# Ensure RLS policies are configured
```

**TypeScript Errors**
```bash
# Run type checking
npm run type-check

# Clear build cache
rm -rf .next
npm run build
```

**Performance Issues**
```bash
# Check bundle size
npm run build

# Monitor database queries
# Review component re-renders
```

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/) and [Supabase](https://supabase.com/)
- UI components inspired by [Tailwind UI](https://tailwindui.com/)
- Icons by [Lucide](https://lucide.dev/)

---

**Made with ❤️ by the EGDC Team**