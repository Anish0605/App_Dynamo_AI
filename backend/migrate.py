"""
migrate.py — Run Supabase schema migrations for Dynamo AI.

Usage:
    python migrate.py

This script adds the monthly image/video quota tracking columns to the users table.
If direct DB access is unavailable (e.g., network restrictions), run the SQL in
backend/migrate_quota_columns.sql via the Supabase Dashboard SQL Editor.
"""

import os
import sys

def run():
    supabase_url = os.getenv("SUPABASE_URL", "")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    if not supabase_url or not service_key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")
        sys.exit(1)

    project_ref = supabase_url.replace("https://", "").split(".")[0]

    sql_statements = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS image_count_used INTEGER DEFAULT 0;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS video_count_used INTEGER DEFAULT 0;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS quota_month TEXT DEFAULT '';",
        "UPDATE users SET quota_month = TO_CHAR(NOW(), 'YYYY-MM') WHERE quota_month IS NULL OR quota_month = '';",
    ]

    # Try psycopg2 via Supabase connection poolers
    try:
        import psycopg2
        pooler_hosts = [
            f"aws-0-ap-south-1.pooler.supabase.com",
            f"aws-0-us-east-1.pooler.supabase.com",
            f"aws-0-eu-west-1.pooler.supabase.com",
        ]
        db_password = os.getenv("SUPABASE_DB_PASSWORD", service_key)

        for host in pooler_hosts:
            try:
                conn = psycopg2.connect(
                    host=host,
                    port=5432,
                    dbname="postgres",
                    user=f"postgres.{project_ref}",
                    password=db_password,
                    connect_timeout=10
                )
                print(f"Connected to {host}")
                cur = conn.cursor()
                for stmt in sql_statements:
                    cur.execute(stmt)
                    print(f"Executed: {stmt[:60]}...")
                conn.commit()
                cur.close()
                conn.close()
                print("Migration complete!")
                return
            except Exception as e:
                print(f"Failed {host}: {e}")
                continue

    except ImportError:
        print("psycopg2 not installed")

    print("\nAutomatic migration failed.")
    print("Please run backend/migrate_quota_columns.sql in your Supabase Dashboard SQL Editor.")
    print("URL: https://supabase.com/dashboard/project/" + project_ref + "/sql")


if __name__ == "__main__":
    run()
