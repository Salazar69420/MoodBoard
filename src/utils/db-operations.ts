import { getDB } from './db';
import type { Project, BoardImage, ProjectType } from '../types';
import { nanoid } from 'nanoid';

// ---- Projects ----

export async function getAllProjects(): Promise<Project[]> {
  const db = await getDB();
  const projects = await db.getAll('projects');
  return projects.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function createProject(name: string, type: ProjectType): Promise<Project> {
  const db = await getDB();
  const project: Project = {
    id: nanoid(),
    name,
    type,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    thumbnailBlobId: null,
    imageCount: 0,
  };
  await db.put('projects', project);
  return project;
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  const images = await db.getAllFromIndex('images', 'by-project', id);
  const tx = db.transaction(['images', 'blobs', 'projects'], 'readwrite');
  for (const image of images) {
    await tx.objectStore('blobs').delete(image.blobId);
    await tx.objectStore('images').delete(image.id);
  }
  await tx.objectStore('projects').delete(id);
  await tx.done;
}

export async function updateProject(project: Project): Promise<void> {
  const db = await getDB();
  await db.put('projects', project);
}

// ---- Images ----

export async function getImagesByProject(projectId: string): Promise<BoardImage[]> {
  const db = await getDB();
  return db.getAllFromIndex('images', 'by-project', projectId);
}

export async function storeImage(image: BoardImage): Promise<void> {
  const db = await getDB();
  await db.put('images', image);
}

export async function storeBlob(id: string, blob: Blob): Promise<void> {
  const db = await getDB();
  await db.put('blobs', { id, blob });
}

export async function deleteImage(imageId: string, blobId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['images', 'blobs'], 'readwrite');
  await tx.objectStore('images').delete(imageId);
  await tx.objectStore('blobs').delete(blobId);
  await tx.done;
}

export async function updateImagePosition(imageId: string, x: number, y: number): Promise<void> {
  const db = await getDB();
  const image = await db.get('images', imageId);
  if (image) {
    image.x = x;
    image.y = y;
    await db.put('images', image);
  }
}

export async function updateImageLabel(imageId: string, label: string): Promise<void> {
  const db = await getDB();
  const image = await db.get('images', imageId);
  if (image) {
    image.label = label;
    await db.put('images', image);
  }
}

export async function getBlob(blobId: string): Promise<Blob | null> {
  const db = await getDB();
  const record = await db.get('blobs', blobId);
  return record?.blob ?? null;
}
