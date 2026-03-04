# Finance Tracker MVP

Personal Finance Management app built with Next.js, Prisma, and Tailwind CSS.

## Features (MVP)
- **Multi-tenant Workspaces**: Automatic personal workspace creation on first login.
- **CSV Import Wizard**: Client-side parsing with column mapping and preview.
- **Rules Engine**: Automated categorization based on transaction descriptions.
- **Transactions Management**: Filtering, bulk editing, and staged/confirmed status.
- **Mobile-friendly UI**: Modern dashboard and navigation.

## Local Setup (Docker)

1. **Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Start Local Database**:
   ```bash
   docker-compose up -d
   ```

3. **Setup Environment**:
   - Copy `.env.local.example` to `.env.local`.
   - Update `DATABASE_URL` if you changed the Docker defaults.
   - Generate a `NEXTAUTH_SECRET` (see instructions in the file).
   - Add your `GITHUB_ID` and `GITHUB_SECRET` (see "GitHub OAuth" below).

4. **Initialize Database**:
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

5. **Start Development Server**:
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers).
2. Create a "New OAuth App".
3. **Application Name**: `Finance Tracker (Local)`
4. **Homepage URL**: `http://localhost:3000`
5. **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
6. Copy the **Client ID** and **Client Secret** to your `.env.local`.

## Deploying to Vercel (Production)

1. Push your code to a GitHub repository.
2. Connect the repository to Vercel.
3. **Database**: Create a project on [Neon.tech](https://neon.tech) and copy the connection string.
4. **GitHub OAuth**: Create a *separate* OAuth App on GitHub for production.
   - **Homepage URL**: Your Vercel domain.
   - **Authorization callback URL**: `https://YOUR_DOMAIN.vercel.app/api/auth/callback/github`
5. **Environment Variables**: Add these in the Vercel Dashboard:
   - `DATABASE_URL`: Your Neon connection string.
   - `NEXTAUTH_URL`: Your production URL.
   - `NEXTAUTH_SECRET`: A new random 32-char hash.
   - `GITHUB_ID`: Production GitHub Client ID.
   - `GITHUB_SECRET`: Production GitHub Client Secret.

## Project Structure
- `src/app/app`: Main application routes (Dashboard, Transactions, etc.)
- `src/app/auth`: Authentication pages.
- `src/components`: UI components.
- `src/lib`: Shared logic (Prisma, Rules Engine).
- `prisma/schema.prisma`: Database model.
