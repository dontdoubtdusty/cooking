# Big Saucy Recipes

A recipe box, cook mode and shopping list that runs in your browser. It's part of the Big apps, alongside [Big Skinny Health](https://github.com/dontdoubtdusty/diet) and [Big Minty Finances](https://github.com/dontdoubtdusty/budget). It's one file (`index.html`) with no build step and no server.

## Features

- Recipes typed in or pasted from any website or doc, with ingredients, steps, notes, nutrition and video links
- Browsing by category, cuisine and protein, plus search, filters, your own tags and a Surprise me button
- Cook mode that keeps the screen on, turns times in the steps into one-tap timers and lets you check off ingredients
- Scaling servings, with US amounts converted as they grow or shrink
- Links between recipes, like a sauce used in a main dish
- A meal calendar that tracks servings made, servings eaten and leftovers
- A Kitchen tab for what you have on hand, recipes you can make without shopping, and a merged shopping list
- A cooking log with what's due for a comeback
- Light, dark and automatic themes
- Backups you can share, download and import, with a weekly reminder
- Optional sync across devices with an email sign-in

## Using it

Turn on GitHub Pages for this repo (**Settings → Pages → Deploy from a branch → `main` / root**) and open the link it gives you. You can also open `index.html` straight from your computer, but installing and offline use only work from the GitHub Pages link.

### Install it as an app

- **iPhone or iPad (Safari):** tap Share, then **Add to Home Screen**.
- **Android (Chrome):** tap the ⋮ menu, then **Install app** (or **Add to Home screen**).
- **Computer (Chrome or Edge):** click the install icon at the right end of the address bar.

Once it's installed, it opens full screen with its own icon and works without an internet connection.

### Files

| File | What it does |
| --- | --- |
| `index.html` | The whole app |
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
