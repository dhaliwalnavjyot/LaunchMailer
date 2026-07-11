# 🚀 LaunchMailer

**LaunchMailer** is a full-stack marketing campaign platform that enables businesses to manage customers and send personalized **Email** and **WhatsApp** campaigns from a single dashboard.

Originally developed for **Hamper Queens**, LaunchMailer provides an intuitive admin interface for customer management, campaign creation, AI-assisted content generation, and delivery tracking.

---

## ✨ Features

### 📊 Dashboard
- Real-time campaign statistics
- Customer growth metrics
- Email & WhatsApp coverage
- Recent campaign activity

### 👥 Customer Management
- Import customers via **CSV** or **Excel**
- Search and filter customer records
- Export customer data
- Unsubscribe management
- Bulk customer handling

### 📢 Campaign Builder
- Create **Email**, **WhatsApp**, or **Combined** campaigns
- Personalized messages using customer variables
- Upload and attach images
- Preview campaigns before sending

### 📈 Campaign Tracking
- Live delivery status
- Success & failure reporting
- Individual recipient logs
- Campaign history

### 🤖 AI Content Generation
Generate professional marketing content using **Anthropic Claude**.

- Email subject generation
- Email body generation
- WhatsApp message drafting
- Marketing copy suggestions

### ⚙️ Settings Management
Configure integrations directly from the dashboard:

- Resend Email
- Twilio WhatsApp
- Anthropic Claude
- Sender information
- API credentials

### 🔐 Authentication
- JWT-based authentication
- Secure admin login
- First-time setup wizard
- Protected API routes

---

# 🛠️ Tech Stack

| Layer | Technology |
|--------|------------|
| **Frontend** | React 19, Vite, Tailwind CSS, shadcn/ui, TanStack Query, Wouter |
| **Backend** | Node.js, Express 5, TypeScript |
| **Database** | PostgreSQL + Drizzle ORM |
| **API** | OpenAPI 3.1 + Orval |
| **Validation** | Zod |
| **Email Service** | Resend |
| **WhatsApp Service** | Twilio |
| **AI** | Anthropic Claude |
| **Package Manager** | pnpm Workspaces |

---

# 📁 Project Structure

```text
LaunchMailer/
│
├── artifacts/
│   ├── launchmailer/        # React Admin Dashboard
│   ├── api-server/          # Express Backend
│   └── mockup-sandbox/      # UI Component Sandbox
│
├── lib/
│   ├── db/                  # Drizzle ORM & Database
│   ├── api-spec/            # OpenAPI Specification
│   ├── api-zod/             # Generated Zod Schemas
│   └── api-client-react/    # React Query API Client
│
├── scripts/
│
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

# ⚡ Prerequisites

Before running the project, make sure you have:

- Node.js **20+** (24 recommended)
- pnpm **9+**
- PostgreSQL Database

---

# 🚀 Getting Started

## 1. Clone the Repository

```bash
git clone https://github.com/dhaliwalnavjyot/LaunchMailer.git

cd LaunchMailer
```

---

## 2. Install Dependencies

```bash
pnpm install
```

> **Important**
>
> This project uses **pnpm workspaces**.
>
> **Do not use**
>
> ```bash
> npm install
> ```

---

## 3. Configure Environment Variables

Create a `.env` file in the project root.

```env
# -------------------------------------------------
# Required
# -------------------------------------------------

DATABASE_URL=postgresql://user:password@localhost:5432/launchmailer

JWT_SECRET=your-secret-at-least-32-characters-long

# -------------------------------------------------
# API Server
# -------------------------------------------------

PORT=8080
NODE_ENV=development

# -------------------------------------------------
# Frontend
# -------------------------------------------------

# (Set these when running the frontend)

PORT=5173
BASE_PATH=/

# -------------------------------------------------
# Email (Optional)
# -------------------------------------------------

RESEND_API_KEY=
SENDER_EMAIL=
SENDER_NAME=LaunchMailer

# -------------------------------------------------
# WhatsApp (Optional)
# -------------------------------------------------

