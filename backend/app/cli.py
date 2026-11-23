"""
ScanWise — CLI commands.
"""
import click
from flask import current_app
from flask.cli import with_appcontext

from .db import init_db


@click.command("init-db")
@with_appcontext
def init_db_command():
    """Create the database tables and seed data."""
    init_db()
    click.echo("Database initialised and seeded.")


@click.command("db-stats")
@with_appcontext
def db_stats_command():
    """Show database statistics."""
    from .db import get_db
    db = get_db()
    tables = [
        "ingredients", "ingredient_aliases", "ingredient_allergens",
        "ingredient_age_ratings", "ingredient_condition_risks",
        "users", "reports", "products",
    ]
    for table in tables:
        count = db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        click.echo(f"  {table:<35} {count}")
