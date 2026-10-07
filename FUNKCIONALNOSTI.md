# Funkcionalnosti aplikacije Balkan Nomad

Ovaj dokument opisuje funkcionalnosti koje su trenutno implementirane u kodu aplikacije.

## 1. Početna stranica i destinacije

- Učitavanje destinacija iz Supabase baze.
- Prikaz destinacija u karticama sa naslovnom fotografijom, nazivom, državom, regijom, kategorijom i kratkim opisom.
- Oznake na karticama za težinu, prilagođenost deci, dozvoljene ljubimce i parking.
- Pretraga po nazivu, regiji i kratkom opisu.
- Filtriranje po državi.
- Dugme za pretragu u donjoj navigaciji otvara popup sa poljem za pretragu, izborom države i rezultatima koji vode na stranicu destinacije.
- Otvaranje detaljne stranice klikom na karticu destinacije.

## 2. Stranica destinacije

- Galerija naslovne fotografije i dodatnih fotografija destinacije.
- Prikaz države, regije, kategorije i težine.
- Osnovne informacije: najbolje vreme za posetu, težina, trajanje i nadmorska visina.
- Odeljak sa opisom i mogućnošću proširenja skraćenog teksta.
- Odeljak „Istraži” sa kategorijama:
  - Aktivnosti
  - Prirodne lepote i znamenitosti
  - Smeštaj
  - Hrana i piće
- Stavke u ovim kategorijama mogu da sadrže naslov, opis, fotografiju i dodatne oznake. Fotografija se prikazuje ispod opisa kada je dodata.
- Odeljak praktičnih informacija sa bezbednosnim upozorenjima i oznakama za decu, ljubimce i parking.
- Čuvanje i uklanjanje destinacije iz omiljenih preko dugmeta sa srcem.
- Povratak na prethodnu stranicu i administratorska prečica za izmenu destinacije kada je korisnik prepoznat kao administrator.

## 3. Omiljene lokacije

- Donje dugme „Omiljeno” prikazuje sačuvane lokacije.
- Brojač prikazuje koliko je lokacija sačuvano.
- Ako nema omiljenih, prikazuje se poruka sa uputstvom kako da se lokacija sačuva.
- Omiljene lokacije se trenutno pamte u `localStorage` pregledača, po slug-u destinacije. Ne sinhronizuju se između uređaja niti između pregledača.

## 4. Prijava i registracija

- Prijava koristi Supabase Auth i email i lozinku.
- Aplikacija proverava ulogu korisnika u tabeli `profiles`. Ulogovani korisnik koji nije prepoznat kao administrator se odjavljuje i dobija popup „Registracija će biti moguća uskoro”.
- Registracija kroz aplikaciju je privremeno isključena. Pokušaj registracije prikazuje isti popup i ne pravi nalog.
- Neuspešna prijava prikazuje poruku o grešci.
- Dugme za odjavu dostupno je u zaglavlju kada postoji prijavljena sesija.

## 5. Administracija destinacija

- Početna stranica prikazuje administratoru prečice za dodavanje, izmenu i brisanje destinacija.
- Forma za dodavanje i izmenu obuhvata:
  - Naziv i URL slug destinacije.
  - Kategoriju: vidikovac, planina, jezero/reka, vodopad ili prilagođenu kategoriju.
  - Državu, regiju, najbolje vreme za posetu, težinu staze, trajanje i nadmorsku visinu.
  - Kratak i detaljan opis.
  - Bezbednosno upozorenje.
  - Oznake za prilagođenost deci, parking i ljubimce.
  - Naslovnu fotografiju i više fotografija u galeriji.
- Pri unosu naziva automatski se predlaže slug, koji se može ručno izmeniti.
- Fotografije se otpremaju u Supabase Storage, u bucket `locations`; naslovne slike, galerija i fotografije stavki smeštaju se u odvojene foldere.
- Moguće je uneti do pet stavki u svakoj grupi: aktivnosti, prirodne lepote, smeštaj i hrana/piće.
- Svaka stavka može da ima naslov, opis i otpremljenu fotografiju. Pri izmeni se postojeća fotografija prikazuje dok se ne izabere nova.
- Forma podržava poruke o uspehu i greškama tokom čuvanja.
- Pri izmeni, postojeće fotografije galerije mogu da se uklanjaju ili dopunjuju.
- Brisanje destinacije traži potvrdu.

## 6. PWA i prikaz na uređajima

- Postoji web app manifest sa nazivom, bojama, početnom adresom, samostalnim prikazom i ikonama od 192 × 192 i 512 × 512 piksela.
- Dodata je Apple ikona za početni ekran i boja teme pregledača.
- Stranica je podešena na srpski jezik.
- Na podržanim uređajima aplikacija može da se doda na početni ekran i otvori u samostalnom prikazu. Za instalaciju preko interneta potreban je HTTPS.
- Offline režim, servisni radnik i keširanje podataka još nisu implementirani. Podaci o destinacijama dolaze iz Supabase-a.

## 7. Tehnička osnova

- Interfejs je napravljen pomoću Next.js App Router-a i React-a.
- Supabase se koristi za autentifikaciju, bazu podataka i skladištenje fotografija.
- SQL migracije dodaju kolone za trajanje, nadmorsku visinu, upozorenja i sekcije destinacija, kao i administratorsko pravilo za izmenu redova u tabeli `locations`.

## 8. Funkcionalnosti koje još nisu povezane

- Dugme „Profil” u donjoj navigaciji trenutno nema povezanu stranicu ili akciju.
- Koordinate stavki mogu da se obrađuju i čuvaju u podacima, ali trenutna forma za stavke ne nudi polja za njihov unos, a detaljna stranica ne prikazuje mapu ili navigaciju.
- Omiljene lokacije nisu vezane za korisnički nalog.
- PWA ne radi offline.
- Registracija je blokirana kroz korisnički interfejs. Za potpuno isključenje javne registracije potrebno je isključiti prijave i u Supabase podešavanjima.
- Provera administratora na login stranici koristi ulogu iz profila. Supabase RLS pravila treba da ostanu izvor konačne kontrole pristupa bazi i Storage-u.
