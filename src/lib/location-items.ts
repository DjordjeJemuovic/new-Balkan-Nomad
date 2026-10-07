export type LocationItemType = 'activity' | 'attraction' | 'venue';

export type LocationItemFormValue = {
  title: string;
  description: string;
  subtype?: string;
  image_url?: string;
  image_file?: File;
  season?: string[];
  difficulty?: string;
  price_level?: number;
  distance_km?: number;
};

export type LocationItemGroup = 'activities' | 'attractions' | 'accommodations' | 'food';

export type LocationItemFormData = Record<LocationItemGroup, LocationItemFormValue[]>;

export const emptyLocationItemFormData: LocationItemFormData = {
  activities: [],
  attractions: [],
  accommodations: [],
  food: [],
};

export function buildLocationItems(form: LocationItemFormData) {
  const rows = [
    ...form.activities.filter((item) => item.title.trim()).slice(0, 5).map(({ image_file, ...item }) => ({ ...item, type: 'activity' as const })),
    ...form.attractions.filter((item) => item.title.trim()).slice(0, 5).map(({ image_file, ...item }) => ({ ...item, type: 'attraction' as const })),
    ...form.accommodations.filter((item) => item.title.trim()).slice(0, 5).map(({ image_file, ...item }) => ({ ...item, type: 'venue' as const, subtype: 'accommodation' })),
    ...form.food.filter((item) => item.title.trim()).slice(0, 5).map(({ image_file, ...item }) => ({ ...item, type: 'venue' as const, subtype: 'food' })),
  ];
  return rows.map((row, sort_order) => ({
    ...row,
    title: row.title.trim(),
    description: row.description.trim() || null,
    sort_order,
  }));
}

export async function uploadLocationItemImages(
  form: LocationItemFormData,
  uploadImage: (file: File, folder: string) => Promise<string>,
): Promise<LocationItemFormData> {
  const groups = Object.keys(form) as LocationItemGroup[];
  const entries = await Promise.all(groups.map(async (group) => [
    group,
    await Promise.all(form[group].map(async (item) => item.image_file
      ? { ...item, image_url: await uploadImage(item.image_file, 'items'), image_file: undefined }
      : item)),
  ] as const));
  return Object.fromEntries(entries) as LocationItemFormData;
}

function asFormItem(row: Record<string, unknown>, description?: string): LocationItemFormValue | null {
  if (typeof row.title !== 'string' || !row.title.trim()) return null;
  return {
    title: row.title,
    description: description ?? (typeof row.description === 'string' ? row.description : ''),
    subtype: typeof row.subtype === 'string' ? row.subtype : undefined,
    image_url: typeof row.image_url === 'string' ? row.image_url : undefined,
    season: Array.isArray(row.season) ? row.season.filter((value): value is string => typeof value === 'string') : undefined,
    difficulty: typeof row.difficulty === 'string' ? row.difficulty : undefined,
    price_level: typeof row.price_level === 'number' ? row.price_level : undefined,
    distance_km: typeof row.distance_km === 'number' ? row.distance_km : undefined,
  };
}

export function formatLocationItems(rows: Array<Record<string, unknown>>): LocationItemFormData {
  const activities = rows.filter((row) => row.type === 'activity').map((row) => asFormItem(row)).filter((item): item is LocationItemFormValue => item !== null).slice(0, 5);
  // Earlier entries sometimes stored a long activity description as the next row's title.
  for (let index = 1; index < activities.length; index++) {
    const current = activities[index];
    const previous = activities[index - 1];
    if (!current.description && current.title.length > 80 && !previous.description) {
      previous.description = current.title;
      activities.splice(index, 1);
      index--;
    }
  }

  const venues = rows.filter((row) => row.type === 'venue');
  const accommodations = venues.map((row) => {
    const description = typeof row.description === 'string' ? row.description : '';
    const legacyDescription = description.startsWith('[smeštaj]');
    if (row.subtype !== 'accommodation' && !legacyDescription) return null;
    return asFormItem(row, legacyDescription ? description.replace(/^\[smeštaj\]\s*/, '') : undefined);
  }).filter((item): item is LocationItemFormValue => item !== null).slice(0, 5);
  const food = venues.map((row) => {
    const description = typeof row.description === 'string' ? row.description : '';
    const legacyDescription = description.startsWith('[hrana]');
    if (row.subtype !== 'food' && !legacyDescription) return null;
    return asFormItem(row, legacyDescription ? description.replace(/^\[hrana\]\s*/, '') : undefined);
  }).filter((item): item is LocationItemFormValue => item !== null).slice(0, 5);

  return {
    activities,
    attractions: rows.filter((row) => row.type === 'attraction').map((row) => asFormItem(row)).filter((item): item is LocationItemFormValue => item !== null).slice(0, 5),
    accommodations,
    food,
  };
}

export function formatLegacyLocationItems(value: unknown): LocationItemFormData {
  const location = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const rows: Array<Record<string, unknown>> = [];
  const addRows = (items: unknown, type: LocationItemType, subtype?: string) => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const card = item as Record<string, unknown>;
      rows.push({
        ...card,
        image_url: typeof card.image_url === 'string' ? card.image_url : card.image,
        type,
        subtype,
      });
    }
  };

  addRows(location.activities, 'activity');
  addRows(location.attractions ?? location.sights, 'attraction');
  addRows(location.accommodations ?? location.stays, 'venue', 'accommodation');
  addRows(location.food ?? location.restaurants, 'venue', 'food');
  return formatLocationItems(rows);
}
