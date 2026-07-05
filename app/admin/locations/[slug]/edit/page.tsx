'use client';

import { use, useEffect, useState } from 'react';
import { supabase } from '../../../../../src/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Image as ImageIcon, Loader2, Save, Upload, X } from 'lucide-react';
import Link from 'next/link';

const knownCategories = ['vidikovac', 'planina', 'jezero', 'vodopad'];

type LocationFormData = {
  title: string;
  slug: string;
  short_description: string;
  description: string;
  category_id: string;
  country: string;
  region: string;
  best_time: string;
  difficulty: string;
  child_friendly: boolean;
  parking_available: boolean;
  pet_allowed: boolean;
};

type LocationRow = LocationFormData & {
  id: string;
  cover_image: string | null;
  images: string[] | null;
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

      const payload = {
        ...formData,
        category_id: finalCategory,
        difficulty: finalCategory === 'planina' ? formData.difficulty : null,
        cover_image: coverImageUrl,
        images: [...existingGalleryImages, ...newGalleryUrls],
      };

      const { error } = await supabase
        .from('locations')
        .update(payload)
        .eq('id', locationId);

      if (error) {
        setMessage({ text: `Greska pri izmeni destinacije: ${error.message}`, isError: true });
        return;
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
      <div className="max-w-2xl mx-auto min-h-screen bg-white dark:bg-zinc-950 px-6 py-12 text-center">
        <p className="text-sm font-medium text-gray-400 animate-pulse">Učitavanje destinacije za izmenu...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-white dark:bg-zinc-950 px-6 py-8 pb-24 transition-colors duration-200">
      <div className="flex items-center justify-between mb-8 border-b border-gray-100 dark:border-zinc-800 pb-4">
        <Link href={`/locations/${slug}`} className="flex items-center gap-2 text-sm text-gray-500 hover:text-zinc-800 dark:hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Nazad
        </Link>
        <h1 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">IZMENA DESTINACIJE</h1>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${message.isError ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
          {message.text}
        </div>
      )}

      {!message.isError || locationId ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4 bg-gray-50 dark:bg-zinc-900/50 p-5 rounded-2xl border border-gray-100 dark:border-zinc-900">
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

          <div className="space-y-4 bg-gray-50 dark:bg-zinc-900/50 p-5 rounded-2xl border border-gray-100 dark:border-zinc-900">
            <h3 className="text-sm font-bold text-[#006D44] uppercase tracking-wider">2. Geografija & Opisi</h3>
            <div className="grid grid-cols-2 gap-4">
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

          <div className="space-y-4 bg-gray-50 dark:bg-zinc-900/50 p-5 rounded-2xl border border-gray-100 dark:border-zinc-900">
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

          <div className="bg-gray-50 dark:bg-zinc-900/50 p-5 rounded-2xl border border-gray-100 dark:border-zinc-900 flex justify-between items-center gap-4">
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
