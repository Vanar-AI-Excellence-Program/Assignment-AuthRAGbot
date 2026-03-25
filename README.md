# Passly - Full-Stack Authentication System with RAG-Powered AI Chat

A modern, production-ready authentication application built with **SvelteKit 5**, **Tailwind CSS**, **Drizzle ORM**, and **PostgreSQL (pgvector)**. Features a polished blue & violet themed UI with dark mode, role-based access control, complete user management, and **Pascal** — an AI-powered chat assistant powered by **Google Gemini**, enhanced by **Retrieval-Augmented Generation (RAG)** for document-grounded answers.

---

## Features

### Authentication
- **Email & Password** sign-up/sign-in with bcrypt hashing (salt 12)
- **OAuth integration** with Google and GitHub via Auth.js
- **Database sessions** with 30-day lifetime and httpOnly cookies
- **Email verification** with 24-hour token expiry and resend capability
- **Password reset** via email with 1-hour secure tokens
- **Password validation** — minimum 8 characters, uppercase, lowercase, and number required

### User Profile
- Editable **first name**, **last name**, **phone number**, **location**, and **bio**
- Profile picture support via OAuth providers (Google/GitHub)
- Change password with current password verification
- OAuth users can set a password to enable dual login
- Account metadata display (User ID, join date, auth method)

### Admin Panel
- Role-based access — only admins can access `/admin`
- **User management** — view all users with search/filter
- **Role toggling** — promote users to admin or demote (admins cannot modify their own role)
- **Enable/Disable users** — toggle user active status from the admin panel
- **User deletion** with cascade (sessions removed)
- **Stats dashboard** — total users, active sessions, verified emails, admin count
- Progress bars showing proportional metrics
- **Secure admin registration** — public registration creates regular users only. Admins can only be created by existing admins.

### Pascal — AI Chat Assistant
- **Google Gemini 2.5 Flash** powered conversational AI
- Real-time **streaming responses** for instant feedback
- **Regenerate response** — re-generate any assistant message with one click; the existing DB record is updated in-place
- **Personalized welcome** — greets users by name with suggested prompts
- **Conversation persistence** — chats saved to database, accessible across sessions
- **Conversation sidebar** — search, browse, and delete past conversations; collapsed by default on mobile, open on desktop
- **Conversation branching** — edit and fork past messages without losing history, with left/right arrow navigation between branches
- **File attachment UX** — uploaded documents appear as a chip above the input area; the chip persists across messages until manually dismissed, and displays inline in each sent message that used it. Attachment metadata is saved to the database, so file indicators remain visible on messages after page reload
- **Copy, Edit & Regenerate** buttons on messages (always visible on mobile, hover-reveal on desktop)
- **Separated input controls** — send and attach buttons sit outside the input border for a cleaner look
- **Markdown rendering** — code blocks with syntax highlighting (highlight.js), tables, lists, and formatted text via `marked` and Tailwind Typography
- **Mobile-optimized rendering** — code blocks and tables scroll horizontally within their container on small screens instead of breaking the page layout; reduced font sizes and padding on mobile for better readability
- **Prompt engineering** — system prompt ensures properly formatted responses with fenced code blocks, markdown tables, and structured output
- **Reusable modules** — chat tree logic extracted to `src/lib/chat.ts`; `ChatMessage`, `ChatSidebar`, and `ChatInput` components encapsulate UI
- **Loading states** — animated typing indicator while AI is generating
- **Error handling** — user-friendly error messages with dismiss capability
- **Document management** — "My Documents" panel in the user menu lets users view and delete uploaded documents with double-click confirmation, giving users full control over their data
- **Protected route** — only authenticated users can access `/chat`
- **Responsive** — sidebar overlays the chat area instead of pushing content; collapses on mobile with backdrop dismiss

