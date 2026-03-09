import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Project, BoardImage, ImageBlob, Connection, TextNode, CategoryNote, EditNote, PromptNode } from '../types';

interface MoodboardDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
    indexes: { 'by-updated': number };
  };
  images: {
    key: string;
    value: BoardImage;
    indexes: { 'by-project': string };
  };
  blobs: {
    key: string;
    value: ImageBlob;
  };
  connections: {
    key: string;
    value: Connection;
    indexes: { 'by-project': string };
  };
  textNodes: {
    key: string;
    value: TextNode;
    indexes: { 'by-project': string };
  };
  categoryNotes: {
    key: string;
    value: CategoryNote;
    indexes: {
      'by-project': string;
      'by-image': string;
    };
  };
  editNotes: {
    key: string;
    value: EditNote;
    indexes: {
      'by-project': string;
      'by-image': string;
    };
  };
  promptNodes: {
    key: string;
    value: PromptNode;
    indexes: {
      'by-project': string;
      'by-image': string;
    };
  };
}

const DB_NAME = 'moodboard-db';
const DB_VERSION = 5;

let dbInstance: IDBPDatabase<MoodboardDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<MoodboardDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<MoodboardDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
        projectStore.createIndex('by-updated', 'updatedAt');

        const imageStore = db.createObjectStore('images', { keyPath: 'id' });
        imageStore.createIndex('by-project', 'projectId');

        db.createObjectStore('blobs', { keyPath: 'id' });
      }

      if (oldVersion < 2) {
        const connStore = db.createObjectStore('connections', { keyPath: 'id' });
        connStore.createIndex('by-project', 'projectId');

        const textStore = db.createObjectStore('textNodes', { keyPath: 'id' });
        textStore.createIndex('by-project', 'projectId');
      }

      if (oldVersion < 3) {
        const catStore = db.createObjectStore('categoryNotes', { keyPath: 'id' });
        catStore.createIndex('by-project', 'projectId');
        catStore.createIndex('by-image', 'imageId');
      }

      if (oldVersion < 4) {
        const editStore = db.createObjectStore('editNotes', { keyPath: 'id' });
        editStore.createIndex('by-project', 'projectId');
        editStore.createIndex('by-image', 'imageId');
      }

      if (oldVersion < 5) {
        const promptStore = db.createObjectStore('promptNodes', { keyPath: 'id' });
        promptStore.createIndex('by-project', 'projectId');
        promptStore.createIndex('by-image', 'imageId');
      }
    },
  });

  return dbInstance;
}
