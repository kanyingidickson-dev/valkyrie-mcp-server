"""
PROJECT VALKYRIE: Clean Duplicate Assets Script
===============================================
Removes duplicate asset pages from the Notion Logistics database
by keeping only one page per asset name.

Usage:
    python clean_duplicates.py

Requirements:
    pip install requests python-dotenv
"""

import requests
import os
import sys
from dotenv import load_dotenv
from collections import defaultdict

# Load environment variables
load_dotenv()

# Configuration
NOTION_TOKEN = os.getenv("NOTION_TOKEN")
LOGISTICS_DB_ID = os.getenv("LOGISTICS_DB_ID")

if not NOTION_TOKEN or not LOGISTICS_DB_ID:
    print("❌ Error: Missing NOTION_TOKEN or LOGISTICS_DB_ID in environment")
    print("   Copy .env.example to .env and fill in your values")
    sys.exit(1)

HEADERS = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28"
}

def query_database():
    """Query all pages in the Logistics database"""
    url = f"https://api.notion.com/v1/databases/{LOGISTICS_DB_ID}/query"
    response = requests.post(url, headers=HEADERS, json={})
    if response.status_code != 200:
        print(f"❌ Error querying database: {response.status_code} {response.text}")
        sys.exit(1)
    return response.json().get('results', [])

def delete_page(page_id):
    """Archive (delete) a page by ID"""
    url = f"https://api.notion.com/v1/pages/{page_id}"
    response = requests.patch(url, headers=HEADERS, json={"archived": True})
    if response.status_code == 200:
        print(f"✅ Archived duplicate page: {page_id}")
    else:
        print(f"❌ Error archiving page {page_id}: {response.status_code} {response.text}")

def main():
    print("🧹 Cleaning duplicate assets from Notion Logistics database...")

    pages = query_database()
    name_to_pages = defaultdict(list)

    # Group pages by asset name
    for page in pages:
        name = page['properties'].get('Asset Name', {}).get('title', [{}])[0].get('plain_text', 'Unknown')
        name_to_pages[name].append(page['id'])

    total_duplicates = 0

    for name, page_ids in name_to_pages.items():
        if len(page_ids) > 1:
            print(f"📋 Asset '{name}' has {len(page_ids)} pages. Keeping first, deleting {len(page_ids)-1}")
            # Keep the first, delete the rest
            for page_id in page_ids[1:]:
                delete_page(page_id)
                total_duplicates += 1

    if total_duplicates == 0:
        print("✅ No duplicates found.")
    else:
        print(f"🧹 Cleaned {total_duplicates} duplicate pages.")

if __name__ == "__main__":
    main()
