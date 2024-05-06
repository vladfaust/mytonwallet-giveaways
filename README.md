# MyTonWallet Giveaways

> A Cryptocurrency Giveaway System in MyTonWallet.

This repository is a entry for the _Fullstack JavaScript Developers Contest_ which took place from April 27 to May 7, 2024.

See the full technical specification at https://telegra.ph/MyTonWallet-Giveaways-En-04-27.

## Evaluation criteria

In accordance to the [Telegram post](https://t.me/toncontests/166), these are the criteria for entry evaluation, with my comments on each.

- _Completeness of the task._

  By the moment of submission, I consider all the outlined tasks completed.
  Telegram bot is an optional specification, which implementation I decided to postpone (see [Future work](#future-work)).

- _Overall performance and computation optimization._

  Given that NodeJS is a specification requirement on the server side[^1], the actual areas I should've been paying attention to are database (efficient queries, indexes and N+1 problem) and API interactions.
  Given the limited timeframe, I intentionally omitted some of the optimizations; read more in the [API README](./packages/api/README.md).

  On the client(s) side, I'm applying the best of my knowledge to reduce redraws and unneccessary API calls; there are more sophisticated tools for that purpose, however, such as [Tanstack Query](https://tanstack.com/query), which are, due to limited timeframe, are left out for simplicity.

- _Code accuracy._

  By accuracy I assume readability, code deduplication and rich documentation, all of which I pursue to achieve throughout the codebase.
  However, you may notice some code duplication across the frontend applications, which may be mitigated by extracting the code to another package; yet it would take more time and imply infrastructure burden, better avoided for the sake of contest submission.

- _Attention to detail of interface and UX._

  May aim was to make front-end interfaces accessible and responsive.
  As a result, the applications look decent both on desktop & mobile screens, yet there is always room for improvement.
  I paid attention to small UX elements, such as loading indicators and disabling buttons during loading.
  I've used an UI framework called [DaisyUI](https://daisyui.com), containing a plethora of ready-to-use TailwindCSS components, for rapid development; the framework also utilizes some of the best accessiblity and responsiveness practices, which I've made use of intrinsically.

- _Minimal use of external libraries._

  I tried to balance between the number of dependencies and the speed of development.
  For example, I could've written the front-end clients in pure HTML, JS & CSS, but it would take forever.
  Instead, I'm using Pug, VueJS, TailwindCSS and DaisyUI to mock up the interface quickly (see [Client's README](./packages/client/README.md)).

- _Stability and absence of bugs._

  I conveyed some manual testing of the app's functionality, fixing as many bugs as I could.
  I DID NOT test the app neither in the context of the in-wallet browser nor Telegram Mini (Web) Application.
  See the [Demo](#demo) section for the demonstration of the application.

## Implementation details

Due to the lack of specification details in regards of certain areas of the application, I've made a number of choices on my own.
In this section, I'm trying to draw the broader picture explaining functionality spread across packages.

## Overall architecture

- [packages/api](./packages/api/README.md) is a NodeJS application, which serves as an HTTP API backend both for client and manager.
- [packages/client](./packages/client/README.md) is a VueJS front-end Single-Page Application, which is intended for end-users to participate in giveaways.
  It accesses the API via HTTP requests.
- [packages/manager](./packages/manager/README.md) is also a VueJS SPA, which is intended for giveaway creators to manage their giveaways.
  Similarly to the client, it accesses the backend via HTTP requests.

### User authentication

The specification states that for every check-in action, a user must convey a proof signed with TON wallet.
Yet, in practice this implies the need to manually, explicitly sign a request for each giveaway, which turns out to be tedious.

Instead, given that there is, by design, a single web application for many giveaways, I've implemented a more traditional authentication with JWT stored on the client side:

1. Before the wallet is connected, a client implicitly requests the backend for some random token—_auth payload_,
2. which is then implicitly signed by a TonConnect-specification-abiding wallet (MyTonWallet does indeed match this criterion).
3. Then, upon a successfull wallet connection, the signature is sent back to the backend along with auth payload.
4. The server checks that:
   1. the auth payload was indeed created by it before (I'm using Redis to store auth payloads temporarily),
   2. the signature is valid.
5. Finally, the server returns a fresh crafted JWT with TON address embedded within.

This way, a client now has a JWT confirming its TON address, signed by the backend.
Upon receiving a check-in request, the server simply validates the JWT and extracts the address from it, registering a new participant with the address, without the need to call for manual signature again on the client side!

### Giveaway completion

A giveaway, regardless of its type, MAY have a task to complete.
A lottery giveaway MUST have end time, and an instant giveaway MAY have end time.

| Giveaway type    | Finished when...                     |
| ---------------- | ------------------------------------ |
| Instant, no task | `N` participants have checked in[^1] |
| Instant, task    | `N` tasks completed[^2]              |
| Lottery, no task | Lottery is drawn[^3]                 |
| Lottery, task    | Lottery is drawn[^3]                 |

[^1]: ./packages/api/src/web/routes/giveaways/checkin.ts
[^2]: ./packages/api/src/web/routes/giveaways/completeTask.ts
[^3]: ./packages/api/src/jobs/lottery.ts

## Demo

<details>
<summary>Creating a giveaway</summary>

In the [manager](./packages/manager/README.md) application, you'd see a list of giveaways:

![Giveaway manager screen](./docs/Screenshot%202024-05-06%20at%2013.15.21.png)

Click on the "Create giveaway" button, and fill in the form:

![Giveaway creation screen](./docs/Screenshot%202024-05-06%20at%2013.33.06.png)

You'll be redirected to the giveaway management screen, where you'll have buttons to replenish its balance:

![Giveaway management screen, waiting for a payment](./docs/Screenshot%202024-05-06%20at%2013.33.42.png)

Once you've topped up its balance, its status would change to "active".
Now you may share the link with users!

![Giveaway management screen, active](./docs/Screenshot%202024-05-06%20at%2013.49.03.png)

</details>

<details>
<summary>Participating in a giveaway</summary>

Open the [client](./packages/client/README.md) web application to participate in a giveaway.
First, you'll need to connect your TON wallet.

![The initial giveaway screen](./docs/Screenshot%202024-05-06%20at%2013.49.17.png)

![Confirming connection in the wallet interface](./docs/Screenshot%202024-05-06%20at%2013.49.39.png)

Once you've connected your wallet, you may click on the check-in button.

![Giveaway screen, wallet connected](./docs/Screenshot%202024-05-06%20at%2013.51.31.png)

Afterwards, if the giveaway has a task to complete, you'll see the task URL.

![Giveaway screen with task URL](./docs/Screenshot%202024-05-06%20at%2013.52.09.png)

A successfull task completion would result in a confirmation screen!

![Task completion via curl](./docs/Screenshot%202024-05-06%20at%2013.53.11.png)

![Giveaway screen, task completed](./docs/Screenshot%202024-05-06%20at%2013.53.24.png)

![Wallet screen: received TON](./docs/Screenshot%202024-05-06%20at%2013.56.16.png)

</details>

## Local development

Consult the packages' README files to learn more about the local project development process.
Overall, VS Code is recommended; check the recommended extensions and make use of the [workspace](./MyTonWallet-Giveaways.code-workspace)!

## Future work

Currently, managed giveaways are stored on the client side (in IndexedDB), and there is no way to edit or delete a giveaway.
Also, a end-user doesn't have a structured access to the giveaways they're participating in, nor they have a way to explore new ones.

It comes naturally the idea to further extend the project with proper Telegram authentication, such as via [Telegram Login](https://core.telegram.org/widgets/login).
This way, it'd be possible to centralize giveaway management, as well as natually integrate Telegram bots and the whole TON ecosystem into the project.

A fully-fledged management, or client, web application may be easily integrated in a Telegram bot in the form of [Telegram Mini (Web) Application](https://core.telegram.org/bots/webapps), which aligns well with the Telegram login feature.

## Stats

I've spent a total of 43 hours working on this project, tracked with Wakatime.
See the details at https://wakatime.com/@vladfaust/projects/mxmzkwtutw?start=2024-04-26&end=2024-05-06.

Also, check out my overall Wakatime profile at https://wakatime.com/@vladfaust.
