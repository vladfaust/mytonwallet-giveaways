# MyTonWallet Giveaways Manager Web Client

> Manage your giveaways.

## Technology Stack

### VueJS

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

### Other Libraries

- I opted in using [Pug](https://pugjs.org/api/getting-started.html), [Tailwind](https://tailwindcss.com/) and [SCSS](https://sass-lang.com/) to speed up development process.
  I could've used plain HTML and CSS, but it would simply take more time.
- [DaisyUI](https://daisyui.com/) is a great Tailwind plugin that provides a lot of useful components out of the box.
- [Lucide Icons](https://lucide.dev/) allow to achive a consistent look and feel across the application.

### Data Storage

As and ad hoc, I've chosen IndexedDB wrapped with [Dexie](https://dexie.org/) to store managed giveaways along with their sensitive data (i.e. task tokens) locally.
Ideally, a fully-fledged authentication shall be implemented, such as Telegram Connect, and sensitive data shall only be returned to a giveaway creator.
Relying on authentication with Telegram is a natural choice for a TON-based application, and it also fits the planned usage of Telegram Mini (Web) Application for the management bot.

## Recommended Setup

- [VS Code](https://code.visualstudio.com/) + [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (previously Volar) and disable Vetur

- Use [vue-tsc](https://github.com/vuejs/language-tools/tree/master/packages/tsc) for performing the same type checking from the command line, or for generating d.ts files for SFCs.
