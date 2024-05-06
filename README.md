# MyTonWallet Giveaways

> A Cryptocurrency Giveaway System in MyTonWallet.

This repository is a entry for the _Fullstack JavaScript Developers Contest_ which took place from April 27 to May 7, 2024.

See the full technical specification at https://telegra.ph/MyTonWallet-Giveaways-En-04-27.

## Evaluation criteria

In accordance to the [post](https://t.me/toncontests/166), these are the criteria for entry evaluation:

- Completeness of the task.
- Overall performance and computation optimization.
- Code accuracy.
- Attention to detail of interface and UX.
- Minimal use of external libraries.
- Stability and absence of bugs.

## Implementation notes

### Giveaway completion

| Giveaway type    | Finished when...                     |
| ---------------- | ------------------------------------ |
| Instant, no task | `N` participants have checked in[^1] |
| Instant, task    | `N` tasks completed[^2]              |
| Lottery, no task | Lottery is drawn[^3]                 |
| Lottery, task    | Lottery is drawn[^3]                 |

[1]: ./packages/api/src/web/routes/giveaways/checkin.ts
[2]: ./packages/api/src/web/routes/giveaways/completeTask.ts
[3]: ./packages/api/src/jobs/lottery.ts
