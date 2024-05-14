# MyTonWallet Giveaways Web Client

A end-user giveaways front-end application implementation for the MyTonWallet Giveaways contest, which took place from April 27 to May 7, 2024.
See the [root README](../../README.md) for a broader picture.

## Technology Stack

The [specification](https://telegra.ph/MyTonWallet-Giveaways-En-04-27) states that one shall use HTML, JS and CSS to create the web applications.

Well, creating an application in pure HTML+JS+CSS would take ages, therefore I've opted into using the following libraries (which I have a decent experience with):

- [VueJS](https://vuejs.org/), version 3, as the general framework for the application; I've included some ready-to-use Vue components as well.
- [Pug](https://pugjs.org/api/getting-started.html) for rapid HTML templating.
- [Tailwind](https://tailwindcss.com/) and [SCSS](https://sass-lang.com/) for _extremely_ fast styling.
- [DaisyUI](https://daisyui.com/) is a great Tailwind framework that provides a lot of ready-to-use responsive, accessible components out of the box.
- [Lucide Icons](https://lucide.dev/) allow to achive a consistent look and feel across the application.

Other libraries used are:

- [@tonconnect](https://www.npmjs.com/package/@tonconnect/sdk) is used to interact with TON wallets.
- [vueuse](https://vueuse.org/) is a collection of essential Vue Composition Utilities.
- [canvas-confetti](https://npmjs.com/package/canvas-confetti) is used as an eye candy for the giveaway completion.

For local development, I'm using [Vite](https://vitejs.dev/), TypeScript and [prettier](https://prettier.io/).

## Local development

This package uses Vite as the development server, making the development process as straightforward as:

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
dokku create gw-client

# Set the build path (it's a monorepo).
dokku builder:set gw-client build-dir packages/client

# These are dokku-specific variables (see
# https://github.com/dokku/heroku-buildpack-nginx).
dokku config:set gw-client \
  NGINX_ROOT=dist \
  NGINX_DEFAULT_REQUEST=index.html

# See .env.example for the list of required environment variables.
dokku config:set gw-client VITE_FOO=bar
```

Then locally:

```sh
git remote add dokku-client dokku@host:gw-client
git push dokku-client
```
