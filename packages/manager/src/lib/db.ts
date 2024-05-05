// @see https://dexie.org/docs/Tutorial/Vue
//

import Dexie, { Table } from "dexie";

export interface Giveaway {
  id: string;
  taskToken?: string;
  createdAt: Date;
}

export class MyDexie extends Dexie {
  giveaways!: Table<Giveaway>;

  constructor(databaseName: string) {
    super(databaseName);

    this.version(1).stores({
      giveaways: "++id, createdAt",
    });
  }
}

export const db = new MyDexie("myDatabase");
