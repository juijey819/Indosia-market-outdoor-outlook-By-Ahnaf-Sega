# Indonesia Outdoor — Market Outlook

An independent research report by Ahnaf Sega on outdoor-product search interest in Indonesia, with market context and recommendations for outdoor brands. The visual layout follows a presentation format on desktop and a single reading column on mobile.

The report combines a Google Trends export, industry estimates published in a 2023 IPO prospectus, and a November 2026 Jakpat travel survey. These sources measure different things; the report keeps them separate and does not estimate sales or market share for individual brands.

## View locally

This is a static website with no build step, accounts, backend, or API keys. Serve the `dist` directory with any static server:

```bash
python -m http.server 8000 --directory dist
```

Open `http://localhost:8000`. CSV and JSON downloads, chart interaction, category selection, chapter navigation, and the browser's print-to-PDF flow work locally.

## Reproduce the analysis

Python and NumPy are needed for the calculation script:

```bash
python -m pip install -r requirements.txt
python scripts/analyze.py
```

The script reads `dist/data/google-trends-weekly.csv` and regenerates `dist/data/analysis.json`. The raw export has 261 weekly observations. The final week was incomplete at retrieval and is excluded from fitting, leaving 260 observations.

Four candidate forecast methods are compared using 11 rolling development origins and a 12-week horizon. The last 12 completed weeks are held out of model selection. The method selected on development data is evaluated on that locked holdout, then refitted on the complete training history. Error ranges are descriptive pooled backtest quantiles, not calibrated probability intervals. Their holdout coverage is shown in the report.

## Data notes

- Google Trends was exported on 14 November 2026 for Indonesia, Web Search, All categories, Past 5 years. The three exact terms were compared in one query. Values are relative indices, not searches, sales, people, or market shares.
- Year-to-date comparisons use weekly observations starting in January–October, with 43 observations in each of 2025 and 2026.
- Seasonal comparisons use complete years 2022–2025. They average monthly means after dividing by each year's mean. Weeks are grouped by their start month, so these are not exact calendar-month search totals.
- Frost & Sullivan market figures are reproduced in the 2023 PT Sinar Eka Selaras IPO prospectus. 2023–2025 figures are forecasts published in 2023, not verified realized outcomes.
- Jakpat results concern survey respondents and travel plans, not confirmed buyers of outdoor gear.

Source links and assumptions appear next to the relevant evidence and in the final report section. Recommendations are hypotheses for further research and controlled tests.

## Implementation

HTML, CSS and JavaScript, SVG charts, and locally served Poppins fonts. No third-party requests are required to read the report. Poppins is distributed under the SIL Open Font License; see `dist/fonts/OFL.txt`.

For deployment, serve `dist` as the website root. There is no build command.