### RAG — Document-Grounded Answers
- **Knowledge Base** — upload `.pdf` and `.txt` documents via drag-and-drop or file picker
- **Smart chunking** — recursive text splitting (250 chars, 50-char overlap) preserving semantic boundaries (paragraphs, sentences, words)
- **Sentence embeddings** — 384-dimensional vectors via `all-MiniLM-L6-v2` model running in a dedicated Python microservice
- **Vector similarity search** — pgvector cosine distance (`<=>`) retrieves the top 5 most relevant chunks per query (threshold ≥ 0.3)
- **Context-aware retrieval** — uses the last 3 conversation exchanges (not just the last message) for embedding search, so follow-up questions about a document still retrieve relevant chunks
- **Smart citation display** — citations only appear when the LLM actually uses document content in its response; casual conversation remains citation-free
- **Per-user isolation** — each user's documents are scoped to their account
- **Status tracking** — documents show processing/ready/error status with chunk counts

### UI/UX
- **Blue & violet** color theme with orange accents and dark mode support
- Cream/warm white light mode, deep dark mode
- Glassmorphism card effects with backdrop blur
- Smooth animations — slide-up, fade-in, scale-in, float, shimmer
- Hover lift effects on stat cards with colored shadows
- **Responsive navbar** — hamburger menu on mobile with slide-down navigation and auth controls
- **Responsive admin table** — columns progressively hidden on smaller screens (Email, Verified, Status, Joined) to prevent layout distortion
- Responsive design for mobile, tablet, and desktop
- Toast notifications for sign-in/sign-out/registration events
- Loading spinners on all form submissions

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | SvelteKit 5 (Svelte 5 runes) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS 3.4 + Typography plugin |
| **Database** | PostgreSQL 16 with pgvector extension |
| **ORM** | Drizzle ORM |
| **Auth** | Auth.js (@auth/sveltekit) |
| **AI** | Google Gemini 2.5 Flash (streaming) |
| **Embeddings** | Python FastAPI microservice (sentence-transformers, all-MiniLM-L6-v2) |
| **Vector Search** | pgvector (cosine distance) |
| **PDF Parsing** | pdf-parse |
| **Email** | Nodemailer (SMTP / Ethereal for dev) |
| **Containerization** | Docker Compose (PostgreSQL + Embedding service) |
| **Bundler** | Vite 5 |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   SvelteKit App                      │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │   Auth   │  │   Chat   │  │   Document Mgmt   │  │
│  │  Routes  │  │  Routes  │  │      Routes       │  │
│  └────┬─────┘  └────┬─────┘  └────────┬──────────┘  │
│       │              │                 │              │
│  ┌────┴─────┐  ┌─────┴──────┐  ┌──────┴───────┐     │
│  │ Auth.js  │  │ Vercel AI  │  │  RAG Pipeline │     │
│  │ Drizzle  │  │    SDK     │  │  (chunk/embed │     │
│  │ Adapter  │  │            │  │   /retrieve)  │     │
│  └────┬─────┘  └─────┬──────┘  └──────┬───────┘     │
│       │              │                 │              │
└───────┼──────────────┼─────────────────┼─────────────┘
        │              │                 │
   ┌────┴──────────────┴─────────────────┴────┐
   │        PostgreSQL 16 + pgvector          │
   │  (users, sessions, conversations,        │
   │   messages, documents, chunks)            │
   └──────────────────────────────────────────┘
                                    │
                         ┌──────────┴──────────┐
                         │  Embedding Service  │
                         │  (FastAPI, Python)   │
                         │  all-MiniLM-L6-v2   │
                         └─────────────────────┘
