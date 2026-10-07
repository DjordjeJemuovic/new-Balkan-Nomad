'use client';

import { use, useEffect, useState } from 'react';
import { supabase } from '../../../../../src/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Image as ImageIcon, Loader2, Save, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { buildLocationItems, emptyLocationItemFormData, formatLegacyLocationItems, formatLocationItems, uploadLocationItemImages, type LocationItemFormData } from '../../../../../src/lib/location-items';
import { describeSupabaseError } from '../../../../../src/lib/supabase-error';
import LocationItemsEditor from '../../../../../src/components/location-items-editor';

const knownCategories = ['vidikovac', 'planina', 'jezero', 'vodopad'];

type LocationFormData = LocationItemFormData & {
  title: string;
  slug: string;
  short_description: string;
  description: string;
  category_id: string;
  country: string;
  region: string;
  best_time: string;
  difficulty: string;
  duration: string;
  elevation: string;
  warning: string;
  child_friendly: boolean;
  parking_available: boolean;
  pet_allowed: boolean;
};

type LocationRow = Record<string, any> & {
  id: string;
  cover_image: string | null;
  images: string[] | null;
  duration_text?: string | null;
  elevation_m?: number | null;
  warnings?: string[] | null;
  warning?: string | null;
};

const emptyFormData: LocationFormData = {
  title: '',
  slug: '',
  short_description: '',
  description: '',
  category_id: 'vidikovac',
  country: 'Srbija',
  region: '',
  best_time: '',
  difficulty: 'Lako',
  duration: '',
  elevation: '',
  warning: '',
  ...emptyLocationItemFormData,
  child_friendly: true,
  parking_available: false,
  pet_allowed: false,
};

