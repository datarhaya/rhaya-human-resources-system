# HR Management System

Modern HR system built with React + Express + PostgreSQL

## Features
- ✅ Leave management (7 types)
- ✅ Overtime tracking
- ✅ Payslip management
- ✅ Multi-level approval workflow
- ✅ Role-based access control

## Tech Stack
**Frontend:** React 18, TanStack Query, Tailwind CSS, Vite
**Backend:** Express.js, Prisma ORM, PostgreSQL
**Storage:** Cloudflare R2
**Deployment:** Cloudflare Pages + Railway

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ ([download](https://nodejs.org/))
- PostgreSQL database ([Neon.tech free tier](https://neon.tech))
- Cloudflare account (for R2 storage)

### 1. Clone & Install

```bash
# Clone repository
git clone <your-repo-url>
cd hr-system

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Setup Database

```bash
cd backend

# Copy environment variables
cp .env.example .env

# Edit .env and add your database URL from Neon.tech
# DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# Generate Prisma client
npm run db:generate

# Push schema to database (creates tables)
npm run db:push
```

### 3. Setup Environment Variables

Edit `backend/.env`:
```env
DATABASE_URL="your-neon-database-url"
JWT_SECRET="generate-with-command-below"
# ... (see .env.example for all options)
```

Generate JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Run Development Servers

```bash
# Terminal 1 - Backend (port 3000)
cd backend
npm run dev

# Terminal 2 - Frontend (port 5173)
cd frontend
npm run dev
```

Visit: http://localhost:5173

---

## 📁 Project Structure

```
hr-system/
├── backend/
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── controllers/   # Business logic
│   │   ├── middleware/    # Auth, validation
│   │   └── index.js       # Server entry
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable UI
│   │   ├── api/           # API calls
│   │   └── App.jsx        # Main app
│   └── package.json
│
└── README.md
```

---

## 🔐 Default Admin Account

**IMPORTANT:** Create admin user via Prisma Studio:

```bash
cd backend
npm run db:studio
```

1. Open http://localhost:5555
2. Go to "User" table → "Add record"
3. Fill in:
   - username: `admin`
   - email: `admin@company.com`
   - password: (generate hash below)
   - accessLevel: `1`
   - Create Role and Division first, then link IDs

Generate password hash:
```bash
node -e "console.log(require('bcryptjs').hashSync('YourPassword123', 10))"
```

---

## 🌐 Deployment

### Backend (Railway.app)
1. Create account on Railway.app
2. New Project → Deploy from GitHub
3. Add environment variables from `.env`
4. Deploy

### Frontend (Cloudflare Pages)
1. Create account on Cloudflare
2. Pages → Create project → Connect GitHub
3. Build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add environment variable:
   - `VITE_API_URL`: Your Railway backend URL
5. Deploy

---

## 📊 Database Schema Overview

### Core Tables
- **User** - Employee profiles, access levels, hierarchy
- **Role** - Job roles (Engineer, HR Manager, etc.)
- **Division** - Departments (Engineering, HR, Finance)
- **LeaveRequest** - Leave applications with approval status
- **LeaveQuota** - Annual leave balance tracking
- **OvertimeRequest** - Overtime submissions
- **OvertimeBalance** - Monthly overtime hours
- **Payslip** - Salary information with PDF storage

### Access Levels
1. **Admin** (1) - Full system access, parent company
2. **Subsidiary** (2) - Subsidiary management
3. **Manager** (3) - Department heads
4. **Staff** (4) - Regular employees

---

## 🛠️ Development

### Useful Commands

```bash
# Backend
npm run dev          # Start dev server with auto-reload
npm run db:studio    # Open Prisma Studio (database GUI)
npm run db:push      # Update database schema

# Frontend
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Adding a New Feature

1. **Database:** Update `prisma/schema.prisma`
2. **Backend:** Create route → controller → service
3. **Frontend:** Create page → API hook → components
4. **Test:** Manual testing in browser
5. **Deploy:** Push to GitHub (auto-deploys)

---

## 🐛 Troubleshooting

### Backend won't start
- Check `.env` file exists
- Verify DATABASE_URL is correct
- Run `npm run db:generate`

### Frontend can't connect to API
- Check backend is running on port 3000
- Verify CORS settings in `backend/src/index.js`
- Check proxy in `frontend/vite.config.js`

### Database errors
- Run `npm run db:push` to sync schema
- Check Neon.tech dashboard for connection issues
- Verify SSL mode in DATABASE_URL

---

## 📝 License

Internal company use only

## 👥 Support

Contact: your-email@company.com