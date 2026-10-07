-- Assign temporary illustrative cover photos to the 61 destinations that
-- currently have neither a cover image nor a gallery image.
-- The selected Unsplash photos are generic category imagery, not exact photos
-- of each landmark. Existing photos are preserved. Run once in Supabase SQL Editor.

update public.locations as location
set cover_image = case
  when location.category_id = 'planina' then
    (array[
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=85',
      'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1600&q=85',
      'https://images.unsplash.com/photo-1680373638144-98d86909e722?auto=format&fit=crop&w=1600&q=85'
    ])[1 + (abs(hashtext(location.slug)::bigint) % 3)::int]
  when location.category_id = 'vidikovac' then
    (array[
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&q=85',
      'https://images.unsplash.com/photo-1680373638144-98d86909e722?auto=format&fit=crop&w=1600&q=85',
      'https://images.unsplash.com/photo-1550947819-98400828e3e0?auto=format&fit=crop&w=1600&q=85'
    ])[1 + (abs(hashtext(location.slug)::bigint) % 3)::int]
  when location.category_id in ('jezero', 'izvor') then
    (array[
      'https://images.unsplash.com/photo-1702360373582-968d932ac789?auto=format&fit=crop&w=1600&q=85',
      'https://images.unsplash.com/photo-1680373638144-98d86909e722?auto=format&fit=crop&w=1600&q=85',
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&q=85'
    ])[1 + (abs(hashtext(location.slug)::bigint) % 3)::int]
  when location.category_id = 'grad' then
    (array[
      'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1600&q=85',
      'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1600&q=85',
      'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1600&q=85'
    ])[1 + (abs(hashtext(location.slug)::bigint) % 3)::int]
  when location.category_id = 'letovalište' then
    (array[
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=85',
      'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1600&q=85'
    ])[1 + (abs(hashtext(location.slug)::bigint) % 2)::int]
  else location.cover_image
end
where location.slug in (
  'novi-sad', 'sremski-karlovci', 'beograd', 'kragujevac', 'kraljevo',
  'durmitor', 'pavlova-strana', 'biogradsko-jezero', 'kotor', 'zlatibor',
  'golija', 'zlatar', 'budva', 'bjelasnica', 'fortica-mostar', 'sarajevo',
  'neum', 'poluostrvo-klek', 'velebit', 'komansko-jezero', 'vidova-gora',
  'zagreb', 'makarska', 'rovinj', 'sar-planina', 'kokino', 'ohridsko-jezero',
  'skopje', 'albanski-alpi-teth-valbona', 'portoroz', 'crveno-jezero-lacu-rosu',
  'berat', 'himara', 'triglav', 'ojstrica-bled', 'ljubljana', 'piran', 'solun',
  'parga', 'afitos', 'piatra-craiului', 'rila', 'orlovo-oko', 'plovdiv',
  'sozopol', 'suncev-breg', 'jezero-kerkini', 'mamaia', 'olimp', 'meteori',
  'vidikovac-molitva', 'krupajsko-vrelo', 'petrovac-na-moru', 'trnovacko-jezero',
  'tvrdjava-rozafa', 'plitvicka-jezera', 'ksamil', 'bohinjsko-jezero',
  'sedam-rilskih-jezera', 'brasov', 'vama-veche'
)
and nullif(btrim(location.cover_image), '') is null
returning location.slug, location.title, location.cover_image;
