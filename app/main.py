import typer
from pathlib import Path
from app.scanner.scan import scan_folder

from app.db.database import get_conn
from app.actions.move import move_to_quarantine
from app.actions.delete import delete_file

app = typer.Typer()

@app.command()
def scan(folder: str):
    '''Scan a target directory for explicit images.'''
    target_path = Path(folder)
    if not target_path.exists() or not target_path.is_dir():
        typer.echo(f"Error: {folder} is not a valid directory.")
        raise typer.Exit(code=1)
        
    scan_folder(target_path)
    typer.echo("Scan complete.")


@app.command()
def quarantine():
    conn = get_conn()

    rows = conn.execute("""
        SELECT f.path FROM results r
        JOIN files f ON r.file_id = f.id
        WHERE r.decision = 'explicit'
    """).fetchall()

    for (path,) in rows:
        new_path = move_to_quarantine(path)
        print(f"Moved: {path} -> {new_path}")


@app.command()
def delete():
    conn = get_conn()

    rows = conn.execute("""
        SELECT f.path FROM results r
        JOIN files f ON r.file_id = f.id
        WHERE r.decision = 'explicit'
    """).fetchall()

    for (path,) in rows:
        delete_file(path)
        print(f"Deleted: {path}")


if __name__ == "__main__":
    app()