export default function EditLocationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });
  const [locationId, setLocationId] = useState('');
  const [existingCoverImage, setExistingCoverImage] = useState('');
  const [existingGalleryImages, setExistingGalleryImages] = useState<string[]>([]);

  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [formData, setFormData] = useState<LocationFormData>(emptyFormData);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<FileList | null>(null);

  useEffect(() => {
    async function loadLocation() {
      setLoading(true);
      setMessage({ text: '', isError: false });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile?.role !== 'admin') {
        setMessage({ text: 'Nemate dozvolu za izmenu destinacija.', isError: true });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('slug', slug)
        .single<LocationRow>();

      if (error || !data) {
        setMessage({ text: `Destinacija nije pronađena: ${error?.message || slug}`, isError: true });
        setLoading(false);
        return;
      }

      const { data: locationItems, error: itemsError } = await supabase
        .from('location_items')
        .select('*')
        .eq('location_id', data.id)
        .order('sort_order');
      if (itemsError) {
        setMessage({ text: `Preporuke nisu učitane: ${describeSupabaseError(itemsError)}`, isError: true });
        setLoading(false);
        return;
      }
      const itemFields = locationItems?.length ? formatLocationItems(locationItems) : formatLegacyLocationItems(data);

      const categoryId = data.category_id || 'vidikovac';

      setLocationId(data.id);
      setExistingCoverImage(data.cover_image || '');
      setExistingGalleryImages(data.images || []);
      setFormData({
        title: data.title || '',
        slug: data.slug || '',
        short_description: data.short_description || '',
        description: data.description || '',
        category_id: knownCategories.includes(categoryId) ? categoryId : '',
        country: data.country || 'Srbija',
        region: data.region || '',
        best_time: data.best_time || '',
        difficulty: data.difficulty || 'Lako',
        duration: data.duration_text || '',
        elevation: data.elevation_m == null ? '' : String(data.elevation_m),
        warning: Array.isArray(data.warnings) ? data.warnings.join('\n') : '',
        ...itemFields,
        child_friendly: Boolean(data.child_friendly),
        parking_available: Boolean(data.parking_available),
        pet_allowed: Boolean(data.pet_allowed),
      });

      if (!knownCategories.includes(categoryId)) {
        setIsAddingNewCategory(true);
        setCustomCategory(categoryId);
      }

      setLoading(false);
    }

    loadLocation();
  }, [router, slug]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    const nextSlug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '');

    setFormData({ ...formData, title, slug: nextSlug });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'NEW_CATEGORY') {
      setIsAddingNewCategory(true);
      setFormData({ ...formData, category_id: '' });
      return;
    }

    setIsAddingNewCategory(false);
    setCustomCategory('');
    setFormData({ ...formData, category_id: value });
  };

  const uploadImage = async (file: File, folder: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

    const { error } = await supabase.storage
      .from('locations')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new Error(`Greska pri uploadu slike "${file.name}": ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('locations')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const removeGalleryImage = (imageUrl: string) => {
    setExistingGalleryImages(existingGalleryImages.filter((url) => url !== imageUrl));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', isError: false });

    const finalCategory = isAddingNewCategory
      ? customCategory.trim().toLowerCase().replace(/\s+/g, '-')
      : formData.category_id;

    if (!finalCategory) {
      setMessage({ text: 'Molimo unesite ili izaberite kategoriju.', isError: true });
      setSaving(false);
      return;
    }

    try {
      let coverImageUrl = existingCoverImage;
      const newGalleryUrls: string[] = [];

      if (coverFile) {
        coverImageUrl = await uploadImage(coverFile, 'covers');
      }

      if (galleryFiles && galleryFiles.length > 0) {
        for (let i = 0; i < galleryFiles.length; i++) {
          newGalleryUrls.push(await uploadImage(galleryFiles[i], 'gallery'));
        }
      }

      const { activities, attractions, accommodations, food, duration, elevation, warning, ...locationFields } = formData;
      const payload = {
        ...locationFields,
        category_id: finalCategory,
        difficulty: finalCategory === 'planina' ? formData.difficulty : null,
        duration_text: duration || null,
        elevation_m: elevation ? Number(elevation) : null,
        warnings: warning.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
        cover_image: coverImageUrl,
        images: [...existingGalleryImages, ...newGalleryUrls],
      };

      const { data: savedLocation, error } = await supabase
        .from('locations')
        .update(payload)
        .eq('id', locationId)
        .select('id,title')
        .maybeSingle();

      if (error) {
        setMessage({ text: `Greška pri izmeni destinacije: ${describeSupabaseError(error)}`, isError: true });
        return;
      }
      if (!savedLocation) {
        setMessage({ text: 'Supabase nije vratio izmenjeni red. UPDATE je verovatno blokiran RLS pravilom za locations ili ID lokacije ne odgovara nijednom redu.', isError: true });
        return;
      }
      if (savedLocation.title !== formData.title) {
        setMessage({ text: 'Promena nije upisana u bazu. Proveri da li trenutni korisnik ima admin dozvolu za izmenu lokacija.' , isError: true });
        return;
      }

      const { error: deleteItemsError } = await supabase.from('location_items').delete().eq('location_id', locationId);
      if (deleteItemsError) {
        setMessage({ text: `Destinacija je izmenjena, ali preporuke nisu sačuvane: ${describeSupabaseError(deleteItemsError)}`, isError: true });
        return;
      }
      const itemsForm = await uploadLocationItemImages({ activities, attractions, accommodations, food }, uploadImage);
      const items = buildLocationItems(itemsForm)
        .map((item) => ({ ...item, location_id: locationId }));
      if (items.length) {
        const { data: savedItems, error: itemsError } = await supabase.from('location_items').insert(items).select('latitude,longitude');
        if (itemsError) {
          setMessage({ text: `Destinacija je izmenjena, ali preporuke nisu sačuvane: ${describeSupabaseError(itemsError)}`, isError: true });
          return;
        }
        const expectedCoordinateItems = items.filter((item) => item.latitude != null && item.longitude != null).length;
        const savedCoordinateItems = (savedItems || []).filter((item) => item.latitude != null && item.longitude != null).length;
        if (savedCoordinateItems !== expectedCoordinateItems) {
          setMessage({ text: `Destinacija je izmenjena, ali koordinate za stavke nisu upisane. Poslato: ${expectedCoordinateItems}, sačuvano: ${savedCoordinateItems}.`, isError: true });
          return;
        }
      }

      setMessage({ text: 'Destinacija je uspešno izmenjena.', isError: false });
      setTimeout(() => {
        router.push(`/locations/${payload.slug}`);
        router.refresh();
      }, 900);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Doslo je do greske prilikom izmene destinacije.';
      setMessage({ text: errorMessage, isError: true });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-2xl bg-white px-4 py-12 text-center dark:bg-zinc-950 sm:px-6">
        <p className="text-sm font-medium text-gray-400 animate-pulse">Učitavanje destinacije za izmenu...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl bg-white px-4 py-6 pb-24 transition-colors duration-200 dark:bg-zinc-950 sm:px-6 sm:py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4 dark:border-zinc-800">
        <Link href={`/locations/${slug}`} className="flex items-center gap-2 text-sm text-gray-500 hover:text-zinc-800 dark:hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Nazad
        </Link>
        <h1 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white sm:text-xl">IZMENA DESTINACIJE</h1>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${message.isError ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
          {message.text}
        </div>
      )}

      {!message.isError || locationId ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4 bg-gray-50 dark:bg-zinc-900/50 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-zinc-900">
            <h3 className="text-sm font-bold text-[#006D44] uppercase tracking-wider">1. Osnovne informacije</h3>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-1">Naziv lokacije</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={handleTitleChange}
                className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-[#006D44] focus:outline-none dark:text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-1">Slug (URL)</label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-800 rounded-xl bg-gray-100 dark:bg-zinc-800/50 focus:outline-none dark:text-zinc-400 text-sm font-mono"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-1">Kategorija</label>
                {!isAddingNewCategory ? (
                  <select
                    value={formData.category_id}
                    onChange={handleCategoryChange}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 dark:text-white text-sm"
                  >
                    <option value="vidikovac">Vidikovac</option>
                    <option value="planina">Planina</option>
                    <option value="jezero">Jezero / Reka</option>
                    <option value="vodopad">Vodopad</option>
                    <option value="NEW_CATEGORY">Dodaj novu kategoriju...</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="flex-1 px-4 py-3 border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-[#006D44] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNewCategory(false);
                        setCustomCategory('');
                        setFormData({ ...formData, category_id: 'vidikovac' });
                      }}
                      className="px-3 text-xs font-medium text-gray-400 hover:text-zinc-600"
                    >
                      Otkaži
                    </button>
                  </div>
                )}
              </div>

              {((!isAddingNewCategory && formData.category_id === 'planina') || (isAddingNewCategory && customCategory.toLowerCase() === 'planina')) && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-1">Težina staze</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 dark:text-white text-sm"
                  >
                    <option value="Lako">Lako</option>
                    <option value="Srednje">Srednje</option>
                    <option value="Teško">Teško</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 bg-gray-50 dark:bg-zinc-900/50 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-zinc-900">
            <h3 className="text-sm font-bold text-[#006D44] uppercase tracking-wider">2. Geografija & Opisi</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-1">Država</label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-[#006D44] focus:outline-none"
                >
                  <option value="Srbija">Srbija</option>
                  <option value="Crna Gora">Crna Gora</option>
                  <option value="Bosna i Hercegovina">Bosna i Hercegovina</option>
                  <option value="Hrvatska">Hrvatska</option>
                  <option value="Severna Makedonija">Severna Makedonija</option>
                  <option value="Albanija">Albanija</option>
                  <option value="Slovenija">Slovenija</option>
                  <option value="Bugarska">Bugarska</option>
                  <option value="Grčka">Grčka</option>
                  <option value="Rumunija">Rumunija</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-1">Regija</label>
                <input
                  type="text"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-[#006D44] focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-1">Najbolje vreme za posetu</label>
              <input
                type="text"
                value={formData.best_time}
                onChange={(e) => setFormData({ ...formData, best_time: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 dark:text-white text-sm"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-zinc-400">Trajanje</label><input value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} placeholder="npr. 3–4 sata" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-white" /></div>
              <div><label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-zinc-400">Nadmorska visina (m)</label><input type="number" min="0" value={formData.elevation} onChange={(e) => setFormData({ ...formData, elevation: e.target.value })} placeholder="npr. 1800" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-white" /></div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-1">Kratak opis</label>
              <input
                type="text"
                value={formData.short_description}
                onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-1">Detaljan opis rute</label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 dark:text-white text-sm resize-none"
              />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-zinc-900 dark:bg-zinc-900/50 sm:p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#006D44]">Aktivnosti i preporuke</h3>
            <LocationItemsEditor value={{ activities: formData.activities, attractions: formData.attractions, accommodations: formData.accommodations, food: formData.food }} onChange={(items) => setFormData({ ...formData, ...items })} />
          </div>

          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 dark:border-orange-900/50 dark:bg-orange-950/20">
            <label className="mb-1 block text-xs font-semibold text-orange-800 dark:text-orange-300">Bezbednosno upozorenje</label>
            <textarea rows={2} value={formData.warning} onChange={(e) => setFormData({ ...formData, warning: e.target.value })} placeholder="npr. U okolini se mogu sresti medvedi; držite se obeleženih staza." className="w-full resize-y rounded-xl border border-orange-200 bg-white px-4 py-3 text-sm dark:border-orange-900 dark:bg-zinc-900 dark:text-white" />
          </div>

          <div className="space-y-4 bg-gray-50 dark:bg-zinc-900/50 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-zinc-900">
            <h3 className="text-sm font-bold text-[#006D44] uppercase tracking-wider">3. Fotografije destinacije</h3>

            {existingCoverImage && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-2">Trenutna cover slika</label>
                <img src={existingCoverImage} alt={formData.title} className="h-36 w-full object-cover rounded-xl border border-gray-100 dark:border-zinc-800" />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-2">Zameni cover sliku</label>
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-gray-200 border-dashed rounded-xl cursor-pointer bg-white dark:bg-zinc-900 hover:bg-gray-100/50 dark:border-zinc-800">
                <Upload className="w-6 h-6 text-gray-400 mb-2" />
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  {coverFile ? `Izabrano: ${coverFile.name}` : 'Klikni da izabereš novu glavnu sliku'}
                </p>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files ? e.target.files[0] : null)} />
              </label>
            </div>

            {existingGalleryImages.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-2">Trenutna galerija</label>
                <div className="grid grid-cols-3 gap-2">
                  {existingGalleryImages.map((imageUrl) => (
                    <div key={imageUrl} className="relative h-24 rounded-xl overflow-hidden border border-gray-100 dark:border-zinc-800">
                      <img src={imageUrl} alt="Galerija" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(imageUrl)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-white/90 dark:bg-zinc-950/90 text-red-500 shadow-sm"
                        aria-label="Ukloni sliku iz galerije"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-2">Dodaj slike u galeriju</label>
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-200 border-dashed rounded-xl cursor-pointer bg-white dark:bg-zinc-900 hover:bg-gray-100/50 dark:border-zinc-800">
                <ImageIcon className="w-5 h-5 text-gray-400 mb-1" />
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  {galleryFiles && galleryFiles.length > 0 ? `Izabrano fotografija: ${galleryFiles.length}` : 'Izaberi dodatne slike'}
                </p>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setGalleryFiles(e.target.files)} />
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-x-5 gap-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-zinc-900 dark:bg-zinc-900/50 sm:p-5">
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium dark:text-white">
              <input type="checkbox" checked={formData.child_friendly} onChange={(e) => setFormData({ ...formData, child_friendly: e.target.checked })} className="w-4 h-4 accent-[#006D44]" />
              Prilagođeno deci
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium dark:text-white">
              <input type="checkbox" checked={formData.parking_available} onChange={(e) => setFormData({ ...formData, parking_available: e.target.checked })} className="w-4 h-4 accent-[#006D44]" />
              Parking
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium dark:text-white">
              <input type="checkbox" checked={formData.pet_allowed} onChange={(e) => setFormData({ ...formData, pet_allowed: e.target.checked })} className="w-4 h-4 accent-[#006D44]" />
              Pet friendly
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 bg-[#006D44] hover:bg-[#004D30] text-white font-bold rounded-2xl transition duration-200 shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Čuvanje izmena...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" /> Sačuvaj izmene
              </>
            )}
          </button>
        </form>
      ) : null}
    </div>
  );
}
