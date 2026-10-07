import { Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { OutletPicker } from '@/components/OutletPicker';
import { isHq } from '@/data/branches';
import { defaultMarksOutlet, marksOutletsFor, scopesMarksByOutlet } from '@/data/marksScope';
import { User } from '@/data/users';
import { selectOutlet } from '@/lib/hydrate';
import { useActiveBranches } from '@/store/useBranches';
import { useT } from '@/store/useLocale';
import { useMarks } from '@/store/useMarks';

/** The outlet in force: the one picked, else an Area Manager's home outlet. */
function useEffectiveOutlet(viewer: User | undefined): string | null {
  const picked = useMarks((s) => s.outlet);
  return picked ?? (viewer ? defaultMarksOutlet(viewer.role, viewer.branchId) : null);
}

/**
 * The people a marks screen shows, narrowed to the outlet whose marks are
 * loaded — for the Manager and Area Manager, who load one outlet at a time.
 * Anyone at another outlet would read as unmarked (their marks are not
 * loaded), so they are left out rather than shown wrong. Before the Manager
 * picks an outlet, nobody.
 */
export function useOutletScoped(viewer: User | undefined, people: User[]): User[] {
  const outlet = useEffectiveOutlet(viewer);
  if (!viewer || !scopesMarksByOutlet(viewer.role)) return people;
  return outlet ? people.filter((p) => p.branchId === outlet) : [];
}

/** True when the viewer must pick an outlet before any marks show. */
export function useNeedsOutlet(viewer: User | undefined): boolean {
  const outlet = useEffectiveOutlet(viewer);
  return viewer != null && scopesMarksByOutlet(viewer.role) && outlet == null;
}

/**
 * The outlet dropdown on the Manager's and Area Manager's marks screens. One
 * choice, shared by Ringkasan, Belum dinilai and Checklist SV; picking an
 * outlet loads that outlet's marks and nothing else. Hidden when there is
 * only one outlet to pick.
 */
export function MarksOutletPicker({ viewer }: { viewer: User | undefined }) {
  const outlet = useEffectiveOutlet(viewer);
  const loading = useMarks((s) => s.periodLoading);
  const allOutlets = useActiveBranches().filter((b) => !isHq(b.id)).map((b) => b.id);
  const outlets = marksOutletsFor(viewer, allOutlets);
  const t = useT();

  if (!viewer || !scopesMarksByOutlet(viewer.role) || outlets.length < 2) return null;

  return (
    <View className="mt-3">
      <OutletPicker
        outlets={outlets}
        value={outlet}
        placeholder={t('pilih_cawangan')}
        onChange={(id) => void selectOutlet(id)}
      />
      {loading && (
        <Text className="font-sans text-[11.5px] text-ink-5 mt-1.5">{t('memuatkan')}</Text>
      )}
    </View>
  );
}

/** Shown in place of the marks until the Manager picks an outlet. */
export function PickOutletPrompt() {
  const t = useT();
  return (
    <Card className="p-5 mt-3 items-center">
      <Text className="font-sans-med text-sm text-ink-3 text-center">{t('pilih_cawangan_markah')}</Text>
    </Card>
  );
}
