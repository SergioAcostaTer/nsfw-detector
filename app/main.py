import typer
from pathlib import Path
from app.scanner.scan import scan_folder

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

if __name__ == "__main__":
    app()
