import sqlite3
from app.config import DB_PATH

def get_conn():
    # check_same_thread=False is needed for Streamlit to read the DB safely
    return sqlite3.connect(DB_PATH, check_same_thread=False)
