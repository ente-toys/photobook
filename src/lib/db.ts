import localforage from "localforage";
import type { BookState, Photo } from "./types";

const photoBlobStore = localforage.createInstance({
  name: "ente-photobook",
  storeName: "photo_blobs",
});

const thumbnailStore = localforage.createInstance({
  name: "ente-photobook",
  storeName: "thumbnails",
});

const previewStore = localforage.createInstance({
  name: "ente-photobook",
  storeName: "previews",
});

const metaStore = localforage.createInstance({
  name: "ente-photobook",
  storeName: "metadata",
});

export async function savePhotoBlob(id: string, blob: Blob): Promise<void> {
  await photoBlobStore.setItem(id, blob);
}

export async function getPhotoBlob(id: string): Promise<Blob | null> {
  return photoBlobStore.getItem<Blob>(id);
}

export async function saveThumbnail(id: string, blob: Blob): Promise<void> {
  await thumbnailStore.setItem(id, blob);
}

export async function getThumbnail(id: string): Promise<Blob | null> {
  return thumbnailStore.getItem<Blob>(id);
}

export async function savePreview(id: string, blob: Blob): Promise<void> {
  await previewStore.setItem(id, blob);
}

export async function getPreview(id: string): Promise<Blob | null> {
  return previewStore.getItem<Blob>(id);
}

export async function saveBookState(state: BookState): Promise<void> {
  await metaStore.setItem("bookState", state);
}

export async function getBookState(): Promise<BookState | null> {
  return metaStore.getItem<BookState>("bookState");
}

export async function savePhotos(photos: Photo[]): Promise<void> {
  await metaStore.setItem("photos", photos);
}

export async function getPhotos(): Promise<Photo[] | null> {
  return metaStore.getItem<Photo[]>("photos");
}

export async function saveAppView(view: string): Promise<void> {
  await metaStore.setItem("appView", view);
}

export async function getAppView(): Promise<string | null> {
  return metaStore.getItem<string>("appView");
}

export async function clearAll(): Promise<void> {
  await Promise.all([
    photoBlobStore.clear(),
    thumbnailStore.clear(),
    previewStore.clear(),
    metaStore.clear(),
  ]);
}
