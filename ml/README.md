# Smart Campus Transport — ML Service

Machine learning service for predicting bus delay and late arrival.

## Structure

```
ml/
├── data/
│   ├── raw/            # Original, unmodified datasets
│   ├── processed/      # Cleaned and transformed data
│   └── external/       # External data sources (weather, etc.)
├── notebooks/          # Jupyter notebooks for EDA and experimentation
├── src/
│   ├── data/           # Data loading and cleaning
│   ├── features/       # Feature engineering
│   ├── models/         # Model training and inference
│   ├── evaluation/     # Metrics, error analysis
│   └── utils/          # Shared utilities
├── scripts/            # One-off or automation scripts
├── tests/              # Unit and integration tests
└── requirements.txt
```

## Setup

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Responsibilities

- **ML prediction**: Predicting future bus delay / late arrival
- **Feature engineering**: Deriving predictive features from GPS events and context
- **Model serving**: Exposing predictions via a REST API (Flask)

Data quality validation (stale GPS, invalid coordinates, duplicate events, etc.)
is handled by deterministic rules in the Spring Boot backend, **not** by ML.
