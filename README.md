# PX Mobile

An API that automatically generates PerimeterX mobile cookies 🤖.

This project is provided "as-is" and without warranty of any kind. It's likely to be broken by updates in the future and is meant to be used as a resource to learn more about reverse engineering.

# ⚙️ Setup

## 💻 Local

Make sure [`pnpm`](https://pnpm.io/installation) is installed.

```bash
cp .env.example .env
pnpm install
pnpm run build
pnpm run start
```

## 🚀 Deployment to [Fly.io](https://fly.io/)

```bash
flyctl create --name generate-api --no-deploy
flyctl secrets set API_SECRET=example
flyctl secrets set DATABASE_URL=example
flyctl secrets set AXIOM_TOKEN=example
flyctl deploy
fly scale count 2
```

# 🔨 Usage

Start the dev server using `pnpm run dev` and make a curl request to `http://localhost:3000/api/auth` to get started.
Alternatively, use `cli.ts` for local testing.

# 📚 Documentation

See [here](docs/app-versions.md) for app version details.

# 🧞 Commands

| Command                       | Action                                        |
|-------------------------------|-----------------------------------------------|
| `pnpm install`                | Installs dependencies                         |
| `pnpm run dev`                | Starts a local dev server at `localhost:3000` |
| `pnpm run build`              | Build for production to `./dist`              |
| `pnpm run start`              | Runs the built production files               |
| `pnpm run drizzle:generate`   | Generates Drizzle schema files                |
| `pnpm run drizzle:migrate`    | Runs Drizzle migrations                       |
| `pnpm run drizzle:push`       | Push Drizzle schema changes                   |
| `pnpm run lint`               | Run ESLint checking                           |
| `pnpm run prettier:check`     | Check for Prettier violations                 |
| `pnpm run prettier:format`    | Correct Prettier violations                   |

# License

This project is completely proprietary and shouldn't be shared under any circumstance.