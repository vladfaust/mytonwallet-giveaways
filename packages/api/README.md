# MyTonWallet Giveaways API

An API server implementation for the MyTonWallet Giveaways contest, which took place from April 27 to May 7, 2024.
See the [root README](../../README.md) for a broader picture.

## Technology Stack

The following are the contest requirements for the API implementation:

- NodeJS
- TypeScript
- [Sequelize ORM](https://sequelize.org/)
- PostgreSQL

These are the technologies I've used in addition:

- Express

  Server performance was not of the greatest concern for the sake of this submission, so I've opted in for [ExpressJS](https://expressjs.com/), the way to go for rapid development.
  Express is easy to use, and has a great ecosystem of plugins.
  Of course, when the need comes, and HTTP requests become a bottleneck, I'd consider using another web server.

- Redis

  I've opted in using Redis to store auth payloads for TON proofs (see the [main README file](../../README.md#user-authentication) for detailed explanation).
  Redis is a natural key-value storage choice for a potentially distributed application.
  I'm using the [ioredis](https://www.npmjs.com/package/ioredis) package.

- Zod

  I've used [Zod](https://zod.dev/) for runtime validation of the API requests.
  It's a great library for this purpose, as it provides a nice API for defining schemas and validating data.

- Bull

  I've used [BullMQ](https://bullmq.io/) for job scheduling.
  It's a simple, yet powerful library for managing background jobs.
  I'm using [bull-board](https://github.com/felixmosh/bull-board) for an out-of-the-box dashboard for Bull, [integrated with Express](https://www.npmjs.com/package/@bull-board/express).

- Ton

  Of course, I've used the [ton](https://www.npmjs.com/package/@ton/ton) package for server-side TON development.

The following are development-local libraries which I'm comfortable with:

- [Nodemon](https://www.npmjs.com/package/nodemon) to monitor file changes and restart the server, configured with [`nodemon.json`](./nodemon.json).
- [Foreman](https://www.npmjs.com/package/foreman) for the process management with [`Procfile`](./Procfile).
- [Prettier](https://www.npmjs.com/package/prettier) for opinionated code formatting, along with some plugins, such as [organize-imports](https://www.npmjs.com/package/prettier-plugin-organize-imports); prettier is configured with [`.prettierrc`](./.prettierrc).

## Implementation details

- TON addresses are stored in PostgreSQL as `Address.toRaw()` `BLOB`s.

- Many low hanging database optimizations (indices, intricate transaction options, hand-picked columns to select etc.) are left out for the sake of development speed & simplicity.

- Right now, when an instant giveaway has a end time, and the end time has come, the actual status field isn't updated automatically in the database.

  This issue is mitigated on the client side, and in the API giveaway would rightfully deny new check-ins due to the expiration.
  However, it'd be better to run a separate job to updated the status automatically, or to come up with a smart getter which returns a "finished" status given the end time situation. #futurework

## Local development

After running `npm install`, use the convenient `npm run dev` and `npm run build` commands to run the development server and build the package for distribution, respectively.