```

---

## Project Structure

```
├── docker-compose.yml                  # PostgreSQL (pgvector) + Embedding service
├── docker/
│   └── init.sql                        # Enables pgvector extension
├── embedding-service/
│   ├── Dockerfile                      # Python 3.11 + sentence-transformers
│   ├── main.py                         # FastAPI server (/embed, /embed-batch, /health)
│   └── requirements.txt               # Python dependencies
├── drizzle/                            # Generated migration files
├── src/
│   ├── app.css                         # Global styles, animations, utilities
│   ├── app.html                        # HTML template with dark mode script
│   ├── app.d.ts                        # TypeScript declarations
│   ├── hooks.server.ts                 # Route protection middleware
│   ├── lib/
│   │   ├── chat.ts                     # Chat tree logic (branching, citations, persistence)
│   │   ├── theme.svelte.ts             # Dark mode state (Svelte 5 runes)
│   │   ├── components/
│   │   │   ├── ChatMessage.svelte      # Message bubble with markdown & citations
│   │   │   ├── ChatInput.svelte        # Chat input with auto-resize & file attachment chip
│   │   │   ├── ChatSidebar.svelte      # Conversation list with search
│   │   │   ├── CitationBadge.svelte    # Expandable source citation display
│   │   │   └── DocumentUpload.svelte   # Drag-and-drop file upload
│   │   └── server/
│   │       ├── auth.ts                 # Auth.js config (providers, callbacks)
│   │       ├── email.ts                # Nodemailer email service
│   │       ├── validation.ts           # Password validation rules
│   │       ├── chunker.ts              # Recursive text chunking for RAG
│   │       ├── embedding.ts            # Embedding service API client
│   │       ├── rag.ts                  # Vector search & context building
│   │       └── db/
│   │           ├── index.ts            # Database connection
│   │           └── schema.ts           # Drizzle schema (all tables)
│   └── routes/
│       ├── +layout.svelte              # Navbar, toast system, theme toggle
│       ├── +layout.server.ts           # Session + role loading
│       ├── +page.svelte                # Landing page with hero & features
│       ├── login/                      # Sign-in (credentials + OAuth)
│       ├── register/                   # Sign-up with email verification
│       ├── dashboard/                  # User dashboard with stats
│       ├── profile/                    # Profile settings (name, phone, bio, etc.)
│       ├── admin/                      # Admin panel with user management
│       ├── chat/                       # Pascal AI chat interface
│       ├── documents/                  # Knowledge base management
│       ├── api/
│       │   ├── chat/                   # Streaming AI chat endpoint (with RAG)
│       │   ├── conversations/          # CRUD for conversations & messages
│       │   └── documents/              # Upload, list, delete documents
│       ├── healthz/                    # Health check endpoint
│       ├── version/                    # App version endpoint
│       ├── forgot-password/            # Password reset request
│       ├── reset-password/             # Password reset form
│       ├── verify-email/               # Email verification handler
│       └── logout/                     # Session cleanup + redirect
```

---

## Database Schema

### Users Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `name` | text | Full name (computed) |
| `first_name` | text | First name |
| `last_name` | text | Last name |
| `email` | text | Unique, required |
| `email_verified` | timestamp | Verification date |
| `image` | text | OAuth profile picture URL |
| `password` | text | Bcrypt hash (nullable for OAuth) |
| `phone` | text | Phone number |
| `bio` | text | Short bio (max 300 chars) |
| `location` | text | City/country |
| `active` | boolean | Account enabled/disabled (default: `true`) |
| `role` | text | `user` or `admin` (default: `user`) |
| `created_at` | timestamp | Account creation date |

### Conversations Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `userId` | text | Foreign key → users |
| `title` | text | Conversation title |
| `provider` | text | AI provider (default: `gemini`) |
| `createdAt` | timestamp | Creation date |
| `updatedAt` | timestamp | Last update date |

### Messages Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `conversationId` | UUID | Foreign key → conversations |
| `parentId` | UUID | Parent message (nullable, enables tree branching) |
| `role` | text | `user` or `assistant` |
| `content` | text | Message content |
| `citations` | json | Source citation metadata |
| `attached_file` | json | Attached document metadata (name, chunkCount) |
| `activeChildIndex` | integer | Active branch index |
| `createdAt` | timestamp | Creation date |

### Documents Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `userId` | text | Foreign key → users |
| `filename` | text | Original filename |
| `mimeType` | text | File MIME type |
| `size` | integer | File size in bytes |
| `chunkCount` | integer | Number of text chunks |
| `status` | text | `processing`, `ready`, or `error` |
| `createdAt` | timestamp | Upload date |

### Chunks Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `documentId` | UUID | Foreign key → documents |
| `chunkIndex` | integer | Chunk position in document |
| `content` | text | Chunk text |
| `embedding` | vector(384) | Sentence embedding (pgvector) |

### Other Tables
- **accounts** — OAuth provider links (Google, GitHub)
- **sessions** — Active database sessions with expiry
- **verification_tokens** — Email verification and password reset tokens

---

## Getting Started

### Prerequisites
- **Node.js** 18+ with **pnpm**
- **Docker** and **Docker Compose** (for PostgreSQL + Embedding service)
- **Google Gemini API key** (for Pascal AI chat)
- Google and/or GitHub OAuth credentials (optional)

### 1. Clone and Install

```bash
git clone https://github.com/saadzahid-dot/AuthChatbot-Assignment-2.git
cd AuthChatbot-Assignment-2
pnpm install
```

### 2. Start Docker Services

Launch PostgreSQL (with pgvector) and the embedding microservice:

```bash
docker-compose up -d
# or
pnpm docker:up
```

This starts:
- **passly-db** — PostgreSQL 16 with pgvector extension on port `5432`
- **passly-embedding** — Python FastAPI embedding service on port `8000`

Check service health:

```bash
docker-compose ps
pnpm docker:logs
```

### 3. Environment Variables

Create a `.env` file in the root (see `.env.example`):

```env
# Database (pgvector-enabled Postgres via Docker)
DATABASE_URL="postgresql://postgres:superdata@localhost:5432/auth_app"

