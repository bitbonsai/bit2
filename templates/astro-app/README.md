# PROJECT_NAME

A modern web application built with [bit2](https://github.com/bitbons-ai/bit2) - featuring Astro, libSQL/Turso, and Cloudflare Pages.

## 🚀 Tech Stack

- **[Astro](https://astro.build/)** - Modern web framework with SSR
- **[libSQL/Turso](https://turso.tech/)** - SQLite for the edge 
- **[Cloudflare Pages](https://pages.cloudflare.com/)** - Fast, secure hosting
- **[Bun](https://bun.sh/)** - Fast JavaScript runtime

## 📁 Project Structure

```
/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   └── Layout.astro
│   ├── db/
│   │   ├── client.ts       # Database client configuration
│   │   ├── schema.sql      # Database schema
│   │   └── seed.sql        # Sample data
│   ├── lib/
│   │   └── db.ts           # Database utilities
│   ├── pages/
│   │   ├── api/            # API endpoints
│   │   ├── index.astro     # Homepage
│   │   └── about.astro     # About page
├── dev.db                  # Local SQLite database (auto-created)
└── astro.config.mjs        # Astro configuration
```

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                | Action                                           |
| :----------------------| :----------------------------------------------- |
| `bun install`          | Installs dependencies                            |
| `bun run dev`          | Starts local dev server at `localhost:4321`     |
| `bun run build`        | Build your production site to `./dist/`         |
| `bun run preview`      | Preview your build locally, before deploying    |
| `bit2 migrate`         | Run database migrations                          |
| `bit2 deploy`          | Deploy to Cloudflare Pages                       |

## 🗄️ Database

### Local Development
- Uses SQLite database file: `./dev.db`
- Automatically created on first run
- Perfect for development and testing

### Production
- Uses [Turso](https://turso.tech/) cloud database
- Global edge replication
- Seamless scaling
- Configured via environment variables

## 🚀 Deployment

This project is configured for deployment on **Cloudflare Pages** with automatic deployments from your Git repository.

### Environment Variables

Set these in your Cloudflare Pages dashboard:

```
TURSO_DATABASE_URL=your_database_url_here
TURSO_AUTH_TOKEN=your_auth_token_here
```

### Build Settings

- **Framework preset**: Astro
- **Build command**: `bun run build`
- **Build output directory**: `dist`

## 📖 API Endpoints

- `GET /api/users.json` - Fetch all users
- `POST /api/users.json` - Create a new user
- `GET /api/posts.json` - Fetch all posts with user info
- `POST /api/posts.json` - Create a new post

## 🛠️ Development

1. **Install dependencies**:
   ```bash
   bun install
   ```

2. **Run migrations** (creates tables and sample data):
   ```bash
   bit2 migrate
   ```

3. **Start development server**:
   ```bash
   bun run dev
   ```

4. **Visit your app**: Open [http://localhost:4321](http://localhost:4321)

## 📚 Learn More

- [Astro Documentation](https://docs.astro.build)
- [Turso Documentation](https://docs.turso.tech)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages)
- [bit2 CLI Documentation](https://github.com/bitbons-ai/bit2)

---

Built with ❤️ using [bit2](https://github.com/bitbons-ai/bit2)