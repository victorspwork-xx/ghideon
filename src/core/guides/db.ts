import Dexie, { type EntityTable } from 'dexie';
import type { CachedAudio, Guide, Screenshot, Snapshot, Step } from './types';

export class MimikDB extends Dexie {
  guides!: EntityTable<Guide, 'id'>;
  steps!: EntityTable<Step, 'id'>;
  screenshots!: EntityTable<Screenshot, 'id'>;
  snapshots!: EntityTable<Snapshot, 'id'>;
  audioCache!: EntityTable<CachedAudio, 'id'>;

  constructor() {
    super('mimik');
    this.version(1).stores({
      guides: 'id, createdAt, updatedAt, starred, deletedAt',
      steps: 'id, guideId, index',
      screenshots: 'id, stepId',
    });
    this.version(2).stores({
      snapshots: 'id, guideId, createdAt, [guideId+createdAt]',
    });
    this.version(3).stores({
      audioCache: 'id, stepId, updatedAt',
    });
  }
}

export const db = new MimikDB();
