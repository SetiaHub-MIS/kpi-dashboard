import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { MonoLabel } from '@/components/Card';
import {
  MAX_PER_RETURN,
  ReturnPhoto,
  deleteReturnPhoto,
  fetchReturnPhotos,
  pickPhoto,
  signedUrl,
  takePhoto,
  uploadReturnPhoto,
} from '@/lib/photos';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useT } from '@/store/useLocale';
import { C } from '@/theme/scoring';

/**
 * Evidence on a damage return: what the goods actually looked like.
 *
 * Two per bill, resized and compressed before upload. Shown only on damage
 * bills — an expired stock return is a date on a label, and a photo of it
 * proves nothing worth the storage.
 */
export function ReturnPhotos({
  returnId,
  ref: returnRef,
  branchId,
  canEdit,
  uploadedBy,
}: {
  /** returns.id, or null when this bill has not reached Postgres yet. */
  returnId: number | null;
  ref: string;
  branchId: string;
  canEdit: boolean;
  uploadedBy: string | undefined;
}) {
  const [photos, setPhotos] = useState<ReturnPhoto[]>([]);
  const [urls, setUrls] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  useEffect(() => {
    if (!isSupabaseConfigured || returnId == null) return;
    let live = true;
    fetchReturnPhotos(returnId)
      .then(async (rows) => {
        if (!live) return;
        setPhotos(rows);
        // Private bucket, so each thumbnail needs its own short-lived URL.
        const pairs = await Promise.all(
          rows.map(async (p) => [p.id, await signedUrl(p.path)] as const)
        );
        if (!live) return;
        setUrls(Object.fromEntries(pairs.filter(([, u]) => u) as [number, string][]));
      })
      .catch(() => {
        // A role with no access to this bill has none to its evidence either.
      });
    return () => {
      live = false;
    };
  }, [returnId]);

  if (!isSupabaseConfigured || returnId == null) return null;

  const add = async (source: 'camera' | 'library') => {
    setError(null);
    const picked = source === 'camera' ? await takePhoto() : await pickPhoto();
    if (!picked || !uploadedBy) return;

    setBusy(true);
    try {
      await uploadReturnPhoto({ photo: picked, branchId, ref: returnRef, returnId, uploadedBy });
      const rows = await fetchReturnPhotos(returnId);
      setPhotos(rows);
      const pairs = await Promise.all(
        rows.map(async (p) => [p.id, await signedUrl(p.path)] as const)
      );
      setUrls(Object.fromEntries(pairs.filter(([, u]) => u) as [number, string][]));
    } catch (e: any) {
      setError(e?.message ?? t('gambar_gagal_naik'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    setBusy(true);
    try {
      await deleteReturnPhoto(id);
      setPhotos((p) => p.filter((x) => x.id !== id));
    } catch (e: any) {
      setError(e?.message ?? t('gambar_gagal_buang'));
    } finally {
      setBusy(false);
    }
  };

  const full = photos.length >= MAX_PER_RETURN;

  return (
    <View className="bg-card border border-line rounded-[13px] p-[15px] mt-2.5">
      <View className="flex-row items-center justify-between">
        <MonoLabel>{t('gambar_bukti')}</MonoLabel>
        <Text className="font-mono text-[10px] text-ink-6">
          {photos.length}/{MAX_PER_RETURN}
        </Text>
      </View>

      {photos.length === 0 ? (
        <Text className="font-sans text-[12.5px] leading-[19px] text-ink-4 mt-2">
          {t('gambar_bukti_hint')}
        </Text>
      ) : (
        <View className="flex-row gap-2 mt-3">
          {photos.map((p) => (
            <View key={p.id} className="flex-1">
              {urls[p.id] ? (
                <Image
                  source={{ uri: urls[p.id] }}
                  className="w-full rounded-[10px]"
                  style={{ height: 104 }}
                  resizeMode="cover"
                  accessibilityLabel={t('gambar_bukti_a11y')}
                />
              ) : (
                <View
                  className="w-full rounded-[10px] items-center justify-center"
                  style={{ height: 104, backgroundColor: C.rule }}
                >
                  <ActivityIndicator color={C.ink6} />
                </View>
              )}
              {canEdit && (
                <Pressable
                  onPress={() => void remove(p.id)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={t('buang_gambar_a11y')}
                  className="self-start mt-1.5 px-2 py-1 rounded-md border"
                  style={{ borderColor: C.line }}
                >
                  <Text className="font-mono text-[10px] text-ink-5">{t('buang')}</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}

      {canEdit && !full && (
        <View className="flex-row gap-2 mt-3">
          <Pressable
            onPress={() => void add('camera')}
            disabled={busy}
            accessibilityRole="button"
            className="flex-1 py-2.5 rounded-lg bg-ink items-center active:opacity-80"
            style={{ opacity: busy ? 0.6 : 1 }}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="font-sans-semi text-[12.5px] text-white">{t('ambil_gambar')}</Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => void add('library')}
            disabled={busy}
            accessibilityRole="button"
            className="px-3.5 py-2.5 rounded-lg border border-line items-center active:opacity-70"
          >
            <Text className="font-sans-med text-[12.5px] text-ink-3">{t('galeri')}</Text>
          </Pressable>
        </View>
      )}

      {error && (
        <Text className="font-sans text-[12px] leading-[18px] mt-2.5" style={{ color: C.fail }}>
          {error}
        </Text>
      )}
    </View>
  );
}
