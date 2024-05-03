# MyTonWallet Giveaways API

## Technology Stack

The following are the contest requirements:

- NodeJS
- TypeScript
- Sequelize
- PostgreSQL

- Redis
  I've opted in using Redis to store auth payloads for Ton proofs.
  It is a natural choice for a potentially distributed application.

### On Sequelize

It is my first time using [Sequelize](https://sequelize.org), and I've found it to be a bit cumbersome.
Sequelize has poor typing support and forces opinionated ORM patterns.
Codebase-database mismatch due to weak typing is common, leading to runtime errors.

[Drizzle](https://orm.drizzle.team) has better TypeScript ergonomics and is more SQL-like overall; this is what I use for my projects.

Another alternative is [Prisma](https://prisma.io).
I've used it in the past, but it imbues great vendor lock-in in my opinion (`.prisma` schema, proprietary real-time updates solution etc.).
