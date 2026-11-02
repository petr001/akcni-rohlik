# ⚡ Fast Rohlík

Osobní appka nad rohlik.cz pro rychlejší nakupování akčních produktů. Místo nekonečného seznamu
ukáže **jednu kartu na druh potraviny** (Káva, Příkrmy, Sprchové gely, Jogurty…) s nejvíce zlevněným
reprezentantem. Klik otevře „složku“ (overlay jako na iPhonu) se všemi akčními produkty daného druhu –
s obrázkem, akční cenou, původní cenou, slevou a tlačítkem do košíku.

## Spuštění

```bash
npm install
cp .env.example .env     # a vyplň přihlašovací údaje (jen kvůli košíku)
npm run dev              # API (Hono, :3001) + Vite (:5173)
```

Otevři http://localhost:5173. Akce se stahují po hlavních kategoriích (karty naskakují postupně,
celé první načtení ~30–60 s) a cachují se na hodinu do `data/` (v gitu ignorováno).
Tlačítko „Obnovit“ vynutí nové stažení.

## Proměnné prostředí (`.env`, necommituj)

| Proměnná | Význam |
| --- | --- |
| `ROHLIK_USERNAME` | e-mail k účtu na rohlik.cz (jen pro košík) |
| `ROHLIK_PASSWORD` | heslo k účtu na rohlik.cz |
| `APP_PASSWORD` | volitelné; když je nastavené, `/api/*` vyžaduje HTTP Basic s tímto heslem |

Seznam akcí je na Rohlíku veřejný, přihlášení se používá jen pro košík. Údaje a session cookie Rohlíku
drží pouze backend, do frontendu ani do gitu se nedostanou. Objednávku dokončíš na rohlik.cz / v appce –
košík je sdílený s účtem.

## Jak to funguje

- `server/app.ts` – jediná Hono app (`/api/deals`, `/api/deals/part/:id`, `/api/cart`) + místo pro `APP_PASSWORD`. Lokálně ji servíruje `server/dev.ts`, na Vercelu `api/index.ts`.
- `server/cache.ts` – adaptér cache (lokálně soubory v `data/`).
- `server/rohlik.ts` – klient neoficiálního REST API webu rohlik.cz (stejné endpointy jako web:
  `/api/v1/categories/sales/...`, `/api/v1/products/card`, `/services/frontend-service/v2/cart`).
  Seznam akcí je veřejný, košík vyžaduje přihlášení.
- `server/deals.ts` – po hlavních kategoriích (každá samostatný krátký požadavek) projde strom kategorií do 3. úrovně (kategorie → podkategorie → druh),
  každý produkt zařadí do nejhlubší kategorie, kde je v akci. „Druh“ je tedy kategorie z Rohlíku
  (např. *Káva*, *Prací gely*), ne vlastní klasifikace – občas je hrubší (např. *Příkrmy*)
  nebo obecnější (*Bílá* pod *Víno*). Zobrazuje se i nadřazená kategorie.
- `src/` – React + Tailwind frontend, Vite proxuje `/api` na backend.

## Budoucí nasazení na Vercel

Architektura je na to připravená (`api/index.ts` + `vercel.json` s rewrite `/api/(.*)`, funkce bez stavu,
limit ~10 s na funkci splňuje stahování po jedné hlavní kategorii). Před nasazením je potřeba:

1. Napsat sdílený adaptér cache (Vercel Blob / KV) místo `MemoryCache` v `server/cache.ts` – paměť funkce se mezi instancemi nesdílí.
2. Nastavit `ROHLIK_USERNAME`, `ROHLIK_PASSWORD` a `APP_PASSWORD` (nebo zapnout Vercel Authentication) v nastavení projektu `fast-rohlik`. Repo nech private.
3. Nasazení zatím nebylo zkoušeno.

## Upozornění

API není oficiální a může se kdykoli změnit. Podmínky Rohlíku povolují využití jen k lepšímu nakupování
na rohlik.cz; jiné použití vyžaduje jejich písemný souhlas. Používej appku jen osobně na vlastním účtu,
nešiř ji a nezatěžuj Rohlík (backend omezuje souběh a cachuje).
