import { parseOptionalCoordinate } from './coordinates';

export type LocationItemType = 'activity' | 'attraction' | 'venue';

export type LocationItemFormValue = {
  title: string;
  description: string;
  subtype?: string;
  image_url?: string;
  season?: string[];
  difficulty?: string;
  price_level?: number;
  distance_km?: number;
  latitude?: string;
  longitude?: string;
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
    ...form.activities.filter((item) => item.title.trim()).slice(0, 5).map((item) => ({ ...item, type: 'activity' as const })),
    ...form.attractions.filter((item) => item.title.trim()).slice(0, 5).map((item) => ({ ...item, type: 'attraction' as const })),
    ...form.accommodations.filter((item) => item.title.trim()).slice(0, 5).map((item) => ({ ...item, type: 'venue' as const, subtype: 'accommodation' })),
    ...form.food.filter((item) => item.title.trim()).slice(0, 5).map((item) => ({ ...item, type: 'venue' as const, subtype: 'food' })),
  ];
  return rows.map((row, sort_order) => ({
    ...row,
    title: row.title.trim(),
    description: row.description.trim() || null,
    latitude: parseOptionalCoordinate(row.latitude, 'Latitude', -90, 90),
    longitude: parseOptionalCoordinate(row.longitude, 'Longitude', -180, 180),
    sort_order,
  }));
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
    latitude: typeof row.latitude === 'number' ? String(row.latitude) : undefined,
    longitude: typeof row.longitude === 'number' ? String(row.longitude) : undefined,
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
