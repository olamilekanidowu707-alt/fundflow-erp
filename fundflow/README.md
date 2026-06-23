# FundFlow ERP

Internal fund request and approval management system built with **Next.js 14**, **Supabase**, and **Tailwind CSS**.

## Features

- **Staff** — submit fund requests with purpose, amount, category, priority, attachments
- **Manager** — review and approve/reject requests with notes
- **Finance Director** — second-level approval, then mark as paid with payment reference
- **Admin** — manage staff, department budgets, view all requests
- **Email notifications** via Resend at every approval step
- **PDF export** — single request or full list report
- **Department budgets** — monthly limits with utilisation tracking
- **In-app notifications** — real-time notification bell with unread count
- **Audit trail** — full activity log per request

---

## Setup

### 1. Clone and install

```bash
git clone <your-repo>
cd fundflow
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Copy your **Project URL** and **Anon Key** from Settings → API
3. Copy your **Service Role Key** (keep this secret!)

### 3. Run the database migration

In Supabase → SQL Editor, paste and run the contents of:
```
supabase/migrations/001_schema.sql
```

### 4. Set up environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

RESEND_API_KEY=re_xxxx          # from resend.com
EMAIL_FROM=noreply@yourcompany.com

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Create your first admin user

In Supabase → Authentication → Users, create a user manually. Then in SQL Editor:

```sql
INSERT INTO public.profiles (id, full_name, email, role, department)
VALUES (
  '<paste-user-uuid-here>',
  'Your Name',
  'your@email.com',
  'admin',
  'Admin'
);
```

### 6. Set up email (optional but recommended)

1. Sign up at [resend.com](https://resend.com)
2. Add and verify your domain
3. Create an API key and add it to `.env.local`

### 7. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## User roles

| Role | Can do |
|------|--------|
| **Staff** | Submit fund requests, view own requests |
| **Manager** | Approve/reject pending requests, see all in progress |
| **Finance Director** | Second-level approval, mark requests as paid |
| **Admin** | Add/view users, set department budgets, export all requests |

## Approval workflow

```
Staff submits → Manager approves → Finance approves → Finance marks paid
                     ↓                    ↓
                  Rejected             Rejected
```

Email notifications are sent at each step to the relevant parties.

---

## Deployment (Vercel)

```bash
npm install -g vercel
vercel
```

Add all environment variables in the Vercel dashboard under Project → Settings → Environment Variables.

Update `NEXT_PUBLIC_APP_URL` to your production URL.

---

## Tech stack

- **Framework**: Next.js 14 (App Router)
- **Database + Auth**: Supabase (PostgreSQL + Row Level Security)
- **Styling**: Tailwind CSS
- **Email**: Resend
- **PDF**: jsPDF + jsPDF-AutoTable
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
