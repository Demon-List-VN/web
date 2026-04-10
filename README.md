## Prerequisites

- **Node.js** (v18+)
- **npm** (or pnpm/yarn)

## Setup Development Server

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file at the project root:

```bash
cp .env.example .env
```

Fill in the required environment variables:

```env
VITE_SUPABASE_API_KEY=your_supabase_anon_key
VITE_SUPABASE_API_URL=your_supabase_project_url
VITE_API_URL=http://localhost:8787
```

> **Note:** `VITE_API_URL` should point to your running API server. If running the API locally, it defaults to `http://localhost:8787`.

### 3. Start Development Server

```bash
npm run dev
```

The web application will be available at `http://localhost:5173` (default Vite port).

## Useful Commands

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run check

# Type checking (watch mode)
npm run check:watch

# Lint and format check
npm run lint

# Auto-format code
npm run format
```