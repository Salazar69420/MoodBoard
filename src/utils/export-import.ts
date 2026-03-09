import { getDB } from './db';
import { nanoid } from 'nanoid';
import type { Project, BoardImage, Connection, TextNode, CategoryNote, EditNote, PromptNode } from '../types';

export interface ExportedProject {
    version: number;
    project: Project;
    thumbnailBase64: string | null;
    images: Array<{
        image: BoardImage;
        base64: string;
    }>;
    connections: Connection[];
    textNodes: TextNode[];
    categoryNotes: CategoryNote[];
    editNotes: EditNote[];
    promptNodes: PromptNode[];
}

export async function exportProject(projectId: string) {
    const db = await getDB();
    const project = await db.get('projects', projectId);
    if (!project) throw new Error('Project not found');

    const images = await db.getAllFromIndex('images', 'by-project', projectId);
    const connections = await db.getAllFromIndex('connections', 'by-project', projectId);
    const textNodes = await db.getAllFromIndex('textNodes', 'by-project', projectId);
    const categoryNotes = await db.getAllFromIndex('categoryNotes', 'by-project', projectId);
    const editNotes = await db.getAllFromIndex('editNotes', 'by-project', projectId);
    const promptNodes = await db.getAllFromIndex('promptNodes', 'by-project', projectId);

    const getBase64 = async (blobId: string | null) => {
        if (!blobId) return null;
        const record = await db.get('blobs', blobId);
        if (!record?.blob) return null;
        return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1] || ''); // just base64 data
            };
            reader.readAsDataURL(record.blob);
        });
    };

    const thumbnailBase64 = await getBase64(project.thumbnailBlobId);

    const imagesWithBlobs = await Promise.all(
        images.map(async (img) => {
            const base64 = await getBase64(img.blobId);
            return {
                image: img,
                base64: base64 || '',
            };
        })
    );

    const exportedData: ExportedProject = {
        version: 1,
        project,
        thumbnailBase64,
        images: imagesWithBlobs,
        connections,
        textNodes,
        categoryNotes,
        editNotes,
        promptNodes,
    };

    const json = JSON.stringify(exportedData);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function base64ToBlob(base64: string, mimeType: string = 'image/jpeg'): Blob {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: mimeType });
}

export async function importProject(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                const data: ExportedProject = JSON.parse(text);

                if (data.version !== 1) {
                    throw new Error('Unsupported project version');
                }

                const db = await getDB();
                const newProjectId = nanoid();

                // Mapping IDs to prevent collisions
                const idMap = new Map<string, string>();
                const getNewId = (oldId: string) => {
                    if (!idMap.has(oldId)) idMap.set(oldId, nanoid());
                    return idMap.get(oldId)!;
                };

                let thumbnailBlobId: string | null = null;
                if (data.thumbnailBase64) {
                    thumbnailBlobId = nanoid();
                    await db.put('blobs', { id: thumbnailBlobId, blob: base64ToBlob(data.thumbnailBase64) });
                }

                const newProject: Project = {
                    ...data.project,
                    id: newProjectId,
                    thumbnailBlobId,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };
                await db.put('projects', newProject);

                // Images
                for (const item of data.images) {
                    const newImageId = getNewId(item.image.id);
                    const newBlobId = nanoid();
                    await db.put('blobs', { id: newBlobId, blob: base64ToBlob(item.base64, item.image.mimeType) });

                    const newImage: BoardImage = {
                        ...item.image,
                        id: newImageId,
                        projectId: newProjectId,
                        blobId: newBlobId,
                    };
                    await db.put('images', newImage);
                }

                // Connections
                for (const item of (data.connections || [])) {
                    await db.put('connections', {
                        ...item,
                        id: getNewId(item.id),
                        projectId: newProjectId,
                        fromId: idMap.get(item.fromId) || item.fromId, // fallback to old ID if it's text node, we also remap text node ids
                        toId: idMap.get(item.toId) || item.toId,
                    });
                }

                for (const item of (data.textNodes || [])) {
                    await db.put('textNodes', {
                        ...item,
                        id: getNewId(item.id),
                        projectId: newProjectId,
                    });
                }

                // Update text node connections
                const connections = await db.getAllFromIndex('connections', 'by-project', newProjectId);
                for (const item of connections) {
                    let updated = false;
                    if (idMap.has(item.fromId) && item.fromId !== idMap.get(item.fromId)) {
                        item.fromId = idMap.get(item.fromId)!;
                        updated = true;
                    }
                    if (idMap.has(item.toId) && item.toId !== idMap.get(item.toId)) {
                        item.toId = idMap.get(item.toId)!;
                        updated = true;
                    }
                    if (updated) {
                        await db.put('connections', item);
                    }
                }


                for (const item of (data.categoryNotes || [])) {
                    await db.put('categoryNotes', {
                        ...item,
                        id: nanoid(),
                        projectId: newProjectId,
                        imageId: idMap.get(item.imageId) || item.imageId,
                    });
                }

                for (const item of (data.editNotes || [])) {
                    await db.put('editNotes', {
                        ...item,
                        id: nanoid(),
                        projectId: newProjectId,
                        imageId: idMap.get(item.imageId) || item.imageId,
                    });
                }

                for (const item of (data.promptNodes || [])) {
                    await db.put('promptNodes', {
                        ...item,
                        id: nanoid(),
                        projectId: newProjectId,
                        imageId: idMap.get(item.imageId) || item.imageId,
                    });
                }

                resolve(newProjectId);
            } catch (err) {
                console.error(err);
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}
