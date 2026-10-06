'use client';

import type { LocationItemFormData, LocationItemGroup, LocationItemFormValue } from '../lib/location-items';

const sections: Array<{ key: LocationItemGroup; label: string; singular: string; description: string }> = [
  { key: 'activities', label: 'Aktivnosti', singular: 'aktivnost', description: 'Unesi naziv i kratak opis svake aktivnosti.' },
  { key: 'attractions', label: 'Prirodne lepote', singular: 'prirodnu lepotu', description: 'Unesi naziv i opis svake prirodne lepote ili znamenitosti.' },
  { key: 'food', label: 'Hrana i piće', singular: 'lokaciju za hranu ili piće', description: 'Unesi naziv i opis svakog mesta za hranu ili piće.' },
  { key: 'accommodations', label: 'Smeštaj', singular: 'mesto za smeštaj', description: 'Unesi naziv i opis svake lokacije za smeštaj.' },
];

type Props = {
  value: LocationItemFormData;
  onChange: (next: LocationItemFormData) => void;
};

export default function LocationItemsEditor({ value, onChange }: Props) {
  const updateItem = (group: LocationItemGroup, index: number, patch: Partial<LocationItemFormValue>) => {
    onChange({ ...value, [group]: value[group].map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) });
  };

  const addItem = (group: LocationItemGroup) => {
    onChange({ ...value, [group]: [...value[group], { title: '', description: '' }] });
  };

  const removeItem = (group: LocationItemGroup, index: number) => {
    onChange({ ...value, [group]: value[group].filter((_, itemIndex) => itemIndex !== index) });
  };

  return <div className="space-y-6">
    {sections.map((section) => {
      const items = value[section.key];
      return <section key={section.key} className="space-y-3 border-b border-gray-200 pb-5 last:border-0 dark:border-zinc-800">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{section.label}</h4>
            <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">{section.description}</p>
          </div>
          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs text-gray-500 dark:bg-zinc-800 dark:text-zinc-400">{items.length}/5</span>
        </div>

        {items.map((item, index) => <div key={`${section.key}-${index}`} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{section.label} {index + 1}</span>
            <button type="button" onClick={() => removeItem(section.key, index)} className="text-xs font-medium text-red-500 hover:text-red-600">Ukloni</button>
          </div>
          <input type="text" required value={item.title} onChange={(event) => updateItem(section.key, index, { title: event.target.value })} placeholder="Naslov" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-white" />
          <textarea required rows={3} value={item.description} onChange={(event) => updateItem(section.key, index, { description: event.target.value })} placeholder="Opis" className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white" />
        </div>)}

        {items.length < 5 && <button type="button" onClick={() => addItem(section.key)} className="rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-[#006D44] hover:bg-emerald-50 dark:border-zinc-700 dark:hover:bg-emerald-950/20">+ Dodaj {section.singular}</button>}
      </section>;
    })}
  </div>;
}
