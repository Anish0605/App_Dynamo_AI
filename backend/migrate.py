"""
migrate.py — Run Supabase schema migrations for Dynamo AI.

Usage:
    python migrate.py

This script:
1. Adds monthly image/video quota tracking columns to the users table.
2. Creates the subscriptions table for Razorpay payment logging.

If direct DB access is unavailable (e.g., network restrictions), run the SQL in
backend/migrate_quota_columns.sql and backend/init_db.sql via the Supabase Dashboard.
"""

import os
import sys
import requests

SUBSCRIPTIONS_SQL = """
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    plan TEXT,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    amount INTEGER,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ
);
"""

QUOTA_COLUMNS_SQL = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS image_count_used INTEGER DEFAULT 0;",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS video_count_used INTEGER DEFAULT 0;",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS quota_month TEXT DEFAULT '';",
    "UPDATE users SET quota_month = TO_CHAR(NOW(), 'YYYY-MM') WHERE quota_month IS NULL OR quota_month = '';",
]


def _try_psycopg2_migration(project_ref, service_key, statements):
    try:
        import psycopg2
        pooler_hosts = [
            "aws-0-ap-south-1.pooler.supabase.com",
            "aws-0-us-east-1.pooler.supabase.com",
            "aws-0-eu-west-1.pooler.supabase.com",
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
                for stmt in statements:
                    cur.execute(stmt)
                    print(f"Executed: {stmt[:60]}...")
                conn.commit()
                cur.close()
                conn.close()
                print("Migration complete via psycopg2!")
                return True
            except Exception as e:
                print(f"Failed {host}: {e}")
                continue
    except ImportError:
        print("psycopg2 not installed")
    return False


def run_quota_column_migrations():
    supabase_url = os.getenv("SUPABASE_URL", "")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    if not supabase_url or not service_key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")
        return

    project_ref = supabase_url.replace("https://", "").split(".")[0]

    if not _try_psycopg2_migration(project_ref, service_key, QUOTA_COLUMNS_SQL):
        print("\nAutomatic quota column migration failed.")
        print("Please run backend/migrate_quota_columns.sql in your Supabase Dashboard SQL Editor.")
        print("URL: https://supabase.com/dashboard/project/" + project_ref + "/sql")


def run_subscriptions_migration():
    supabase_url = os.getenv("SUPABASE_URL", "")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    if not supabase_url or not service_key:
        print("Supabase not configured — skipping subscriptions migration")
        return

    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }

    check_url = f"{supabase_url}/rest/v1/subscriptions?select=id&limit=1"
    r = requests.get(check_url, headers=headers)
    if r.status_code == 200:
        print("Migration: subscriptions table OK")
        return

    print("Migration needed: subscriptions table missing.")
    print("Please run the following SQL in your Supabase SQL Editor:")
    print(f"  https://supabase.com/dashboard/project/{supabase_url.replace('https://','').split('.')[0]}/sql/new")
    print()
    print(SUBSCRIPTIONS_SQL)


def run():
    run_quota_column_migrations()
    run_subscriptions_migration()


if __name__ == "__main__":
    run()
