# Big Saucy Recipes

A recipe box, cook mode and shopping list that runs in your browser. It's part of the Big apps, alongside [Big Skinny Health](https://github.com/dontdoubtdusty/diet) and [Big Minty Finances](https://github.com/dontdoubtdusty/budget). It's one file (`index.html`) with no build step and no server.

## Features

- Recipes typed in or pasted from any website or doc, with ingredients, steps, notes, nutrition and video links
- Browsing by category, cuisine and protein, plus search, filters, your own tags and a Surprise me button
- Cook mode right on the recipe page (tap Start cooking): the screen stays on, and checked-off ingredients and steps drop out of sight
- Timers in steps: write `@10m`, `@30s`, `@1h` or `@1h30m` in a step line and it becomes a one-tap timer (one runs at a time, pinned above the nav, with a sound and vibration when it's done)
- Scaling servings, with US amounts converted as they grow or shrink
- Links between recipes, like a sauce used in a main dish
- A Goes with list on each recipe for building a meal around it, like "rice, tortillas, [[Pico de Gallo]]", where linked recipes show the pairing on both pages
- A meal calendar that tracks servings made, servings eaten and leftovers, with an optional layer of food holidays (from National Today's Food & Beverage list) you can switch on from the calendar's key
- A Kitchen tab for what you have on hand, recipes you can make without shopping, and a merged shopping list
- A cooking log with what's due for a comeback
- A Discover tab for the cooking sites, blogs, YouTube channels and social accounts you follow, with one feed of their newest recipes that flags the ones you can make from your kitchen, a few suggested sources, and a search that finds recipes using the ingredients you pick (or what's in your kitchen) across your blogs' whole archives, not just their newest posts (read through the share site's `/feed`, see `share/functions/feed.js`; searching works on WordPress blogs, and other sources are matched against their newest posts)
- Light, dark and automatic themes, plus a Day/Night option that switches to dark at 6pm and back to light at 6am
- Recipe photos, cropped to a circle
- Sharing a recipe as a short link to a simple recipe page that stays up to date, or as plain text
- Backups you can share, download and import, with a weekly reminder
- Optional sync across devices with an email sign-in

## Using it

Turn on GitHub Pages for this repo (**Settings → Pages → Deploy from a branch → `main` / root**) and open the link it gives you. You can also open `index.html` straight from your computer, but installing and offline use only work from the GitHub Pages link.

### Install it as an app

- **iPhone or iPad (Safari):** tap Share, then **Add to Home Screen**.
- **Android (Chrome):** tap the ⋮ menu, then **Install app** (or **Add to Home screen**).
- **Computer (Chrome or Edge):** click the install icon at the right end of the address bar.

Once it's installed, it opens full screen with its own icon and works without an internet connection.

### Sharing recipes and photos

Tap the badge next to a recipe's name to add a photo, then drag and pinch it into the circle. Photos are saved small (600px, about 25 KB) and kept apart from the rest of your data, so they don't count toward sync's 1 MB limit.

Tap **Share** on a recipe to send it as a link or as plain text. The link opens `share.html`, a simple page anyone can view with the recipe, its photo and a **Copy recipe** button. The copied text pastes straight into Big Saucy's Add tab. Editing a recipe updates its link, and deleting the recipe takes the link down.

Links and synced photos need you signed in, plus these rules in Firestore (Firebase console → Firestore Database → Rules), inside `match /databases/{database}/documents { … }`:

```
match /users/{uid}/photos/{id} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
match /shared/{id} {
  allow read: if true;
  allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
  allow update: if request.auth != null && resource.data.uid == request.auth.uid
                && request.resource.data.uid == request.auth.uid;
  allow delete: if request.auth != null && (resource == null || resource.data.uid == request.auth.uid);
}
```

### Share links on Cloudflare Pages

The `share/` folder is a tiny separate site for share links, hosted free on Cloudflare Pages so links look like `https://big-saucy.pages.dev/r/AbC123xyz`. The address is set in `index.html` (`SHARE_SITE`). The apps themselves stay on GitHub Pages. `share/functions/r/[[path]].js` adds link previews (the recipe's name, a summary and its photo) when a link is pasted into Messages and similar apps.

Setup, once: in Cloudflare, **Workers & Pages → Create → Pages → Connect to Git**, pick this repo, then set **Root directory** to `share`, leave the build command empty, and set **Build output directory** to `public`. Optionally set build watch paths to `share/*`.

Or as a Worker (**Workers & Pages → Create → Import a repository**): set **Path** to `/share`, leave the build command empty and keep the deploy command `npx wrangler deploy`. The Worker's name must match `name` in `share/wrangler.jsonc`, and its address will be `<name>.<your-account>.workers.dev`.

### Files

| File | What it does |
| --- | --- |
| `index.html` | The whole app |
| `share.html` | Forwards older share links to the share site |
| `share/` | The shared recipe site on Cloudflare Pages, with link previews |
| `sync.js` | Optional sync across devices (shared by all the Big apps) |
| `manifest.webmanifest` | The app's name, colors and icons, used when it's installed |
| `sw.js` | Saves a copy of the app so it opens offline |
| `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | The app icon at each size browsers and phones ask for |
| `icons/` | Line icons on the category and protein tiles (see `icons/README.md`) |
| `flags/` | Flags on the cuisine tiles (see `flags/README.md`) |
| `img/globe.jpg` | The globe on the Cuisine tab's "All" tile |

**When you update the app:** nothing extra to do. The app always checks for a newer copy first and only falls back to the saved one when you're offline.

## Your data

Everything you add is saved in your browser's `localStorage` on your device, and none of it is stored in this repository. Running timers stay on the device they were started on.

Each website address keeps its own separate storage, so your recipes don't follow you to a new address or device by themselves. On iPhone, the home-screen app also keeps separate storage from the same page opened in Safari. Two ways to move them:

- **Backup:** go to **Settings → Share backup** (or **Download backup**) in the old place, then **Import backup file** in the new one.
- **Sync:** sign in under **Settings → Sync across devices** on each device. Your recipes are then also kept in the Big apps' Firebase database under your account. Sync is off until you sign in.

## Credits

The fonts are [Fredoka](https://fonts.google.com/specimen/Fredoka) and [Nunito](https://fonts.google.com/specimen/Nunito), loaded from Google Fonts.

Category and protein icons are from [IconOven](https://iconoven.com/icons) (MIT). Cuisine flags are from [flag-icons](https://github.com/lipis/flag-icons) (MIT). The globe is rendered from NASA's Blue Marble imagery (public domain). Details are in the READMEs inside `icons/` and `flags/`.
