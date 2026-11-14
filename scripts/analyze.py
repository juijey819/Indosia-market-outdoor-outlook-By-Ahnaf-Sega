"""Reproduce the report's statistics and time-ordered forecast evaluation."""
from pathlib import Path
from datetime import date, timedelta
import csv, io, json, math, shutil
import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
DATA = HERE if (HERE / 'google-trends-weekly.csv').exists() else ROOT / 'dist/data'
SOURCE = DATA / 'google-trends-weekly.csv'
lines = SOURCE.read_text(encoding='utf-8-sig').splitlines()
start = next(i for i, line in enumerate(lines) if line.startswith('Week,'))
records = list(csv.reader(lines[start:]))
dates = [date.fromisoformat(r[0]) for r in records[1:]]
values = np.array([[float(v) for v in r[1:]] for r in records[1:]])
assert values.shape == (261, 3)
assert all((b-a).days == 7 for a,b in zip(dates, dates[1:]))
assert np.isfinite(values).all() and values.min() >= 0 and values.max() <= 100
# The download was taken on Saturday 14 November. The week starting 8 November
# had not finished at retrieval, so exclude it from fitting and comparisons.
cut = date(2026, 11, 8)
keep = np.array([d < cut for d in dates])
model_dates = [d for d in dates if d < cut]
observed = values[keep]
names = ['Tas carrier', 'Tenda camping', 'Sepatu hiking']
keys = ['carrier', 'tent', 'shoe']
methods = ['Last observation', 'Seasonal naive (52 weeks)', '13-week average', 'Harmonic regression']

def features(t, center, scale):
    t = np.asarray(t)
    return np.column_stack([np.ones(len(t)), (t-center)/scale,
        np.sin(2*np.pi*t/52.18), np.cos(2*np.pi*t/52.18),
        np.sin(4*np.pi*t/52.18), np.cos(4*np.pi*t/52.18)])

def predict(y, h, method):
    n = len(y)
    if method == methods[0]:
        pred = np.repeat(y[-1], h)
    elif method == methods[1]:
        pred = np.array([y[n+i-52] for i in range(h)])
    elif method == methods[2]:
        pred = np.repeat(y[-13:].mean(), h)
    else:
        window = min(104, n)
        t = np.arange(n-window, n)
        x = features(t, n-1, 104)
        penalty = np.diag([0, 8, 1, 1, 1, 1])
        beta = np.linalg.solve(x.T@x + penalty, x.T@y[-window:])
        pred = features(np.arange(n, n+h), n-1, 104)@beta
    return np.maximum(pred, 0)

series = []
for col, (name, key) in enumerate(zip(names, keys)):
    full = observed[:, col]
    train = full[:-12]
    holdout = full[-12:]
    origins = list(range(len(train)-52, len(train)-11, 4))
    scores = {}
    errors = {}
    for method in methods:
        residuals = np.array([train[o:o+12] - predict(train[:o], 12, method) for o in origins])
        scores[method] = float(np.abs(residuals).mean())
        errors[method] = residuals
    selected = min(methods, key=lambda m: scores[m])
    test_forecast = predict(train, 12, selected)
    test_mae = float(np.abs(holdout-test_forecast).mean())
    baseline_mae = float(np.abs(holdout-predict(train,12,methods[1])).mean())
    fc = predict(full, 12, selected)
    # Descriptive error envelope from development backtests. It is not a
    # calibrated prediction interval; overlapping windows are disclosed.
    error = errors[selected].reshape(-1)
    lo, hi = np.quantile(error, [.10, .90])
    lower = np.maximum(fc+lo, 0)
    upper = np.maximum(fc+hi, 0)
    test_lower = np.maximum(test_forecast+lo, 0)
    test_upper = np.maximum(test_forecast+hi, 0)
    coverage = float(((holdout >= test_lower)&(holdout <= test_upper)).mean())
    mean = {}
    for year in [2025, 2026]:
        chosen = [values[i,col] for i,d in enumerate(dates) if d.year==year and d.month<=10]
        assert len(chosen) == 43
        mean[year] = float(np.mean(chosen))
    seasonal = []
    for month in range(1,13):
        annual_relative = []
        for year in range(2022,2026):
            annual = [values[i,col] for i,d in enumerate(dates) if d.year==year]
            monthly = [values[i,col] for i,d in enumerate(dates) if d.year==year and d.month==month]
            annual_relative.append(float(np.mean(monthly)/np.mean(annual)*100))
        seasonal.append(float(np.mean(annual_relative)))
    series.append({'key':key,'name':name,'ytd2025':mean[2025],'ytd2026':mean[2026],
        'change':(mean[2026]/mean[2025]-1)*100,'seasonality':seasonal,
        'selected':selected,'developmentMae':scores,'developmentOrigins':len(origins),
        'testMae':test_mae,'seasonalBaselineTestMae':baseline_mae,'testRangeCoverage':coverage,
        'testDates':[str(d) for d in model_dates[-12:]],'testActual':holdout.tolist(),
        'testForecast':test_forecast.tolist(),'forecast':fc.tolist(),
        'lower':lower.tolist(),'upper':upper.tolist()})

result={'retrieved':'2026-11-14','rawRows':len(dates),'fitRows':len(observed),
    'weekly':[{'date':str(d),'values':v.tolist()} for d,v in zip(dates,values)],
    'forecastDates':[str(model_dates[-1]+timedelta(weeks=i)) for i in range(1,13)],
    'latestCompleteWeekStart':str(model_dates[-1]),'excludedWeekStart':str(cut),
    'series':series,'market':{'years':[2018,2019,2020,2021,2022,2023,2024,2025],
    'usdMillions':[1066,1176.6,993,1115.2,1272.4,1392,1529.8,1693.5],
    'forecastFrom':2023,'publicationYear':2023,'hiking2022':636.2},
    'methodology':{'scope':'Indonesia / Web Search / All categories / three search terms in one comparison',
    'ytd':'Weekly observations with start dates in January–October; 43 observations in each comparison year.',
    'seasonality':'2022–2025 full years. Mean weekly index by week-start month, divided by that year’s mean; then averaged across four years.',
    'forecast':'Four candidate methods; 11 rolling origins with a 12-week horizon in development data. Last 12 completed weeks locked out of model selection. Final fit uses 260 completed weeks. Error envelopes use pooled development errors (10th–90th percentiles), are not calibrated probability intervals, and use overlapping windows.'}}
DATA.mkdir(parents=True,exist_ok=True)
(DATA/'analysis.json').write_text(json.dumps(result,indent=2,allow_nan=False))
print(json.dumps({'rows':len(dates),'fit':len(observed),'forecastDates':result['forecastDates'],
    'series':[{k:s[k] for k in ['key','change','selected','testMae','seasonalBaselineTestMae','testRangeCoverage','developmentOrigins']} for s in series]},indent=2))
