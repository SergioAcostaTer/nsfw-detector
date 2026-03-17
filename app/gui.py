import streamlit as st
import pandas as pd
from PIL import Image
from app.db.database import get_conn

st.set_page_config(page_title="NSFW Review Dashboard", layout="wide")

st.title("🛡️ Quarantine Review Dashboard")

conn = get_conn()

# Fetch flagged images
query = '''
    SELECT f.path, r.decision, r.score 
    FROM results r 
    JOIN files f ON r.file_id = f.id 
    WHERE r.decision != 'safe'
    ORDER BY r.score DESC
'''
try:
    df = pd.read_sql_query(query, conn)
except Exception as e:
    st.warning("Database not initialized or empty. Run a scan first!")
    st.stop()

if df.empty:
    st.success("No explicit or borderline images found! 🎉")
else:
    st.write(f"Found **{len(df)}** flagged images requiring review.")
    
    st.cache_data.clear()
    # Create a grid layout
    cols = st.columns(3)
    for index, row in df.iterrows():
        with cols[index % 3]:
            try:
                img = Image.open(row['path'])
                img.thumbnail((400, 400))
                st.image(img, use_container_width=True)
                st.caption(f"**Path**: {row['path']}")
                st.caption(f"**Decision**: {row['decision']} ({row['score']:.2f})")
                
                # Placeholder for Action Buttons (Phase 2)
                st.button("Delete", key=f"del_{index}", type="primary")
            except Exception as e:
                st.error(f"Could not load image: {row['path']}")
