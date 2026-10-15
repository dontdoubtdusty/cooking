# Big Juicy Calorie Tracker

A simple calorie tracker that runs entirely in your browser. It's one file (`index.html`) with no build step, no server and no account.

## Features

- A first-run setup that works out a daily calorie target (Mifflin-St Jeor formula, adjusted for activity level and weight-loss pace)
- Logging food for breakfast, lunch, dinner and snacks, with servings, brands and serving sizes
- Logging exercise, with calories burned estimated from duration and intensity
- Saved foods and recipes, so you can log something with one tap
- A 7-day chart showing how each day compared with your target
- Light and dark themes
- Backup and restore through a file or copied text

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
| `manifest.webmanifest` | The app's name, colors and icons, used when it's installed |
| `sw.js` | Saves a copy of the app so it opens offline |
| `icons/` | The app icon at each size browsers and phones ask for |

**When you update the app:** change `VERSION` at the top of `sw.js` (for example from `v1` to `v2`). That tells installed copies to pick up the new files.

## Your data

Everything you log is saved in your browser's `localStorage` on your device. Nothing is sent anywhere, and none of it is stored in this repository.

Each website address keeps its own separate storage, so your log doesn't follow you to a new address or device by itself. On iPhone, the home-screen app also keeps separate storage from the same page opened in Safari. To move it, go to **Settings → Copy backup** (or **Save backup file**) in the old place, then **Import backup file** or **Paste backup text** in the new one.

## Credits

The fonts are [Fredoka](https://fonts.google.com/specimen/Fredoka) and [Nunito](https://fonts.google.com/specimen/Nunito), loaded from Google Fonts.

The calorie estimates are general guidance, not medical advice.
