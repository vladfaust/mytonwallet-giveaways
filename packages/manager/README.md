# MyTonWallet Giveaways Manager Web Client

A giveaway manager front-end application implementation for the MyTonWallet Giveaways contest, which took place from April 27 to May 7, 2024.
See the [root README](../../README.md) for a broader picture.

## Technology Stack

See the rationale for the technology stack in the [client app README](../client/README.md).

These are the libraries used specifically for the manager application:

- [Dexie](https://dexie.org/) is used for IndexedDB interactions (see below).
- [qrcode](https://npmjs.com/package/qrcode) is used to generate QR codes for top-ups.

### Data Storage

As and ad hoc solution, I've chosen IndexedDB wrapped with [Dexie](https://dexie.org/) to store managed giveaways along with their sensitive data (i.e. task tokens) locally.
Ideally, a fully-fledged authentication shall be implemented, such as Telegram Login, and sensitive data shall only be returned to a giveaway creator.
See more in the [root README](../../README.md#future-work).

## Local development

Akin to the client application, this package uses [Vite](https://vitejs.dev/) as the development server, making the development process as easy as:

```sh
# Install the dependencies.
npm install

# Run the local development server.
npm run dev

# Build the package for distribution, creating a `dist` directory.
npm run build
```

## Dokku deployment

Commands to run on a [dokku](https://dokku.com/) server:

```sh
# Create a Dokku application.
dokku create gw-manager

# Set the build path (it's a monorepo).
dokku builder:set gw-manager build-dir packages/manager

# These are dokku-specific variables (see
# https://github.com/dokku/heroku-buildpack-nginx).
dokku config:set gw-manager \
  NGINX_ROOT=dist \
  NGINX_DEFAULT_REQUEST=index.html

# See .env.example for the list of required environment variables.
dokku config:set gw-manager VITE_API_URL=https://api.example.com
```

Then locally:

```sh
git remote add dokku-manager dokku@host:gw-manager
git push dokku-manager
```