TWILIO_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=

# -------------------------------------------------
# AI (Optional)
# -------------------------------------------------

CLAUDE_API_KEY=

# -------------------------------------------------
# File Uploads (Optional)
# -------------------------------------------------

DEFAULT_OBJECT_STORAGE_BUCKET_ID=
PRIVATE_OBJECT_DIR=uploads
```

---

## 4. Push Database Schema

```bash
pnpm --filter @workspace/db run push
```

---

## 5. Start the API Server

```bash
export PORT=8080

export DATABASE_URL=postgresql://user:password@localhost:5432/launchmailer

export JWT_SECRET=your-secret-at-least-32-characters-long

pnpm --filter @workspace/api-server run dev
```

API will be available at:

```
http://localhost:8080
```

---

## 6. Start the Frontend

Open another terminal.

```bash
export PORT=5173

export BASE_PATH=/

pnpm --filter @workspace/launchmailer run dev
```

Frontend:

```
http://localhost:5173
```

---

## 7. Create the First Admin Account

After starting the application for the first time, create the administrator account.

Using the browser:

- Open the Login page
- Complete the setup wizard

Or using cURL:

```bash
curl -X POST http://localhost:8080/api/auth/setup \
-H "Content-Type: application/json" \
-d '{
  "email":"admin@example.com",
  "password":"yourpassword"
}'
```

> **Note**
>
> The setup endpoint is available **only when no administrator account exists.**

---

# 📜 Available Scripts

| Command | Description |
|----------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm run build` | Build entire project |
| `pnpm run typecheck` | Type-check all packages |
| `pnpm --filter @workspace/api-server run dev` | Start backend |
| `pnpm --filter @workspace/launchmailer run dev` | Start frontend |
| `pnpm --filter @workspace/db run push` | Push database schema |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate API client |

---

# 🌐 API Endpoints

## Authentication

| Method | Endpoint |
|---------|----------|
| POST | `/api/auth/setup` |
| POST | `/api/auth/login` |
| GET | `/api/auth/me` |

---

## Dashboard

| Method | Endpoint |
|---------|----------|
| GET | `/api/dashboard` |

---

## Customers

| Method | Endpoint |
|---------|----------|
| GET | `/api/customers` |
| POST | `/api/customers/import` |
| GET | `/api/customers/export` |

---

## Campaigns

| Method | Endpoint |
|---------|----------|
| GET | `/api/campaigns` |
| POST | `/api/campaigns` |
| GET | `/api/campaigns/:id` |

---

## Messaging

| Method | Endpoint |
|---------|----------|
| POST | `/api/send/email` |
| POST | `/api/send/whatsapp` |

---

## AI

| Method | Endpoint |
|---------|----------|
| POST | `/api/generate` |

---

## Settings

| Method | Endpoint |
|---------|----------|
| GET | `/api/settings` |
| PUT | `/api/settings` |

---

## Miscellaneous

| Method | Endpoint |
|---------|----------|
| GET | `/api/health` |
| GET | `/api/unsubscribe` |

---

# 🗄️ Database Schema

| Table | Description |
|--------|-------------|
| **admins** | Administrator accounts |
| **customers** | Customer records |
| **campaigns** | Campaign definitions |
| **campaign_logs** | Per-recipient delivery logs |
| **settings** | Application configuration |
| **uploads** | Uploaded media |

---

# 💻 Local Development Notes

The frontend expects API requests on the same origin.

If running frontend and backend separately, configure the Vite proxy:

```ts
server: {
  proxy: {
    "/api": {
      target: "http://localhost:8080",
      changeOrigin: true,
    },
  },
}
```

### Additional Notes

- JWT secrets should be **at least 32 characters** in production.
- Email, WhatsApp, and AI integrations require their respective API credentials.
- Credentials can be configured either through **environment variables** or via the **Settings** page.

---

# 📄 License

This project is licensed under the **MIT License**.

---

# 👨‍💻 Author

**Navjyot Dhaliwal**

If you found this project useful, consider giving it a ⭐ on GitHub!
