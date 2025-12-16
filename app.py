import joblib
import numpy as np
import pandas as pd
import streamlit as st

st.set_page_config(page_title="Calgary Housing Price Estimator (2024 Data)", layout="centered")

@st.cache_resource
def load_pipeline():
    return joblib.load("xgb_housing_pipeline.joblib")

pipeline = load_pipeline()

# Pull categories EXACTLY as trained
ohe = pipeline.named_steps["preprocess"].named_transformers_["cat"]
quadrant_cats, property_cats, year_cats = ohe.categories_

# Explicit UI order (matches training labels exactly)
YEAR_ORDER = [
    "Pre-1900",
    "1900-1945",
    "1946-1970",
    "1971-1990",
    "1991-2010",
    "Post-2011"
]

PROPERTY_ORDER = [
    "Single",
    "Duplex",
    "Townhouse",
    "Apartment / Condo",
    "Mixed Residential",
    "Secondary / Accessory"
]

QUADRANT_ORDER = ["NW", "NE", "SW", "SE"]

year_cats = [y for y in YEAR_ORDER if y in year_cats]
property_cats = [p for p in PROPERTY_ORDER if p in property_cats]
quadrant_cats = [q for q in QUADRANT_ORDER if q in quadrant_cats]

st.title("Calgary Housing Price Estimator")

land_size = st.slider("Land Size (sqm)", 50, 2000, 500)

year_range = st.selectbox(
    "Year of Construction",
    year_cats,
    index=year_cats.index("Post-2011")
)

quadrant = st.selectbox(
    "Quadrant",
    quadrant_cats,
    index=quadrant_cats.index("NE")
)

property_type = st.selectbox(
    "Property Type",
    property_cats,
    index=property_cats.index("Single")
)

input_df = pd.DataFrame([{
    "LOG_LAND_SIZE": np.log1p(land_size),
    "YEAR_OF_CONSTRUCTION_RANGE": year_range,
    "QUADRANT": quadrant,
    "PROPERTY_TYPE": property_type
}])

# Live prediction
pred_log = pipeline.predict(input_df)[0]
pred = np.expm1(pred_log)

st.metric("Estimated Value", f"${pred:,.0f}")
