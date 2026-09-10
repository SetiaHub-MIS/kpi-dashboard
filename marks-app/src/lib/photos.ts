import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

/**
 * Photo evidence on damage returns.
 *
 * Every photo is resized and recompressed on the device before it leaves.
 * Straight off a phone camera these are ~3 MB; across 38 outlets that is around
 * 670 MB a month and climbing. At 1280px and q0.6 it is nearer 200 KB, which
 * makes the whole feature affordable — so the compression is not a nicety, it
 * is the reason the feature can exist at all.
 *
 * The bucket refuses anything over 1 MB, so a future change that skips this
 * step fails loudly rather than quietly running up a bill.
 */

export const MAX_WIDTH = 1280;
export const QUALITY = 0.6;
export const MAX_PER_RETURN = 2;

const BUCKET = 'return-photos';

export type PickedPhoto = { uri: string; width: number; height: number };

/** Asks for the camera, then takes one. Null when declined or cancelled. */
export async function takePhoto(): Promise<PickedPhoto | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: 'images',
    // Full quality here, then compressed below: letting the camera compress
    // first and resizing after would throw away detail twice.
    quality: 1,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  const a = result.assets[0];
  return { uri: a.uri, width: a.width, height: a.height };
}

/** The same, from the gallery — for a photo taken before the app was opened. */
export async function pickPhoto(): Promise<PickedPhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    quality: 1,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  const a = result.assets[0];
  return { uri: a.uri, width: a.width, height: a.height };
}

/**
 * Resizes to at most MAX_WIDTH and recompresses as JPEG.
 *
 * Only ever scales down: a photo already narrower than the limit is left at its
 * own width rather than being blown up to meet it.
 */
export async function compress(photo: PickedPhoto): Promise<string> {
  // `ImageManipulator` here is the module object, not the package namespace —
  // the contextual API hangs off it. `manipulateAsync` is deprecated in SDK 57.
  const context = ImageManipulator.manipulate(photo.uri);
  if (photo.width > MAX_WIDTH) {
    // Width only: the height follows to preserve the ratio.
    context.resize({ width: MAX_WIDTH });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: QUALITY });
  return saved.uri;
}

/**
 * `${branch}/${ref}/${something unique}.jpg`.
 *
 * The leading folder is load-bearing: the storage policies read the branch out
 * of the path to decide who may fetch the file, so a photo filed under the
 * wrong branch would be visible to the wrong outlet.
 */
const pathFor = (branchId: string, ref: string) =>
  `${branchId}/${ref}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

export type UploadResult = { path: string };

/**
 * Compresses, uploads, and records the row that RLS actually governs.
 *
 * The row is written last: an object with no row is invisible to the app and
 * gets swept up by retention, where a row pointing at a file that never
 * arrived would render as a broken photo forever.
 */
export async function uploadReturnPhoto(input: {
  photo: PickedPhoto;
  branchId: string;
  ref: string;
  returnId: number;
  uploadedBy: string;
}): Promise<UploadResult> {
  const localUri = await compress(input.photo);
  const path = pathFor(input.branchId, input.ref);

  const response = await fetch(localUri);
  const body = await response.arrayBuffer();

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType: 'image/jpeg', upsert: false });

  if (uploadErr) throw uploadErr;

  const { error: rowErr } = await supabase.from('return_photos').insert({
    return_id: input.returnId,
    storage_path: path,
    uploaded_by: input.uploadedBy,
  });

  if (rowErr) {
    // The cap and the policies both live on the row, so a refusal here means
    // the file has no business being there either.
    await supabase.storage.from(BUCKET).remove([path]);
    throw rowErr;
  }

  return { path };
}

export type ReturnPhoto = {
  id: number;
  path: string;
  uploadedBy: string | null;
  uploadedAt: string;
};

export async function fetchReturnPhotos(returnId: number): Promise<ReturnPhoto[]> {
  const { data, error } = await supabase
    .from('return_photos')
    .select('id, storage_path, uploaded_by, uploaded_at')
    .eq('return_id', returnId)
    .order('uploaded_at');

  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    path: r.storage_path,
    uploadedBy: r.uploaded_by,
    uploadedAt: r.uploaded_at,
  }));
}

/**
 * A short-lived URL for a private object.
 *
 * The bucket is not public, so there is no permanent link to hand out — which
 * is the point: a damage photo can show a branch, a person, or a supplier's
 * goods, and none of that should sit behind a guessable address.
 */
export async function signedUrl(path: string, seconds = 600): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, seconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Removes a photo. The row's delete trigger takes the file with it. */
export async function deleteReturnPhoto(id: number): Promise<void> {
  const { error } = await supabase.from('return_photos').delete().eq('id', id);
  if (error) throw error;
}
