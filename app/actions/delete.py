import os

def delete_file(path: str):
    if os.path.exists(path):
        os.remove(path)