# Auth.js
AUTH_SECRET="generate-with-npx-auth-secret"

# Google OAuth (optional — https://console.cloud.google.com/apis/credentials)
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# GitHub OAuth (optional — https://github.com/settings/developers)
AUTH_GITHUB_ID="your-github-client-id"
AUTH_GITHUB_SECRET="your-github-client-secret"

# SMTP Email (for email verification & password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-app-password
SMTP_FROM=AuthApp <your-email@example.com>

# Gemini AI
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key

# Python Embedding Service (started via docker-compose)
EMBEDDING_API_URL=http://localhost:8000
```

#### SMTP Setup Options

| Provider | SMTP_HOST | SMTP_PORT | Notes |
|----------|-----------|-----------|-------|
| **Gmail** | `smtp.gmail.com` | `587` | Use an [App Password](https://myaccount.google.com/apppasswords) (requires 2FA) |
| **Outlook** | `smtp-mail.outlook.com` | `587` | Use your account password |
| **SendGrid** | `smtp.sendgrid.net` | `587` | `SMTP_USER=apikey`, `SMTP_PASS=your-api-key` |
| **Dev (Ethereal)** | *(leave empty)* | — | Auto-creates a test inbox; preview URLs logged to console |

### 4. Database Setup

```bash
# Push schema directly to database
pnpm db:push

# Or generate and run migrations
pnpm db:generate
pnpm db:migrate

# (Optional) Open Drizzle Studio GUI
pnpm db:studio
```

### 5. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 6. Build for Production

```bash
pnpm build
pnpm preview
```

---

## Setting Up the First Admin

Since admin registration is disabled publicly for security, you need to manually create the first admin:

### Option 1: Direct SQL

Register a user normally, then update via SQL:

```sql
-- Find the user
SELECT id, email, role FROM users;

-- Make them admin
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

### Option 2: Via Drizzle Studio

```bash
pnpm db:studio
```

Navigate to the `users` table, find your user, and change the `role` field to `admin`.

