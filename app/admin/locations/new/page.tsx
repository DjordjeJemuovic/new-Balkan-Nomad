'use client';

import { useState } from 'react';
import { supabase } from '../../../../src/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, Upload, Image as ImageIcon, Plus } from 'lucide-react';
import Link from 'next/link';

export default function NewLocationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });

  // Stanje za upravljanje dinamičkim dodavanjem nove kategorije
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  // Stanje za formu
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    short_description: '',
    description: '',
    category_id: 'vidikovac', // default
    country: 'Srbija',
    region: '',
    best_time: '',
    difficulty: 'Lako',
    child_friendly: true,
    parking_available: false,
    pet_allowed: false,
  });

  // Stanje za fajlove
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<FileList | null>(null);

  // Automatsko generisanje sluga
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '');

    setFormData({ ...formData, title, slug });
  };

  // Upravljanje promenom kategorije
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'NEW_CATEGORY') {
      setIsAddingNewCategory(true);
      setFormData({ ...formData, category_id: '' }); // Resetujemo dok ne unese novu
    } else {
      setIsAddingNewCategory(false);
      setFormData({ ...formData, category_id: value });
    }
  };

  const uploadImage = async (file: File, folder: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('locations')
      .upload(fileName, file);

    if (error) {
      console.error('Storage upload greška:', error.message);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('locations')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', isError: false });

    // Konačna kategorija zavisi od toga da li je kucana custom ili izabrana postojeća
    const finalCategory = isAddingNewCategory 
      ? customCategory.trim().toLowerCase().replace(/\s+/g, '-') 
      : formData.category_id;

    if (!finalCategory) {
      setMessage({ text: 'Molimo unesite ili izaberite kategoriju.', isError: true });
      setLoading(false);
      return;
    }

    // Težina staze se šalje samo ako je kategorija "planina", inače stavljamo null u bazu
    const finalDifficulty = finalCategory === 'planina' ? formData.difficulty : null;

    try {
      let coverImageUrl = '';
      let galleryUrls: string[] = [];

      if (coverFile) {
        const url = await uploadImage(coverFile, 'covers');
        if (url) coverImageUrl = url;
      }

      if (galleryFiles && galleryFiles.length > 0) {
        for (let i = 0; i < galleryFiles.length; i++) {
          const url = await uploadImage(galleryFiles[i], 'gallery');
          if (url) galleryUrls.push(url);
        }
      }

      const payload = {
        ...formData,
        category_id: finalCategory,
        difficulty: finalDifficulty, // Uslovno mapirano
        cover_image: coverImageUrl,
        images: galleryUrls,
      };

      const { error } = await supabase.from('locations').insert([payload]);

      if (error) {
        setMessage({ text: `Greška pri upisu u bazu: ${error.message}`, isError: true });
      } else {
        setMessage({ text: 'Lokacija uspešno sačuvana!', isError: false });
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 1500);
      }
    } catch (err) {
      setMessage({ text: 'Došlo je do greške prilikom obrade podataka.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-white dark:bg-zinc-950 px-6 py-8 pb-24 transition-colors duration-200">
      
      <div className="flex items-center justify-between mb-8 border-b border-gray-100 dark:border-zinc-800 pb-4">
        <Link href="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-zinc-800 dark:hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Nazad
        </Link>
        <h1 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">NOVA DESTINACIJA</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* SEKCIJA 1: Osnovne informacije */}
        <div className="space-y-4 bg-gray-50 dark:bg-zinc-900/50 p-5 rounded-2xl border border-gray-100 dark:border-zinc-900">
          <h3 className="text-sm font-bold text-[#006D44] uppercase tracking-wider">1. Osnovne informacije</h3>
          
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-1">Naziv lokacije</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={handleTitleChange}
              placeholder="npr. Vidikovac Banjska Stena"
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
            {/* Kategorija sa opcijom za novu */}
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
                  <option value="NEW_CATEGORY">➕ Dodaj novu kategoriju...</option>
                </select>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Unesi naziv nove kategorije"
                    className="flex-1 px-4 py-3 border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-[#006D44] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNewCategory(false);
                      setFormData({ ...formData, category_id: 'vidikovac' });
                    }}
                    className="px-3 text-xs font-medium text-gray-400 hover:text-zinc-600"
                  >
                    Otkaži
                  </button>
                </div>
              )}
            </div>

            {/* 🛑 TEŽINA STAZE: Prikazuje se SAMO ako je odabrana kategorija "planina" */}
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

        {/* SEKCIJA 2: Geografija i Opisi */}
        <div className="space-y-4 bg-gray-50 dark:bg-zinc-900/50 p-5 rounded-2xl border border-gray-100 dark:border-zinc-900">
          <h3 className="text-sm font-bold text-[#006D44] uppercase tracking-wider">2. Geografija & Opisi</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-1">Regija</label>
              <input
                type="text"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                placeholder="npr. Zapadna Srbija"
                className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-1">Najbolje vreme</label>
              <input
                type="text"
                value={formData.best_time}
                onChange={(e) => setFormData({ ...formData, best_time: e.target.value })}
                placeholder="npr. Proleće, Leto"
                className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 dark:text-white text-sm"
              />
            </div>
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
            <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-1">Detaljan opis</label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 dark:text-white text-sm resize-none"
            />
          </div>
        </div>

        {/* SEKCIJA 3: Slike */}
        <div className="space-y-4 bg-gray-50 dark:bg-zinc-900/50 p-5 rounded-2xl border border-gray-100 dark:border-zinc-900">
          <h3 className="text-sm font-bold text-[#006D44] uppercase tracking-wider">3. Fotografije destinacije</h3>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-2">Glavna (Cover) slika</label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-200 border-dashed rounded-xl cursor-pointer bg-white dark:bg-zinc-900 hover:bg-gray-100/50 dark:border-zinc-800">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-6 h-6 text-gray-400 mb-2" />
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    {coverFile ? `Izabrano: ${coverFile.name}` : 'Klikni da izabereš glavnu sliku'}
                  </p>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files ? e.target.files[0] : null)} />
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-2">Ostale slike za galeriju</label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-200 border-dashed rounded-xl cursor-pointer bg-white dark:bg-zinc-900 hover:bg-gray-100/50 dark:border-zinc-800">
                <div className="flex flex-col items-center justify-center pt-3 pb-4">
                  <ImageIcon className="w-5 h-5 text-gray-400 mb-1" />
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    {galleryFiles && galleryFiles.length > 0 ? `Izabrano fotografija: ${galleryFiles.length}` : 'Izaberi dodatne slike'}
                  </p>
                </div>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setGalleryFiles(e.target.files)} />
              </label>
            </div>
          </div>
        </div>

        {/* SEKCIJA 4: Checkbox-ovi */}
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

        {message.text && (
          <div className={`p-4 rounded-xl text-sm font-medium ${message.isError ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-[#006D44] hover:bg-[#004D30] text-white font-bold rounded-2xl transition duration-200 shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Čuvanje...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" /> Sačuvaj destinaciju
            </>
          )}
        </button>

      </form>
    </div>
  );
}