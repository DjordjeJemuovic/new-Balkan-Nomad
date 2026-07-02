'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase'; // Proveri da li ti je ovde putanja do klijenta
import { Mountain, Compass, Droplet, Waves, Snowflake, Check, ArrowRight } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function NewLocationPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State - Osnovne informacije
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [region, setRegion] = useState('');
  const [bestTime, setBestTime] = useState('');

  // Form State - Brze informacije (Prekidači sa slike)
  const [difficulty, setDifficulty] = useState('Lako');
  const [childFriendly, setChildFriendly] = useState(false);
  const [parkingAvailable, setParkingAvailable] = useState(false);
  const [petsAllowed, setPetsAllowed] = useState(false);
  const [wifiAvailable, setWifiAvailable] = useState('Nema');

  // Povlačenje kategorija iz baze
  useEffect(() => {
    async function fetchCategories() {
      const { data, error } = await supabase.from('categories').select('id, name, slug');
      if (data) setCategories(data);
    }
    fetchCategories();
  }, []);

  const steps = [
    { id: 1, name: 'Osnovno' },
    { id: 2, name: 'Lokacija' },
    { id: 3, name: 'Mediji' },
    { id: 4, name: 'Pregled' },
  ];

  return (
    <div className="max-w-xl mx-auto min-h-screen bg-white dark:bg-zinc-900 md:my-6 md:rounded-3xl md:shadow-lg overflow-hidden pb-12 transition-colors duration-200">
      
      {/* Header sa strelicom nazad */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
        <button className="text-gray-600 dark:text-zinc-400 hover:opacity-80">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-zinc-950 dark:text-white">Nova lokacija</h1>
        <button className="text-emerald-700 dark:text-emerald-500 font-medium hover:opacity-80">Sačuvaj</button>
      </div>

      {/* 1. STEPPER (Progres bar sa slike) */}
      <div className="px-6 py-6 bg-gray-50 dark:bg-zinc-900/50 border-b border-gray-100 dark:border-zinc-800">
        <div className="flex items-center justify-between relative">
          {/* Linija u pozadini steppera */}
          <div className="absolute left-0 right-0 top-4 h-[2px] bg-gray-200 dark:bg-zinc-700 -z-0" />
          
          {steps.map((step) => (
            <div key={step.id} className="flex flex-col items-center z-10 flex-1">
              <button
                type="button"
                onClick={() => setCurrentStep(step.id)}
                className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-200 ${
                  currentStep >= step.id
                    ? 'bg-emerald-700 text-white dark:bg-emerald-600'
                    : 'bg-gray-200 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400'
                }`}
              >
                {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
              </button>
              <span className={`text-xs mt-2 font-medium ${
                currentStep === step.id ? 'text-emerald-700 dark:text-emerald-500' : 'text-gray-400 dark:text-zinc-500'
              }`}>
                {step.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Forma sadržaj */}
      <div className="p-6 space-y-6">
        {currentStep === 1 && (
          <>
            {/* SEKCIJA: Osnovne informacije */}
            <div>
              <h2 className="text-lg font-bold text-zinc-950 dark:text-white mb-4">Osnovne informacije</h2>
              
              <div className="space-y-4">
                {/* Naziv lokacije */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                    Naziv lokacije <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="npr. Uvac vidikovac"
                    className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-700 rounded-xl bg-transparent focus:ring-2 focus:ring-emerald-600 focus:outline-none dark:text-white placeholder-gray-400"
                  />
                </div>

                {/* Kratak opis */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                      Kratak opis <span className="text-red-500">*</span>
                    </label>
                    <span className="text-xs text-gray-400">{shortDescription.length}/160</span>
                  </div>
                  <textarea
                    maxLength={160}
                    rows={3}
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="Ukratko opiši lokaciju..."
                    className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-700 rounded-xl bg-transparent focus:ring-2 focus:ring-emerald-600 focus:outline-none dark:text-white placeholder-gray-400 resize-none"
                  />
                </div>

                {/* Kategorija Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                    Kategorija <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none dark:text-white"
                  >
                    <option value="">Izaberi kategoriju</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SEKCIJA: Brze informacije (Mreža sa prekidačima sa slike) */}
            <div className="pt-4">
              <h2 className="text-lg font-bold text-zinc-950 dark:text-white mb-4">Brze informacije</h2>
              
              <div className="grid grid-cols-3 gap-3">
                {/* Tip/Težina pristupa */}
                <div className="p-3 border border-gray-100 dark:border-zinc-800 rounded-xl flex flex-col items-center text-center bg-gray-50/50 dark:bg-zinc-800/30">
                  <span className="text-emerald-700 dark:text-emerald-500 text-xs font-semibold mb-1">Težina pristupa</span>
                  <select 
                    value={difficulty} 
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="text-xs bg-transparent font-medium focus:outline-none text-zinc-900 dark:text-white"
                  >
                    <option value="Lako">Lako</option>
                    <option value="Srednje">Srednje</option>
                    <option value="Teško">Teško</option>
                  </select>
                </div>

                {/* Pogodno za decu - Toggle */}
                <div className="p-3 border border-gray-100 dark:border-zinc-800 rounded-xl flex flex-col items-center justify-between text-center bg-gray-50/50 dark:bg-zinc-800/30">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Za decu</span>
                  <button
                    type="button"
                    onClick={() => setChildFriendly(!childFriendly)}
                    className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 mt-1 ${
                      childFriendly ? 'bg-emerald-700' : 'bg-gray-300 dark:bg-zinc-700'
                    }`}
                  >
                    <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${childFriendly ? 'translate-x-4' : ''}`} />
                  </button>
                </div>

                {/* Parking - Toggle */}
                <div className="p-3 border border-gray-100 dark:border-zinc-800 rounded-xl flex flex-col items-center justify-between text-center bg-gray-50/50 dark:bg-zinc-800/30">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Parking</span>
                  <button
                    type="button"
                    onClick={() => setParkingAvailable(!parkingAvailable)}
                    className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 mt-1 ${
                      parkingAvailable ? 'bg-emerald-700' : 'bg-gray-300 dark:bg-zinc-700'
                    }`}
                  >
                    <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${parkingAvailable ? 'translate-x-4' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Dugme za Nastavak */}
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="w-full mt-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-md shadow-emerald-700/10"
            >
              Nastavi <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {currentStep > 1 && (
          <div className="text-center py-12 text-gray-500">
            Ovaj korak ({steps[currentStep - 1].name}) kodiramo sledeći!
            <button 
              onClick={() => setCurrentStep(1)} 
              className="block mx-auto mt-4 text-sm text-emerald-700 font-medium underline"
            >
              Vrati se na prvi korak
            </button>
          </div>
        )}
      </div>

    </div>
  );
}