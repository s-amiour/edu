# Syllabus Navigator

AI-powered adaptive learning platform that transforms PDF syllabi into interactive knowledge graphs, personalized study plans, and mastery tracking.

## Architecture

```
┌─────────────┐     ┌──────────────────────────────────────────────────┐
│   Frontend   │     │                   Backend                        │
│   (Next.js)  │────▶│  (Express + TypeScript)                          │
│   Port 3000  │     │  Port 3001                                       │
└─────────────┘     │                                                    │
                     │  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
                     │  │  Auth     │  │Curriculum│  │  AI Agents    │  │
                     │  │  Routes   │  │  Routes  │  │  (Gemini)     │  │
                     │  └──────────┘  └──────────┘  └───────────────┘  │
                     │  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
                     │  │  Quiz    │  │ Content  │  │  Graph        │  │
                     │  │  Engine  │  │  Engine  │  │  Builder      │  │
                     │  └──────────┘  └──────────┘  └───────────────┘  │
                     └───────┬──────────────┬──────────────┬────────────┘
                             │              │              │
                     ┌───────▼──┐   ┌──────▼─────┐  ┌────▼────┐
                     │PostgreSQL│   │   Neo4j    │  │  Redis  │
                     │+ pgvector│   │  (Graph)   │  │ (Cache) │
                     └──────────┘   └────────────┘  └─────────┘
```

**Data flow:** PDF Upload → Chunk → Embed (pgvector) → Knowledge Graph (Neo4j) → AI Content Generation (Gemini) → Adaptive Recommendations

## Prerequisites

- Node.js 20+
- PostgreSQL 16 with pgvector
- Neo4j 5
- Redis 7
- Google Gemini API key

## Local Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd syllabus-navigator
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your database credentials and API keys

# 3. Set up database
npx prisma migrate dev
npm run db:seed

# 4. Start development servers
npm run dev
```

Backend runs on `http://localhost:3001`, frontend on `http://localhost:3000`.

## Docker Setup

```bash
# Start all services
docker compose up -d

# Run database migrations inside the container
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run seed

# View logs
docker compose logs -f backend

# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v
```

## Seed Data

The seed script creates 3 courses with full curriculum structure:

| Course | Code | Modules | Topics |
|--------|------|---------|--------|
| IAM Fundamentals | CS401 | 6 | 24 |
| Counting & Enumerating | MA201 | 4 | 14 |
| Probability | MA301 | 4 | 15 |

**Default users:**
- Student: `student@edu.com` / `student123`
- Professor: `professor@edu.com` / `prof123`

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get JWT |
| GET | `/api/auth/me` | Get current user (auth required) |

### Curriculum
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/curriculum/courses` | List all courses |
| GET | `/api/curriculum/courses/:id` | Get course with modules and topics |
| GET | `/api/curriculum/courses/:id/modules` | List modules for a course |
| GET | `/api/curriculum/courses/:id/topics` | List all topics for a course |
| GET | `/api/curriculum/topics/:id` | Get topic detail with objectives |
| GET | `/api/curriculum/topics/:id/prerequisites` | Get prerequisite chain |

### Student
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/student/mastery` | Get mastery records |
| GET | `/api/student/dashboard` | Get dashboard data |

### Content & Quiz
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/content/generate` | Generate AI content for a topic |
| POST | `/api/quiz/generate` | Generate quiz for a topic |
| POST | `/api/quiz/:id/attempt` | Submit quiz attempt |

### Upload & Graph
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/upload` | Upload syllabus PDF |
| POST | `/api/curriculum/graph/build` | Build knowledge graph (professor) |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |

## Testing

```bash
# Run all tests
npm run test

# Run with coverage
npx jest --coverage --workspace=backend

# Run specific test file
npx jest auth.test.ts --workspace=backend
```

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push/PR to `APP` branch:

1. **Lint** - ESLint for frontend
2. **Type Check** - TypeScript compilation for backend
3. **Test** - Jest test suite
4. **Build** - Production build for both services

## Deployment (Scalingo)

```bash
# 1. Install Scalingo CLI
# 2. Create apps
scalingo create syllabus-navigator --region osc-fr1

# 3. Add addons
scalingo addons-create postgresql premium-xs
scalingo addons-create neo4j neo4j-sandbox
scalingo addons-create redis redis-small

# 4. Set environment variables
scalingo env-set DATABASE_URL=<from-addon>
scalingo env-set NEO4J_URI=<from-addon>
scalingo env-set REDIS_URL=<from-addon>
scalingo env-set JWT_SECRET=$(openssl rand -hex 32)
scalingo env-set GEMINI_API_KEY=<your-key>

# 5. Deploy
git push scalingo main

# 6. Run migrations and seed
scalingo run "npx prisma migrate deploy"
scalingo run "cd backend && npx tsx src/db/seed.ts"
```

The `Procfile` defines the web process for Scalingo deployment.

## Project Structure

```
syllabus-navigator/
├── backend/
│   ├── src/
│   │   ├── agents/          # AI agents (Gemini)
│   │   ├── config/          # App configuration
│   │   ├── db/              # Prisma client, Redis, seed
│   │   ├── middleware/       # Auth, validation, rate limiting
│   │   ├── routes/          # Express route handlers
│   │   ├── types/           # TypeScript type definitions
│   │   └── index.ts         # Express app entry point
│   ├── Dockerfile
│   ├── jest.config.ts
│   └── package.json
├── frontend/
│   ├── Dockerfile
│   └── package.json
├── prisma/
│   └── schema.prisma
├── .github/workflows/ci.yml
├── docker-compose.yml
├── package.json
├── Procfile
└── README.md
```