---

## RAG Pipeline

The Retrieval-Augmented Generation pipeline works as follows:

1. **Upload** — User uploads a PDF or TXT file via `/documents`
2. **Parse** — PDF files are parsed with `pdf-parse`; TXT files are read directly
3. **Chunk** — Text is recursively split into ~250-character chunks with 50-character overlap, preserving paragraph and sentence boundaries
4. **Embed** — Each chunk is sent to the embedding service, which generates a 384-dimensional vector using `all-MiniLM-L6-v2`
5. **Store** — Chunks and their embeddings are stored in PostgreSQL using pgvector
6. **Query** — When a user sends a chat message, the last 3 exchanges of conversation history are combined into a single search query and embedded, ensuring follow-up questions maintain document context
7. **Retrieve** — Top 5 most similar chunks are retrieved (threshold ≥ 0.3). If a document is explicitly attached, retrieval is scoped to that file
8. **Augment** — Retrieved chunks are injected into the system prompt as context with source labels. The LLM is instructed to only cite sources when the query is related to document content; casual conversation ignores retrieved context
9. **Generate** — The LLM generates a response using the context, citing sources with `[Source N]` notation when relevant
10. **Cite** — Citations are only appended to the response when the LLM explicitly uses `[Source N]` references or its response contains content from the retrieved chunks, and rendered as interactive `CitationBadge` components

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Streaming AI chat with RAG context (supports `attachedFileName` for document-scoped retrieval) |
| `GET` | `/api/conversations` | List user's conversations |
| `POST` | `/api/conversations` | Create a new conversation |
| `GET` | `/api/conversations/[id]` | Get conversation with messages |
| `PATCH` | `/api/conversations/[id]` | Update conversation title |
| `DELETE` | `/api/conversations/[id]` | Delete conversation |
| `POST` | `/api/conversations/[id]/messages` | Save a message |
| `PUT` | `/api/conversations/[id]/messages` | Update a message (used by regenerate) |
| `GET` | `/api/documents` | List user's documents |
| `POST` | `/api/documents` | Upload and process a document |
| `GET` | `/api/documents/[id]` | Get document metadata |
| `DELETE` | `/api/documents/[id]` | Delete document and chunks |
| `GET` | `/healthz` | Health check (database + embedding service) |
| `GET` | `/version` | App name and version |

---

## Route Protection

| Route | Access |
|-------|--------|
| `/` | Public |
| `/login`, `/register` | Public |
| `/forgot-password`, `/reset-password` | Public |
| `/verify-email` | Public |
| `/healthz`, `/version` | Public |
| `/dashboard` | Authenticated users only |
| `/profile` | Authenticated users only |
| `/chat` (Pascal) | Authenticated users only |
| `/documents` | Authenticated users only |
| `/admin` | Admin role only |

Route protection is enforced in `src/hooks.server.ts`. Unauthenticated users are redirected to `/login`, and non-admin users are blocked from `/admin`. Deactivated accounts have their sessions cleared and are redirected to login.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm preview` | Preview production build |
| `pnpm db:generate` | Generate Drizzle migration files |
| `pnpm db:migrate` | Run pending migrations |
| `pnpm db:push` | Push schema directly to database |
| `pnpm db:studio` | Open Drizzle Studio GUI |
| `pnpm docker:up` | Start Docker services (PostgreSQL + Embedding) |
| `pnpm docker:down` | Stop Docker services |
| `pnpm docker:logs` | Tail Docker service logs |

---

## Security

- Passwords hashed with **bcrypt** (12 salt rounds)
- Sessions stored in database with **httpOnly** cookies
- CSRF protection via **Auth.js**
- Route-level protection in **server hooks**
- Token-based email verification and password reset
- Input validation on all server actions
- Chat and document API endpoints independently verify authentication
- Per-user document isolation — users can only access their own documents
- Deactivated accounts have all sessions purged on next request
