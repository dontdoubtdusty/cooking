# Cuisine flags

SVG flags from [flag-icons](https://github.com/lipis/flag-icons) v7.5.0 (MIT, see LICENSE), 4:3 versions.

Each file is named after the cuisine it stands for: lowercase, spaces become hyphens
(`Middle Eastern` -> `middle-eastern.svg`, which uses the Arab League flag).
`mediterranean.svg` is the Union for the Mediterranean flag (white over navy).

To give a new cuisine a flag, drop its SVG in here with that name and add the name to
the `FLAGS` list in `index.html`.

`jewish.svg` is drawn for this app (a Star of David on white), not taken from flag-icons.
It also shows for a cuisine or category named `Jewish food`, `Jewish foods` or `Jewish cuisine`.

`afghan.svg` also shows for a cuisine named `Afghani` or `Afghanistan`.

`tex-mex.svg` (the Texas flag) and `hawaiian.svg` (the Hawaii flag) are drawn for this app; the Hawaii canton
reuses flag-icons' Union Jack. Tex-Mex also covers `Texan`/`Texas`, and Hawaiian covers `Hawaii`.

Cuisines with no flag of their own get colors drawn in `FLAGC` in `index.html` instead: Caribbean,
Cajun/Creole (Acadiana's colors and star; also `Cajun`, `Creole`, `Louisiana`), Soul Food (Pan-African colors)
and Scandinavian (a Nordic cross over Denmark, Norway and Sweden; also `Nordic`).

Other alternate names (Iranian, Argentine, Nepalese, Puerto Rico...) are mapped in `FALIAS` in `index.html`.
