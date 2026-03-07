"""
PROJECT VALKYRIE: Asset Seeding Script
=====================================
Populates the Notion Logistics database with initial asset data
for testing and demo purposes.

Usage:
    python seed_assets.py

Requirements:
    pip install requests python-dotenv
"""

import requests
import os
import sys
from dotenv import load_dotenv

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

# Sample assets for global logistics demo with complete data
ASSETS = [
    {
        "name": "Singapore Distribution Hub",
        "location": "1.2902, 103.8519",
        "risk": 8,
        "status": "Active",
        "description": "Primary Southeast Asian distribution center",
        "primary_contact": "Wei Chen",
        "primary_phone": "+65 6789 0123",
        "primary_email": "wei.chen@valkyrie-logistics.com",
        "facility_manager": "Sarah Tan",
        "facility_type": "Distribution Hub"
    },
    {
        "name": "Rotterdam Port Terminal",
        "location": "51.9225, 4.4791",
        "risk": 5,
        "status": "Active",
        "description": "European gateway port facility",
        "primary_contact": "Jan van der Berg",
        "primary_phone": "+31 10 234 5678",
        "primary_email": "j.vanderberg@valkyrie-logistics.com",
        "facility_manager": "Pieter de Jong",
        "facility_type": "Transport Node"
    },
    {
        "name": "Memphis Air Freight Center",
        "location": "35.1495, -90.0490",
        "risk": 3,
        "status": "Active",
        "description": "North American air cargo hub",
        "primary_contact": "Marcus Johnson",
        "primary_phone": "+1 901 555 0123",
        "primary_email": "m.johnson@valkyrie-logistics.com",
        "facility_manager": "Robert Williams",
        "facility_type": "Transport Node"
    },
    {
        "name": "Tokyo Data Vault",
        "location": "35.6762, 139.6503",
        "risk": 9,
        "status": "Active",
        "description": "Primary APAC data center and disaster recovery site",
        "primary_contact": "Yuki Nakamura",
        "primary_phone": "+81 3 1234 5678",
        "primary_email": "y.nakamura@valkyrie-logistics.com",
        "facility_manager": "Takeshi Yamamoto",
        "facility_type": "Data Center"
    },
    {
        "name": "Panama Canal Logistics Zone",
        "location": "9.0800, -79.5964",
        "risk": 7,
        "status": "Active",
        "description": "Central American transshipment facility",
        "primary_contact": "Carlos Mendoza",
        "primary_phone": "+507 234 5678",
        "primary_email": "c.mendoza@valkyrie-logistics.com",
        "facility_manager": "Ana Rodriguez",
        "facility_type": "Distribution Hub"
    },
    {
        "name": "Dubai Free Zone Warehouse",
        "location": "25.2048, 55.2708",
        "risk": 4,
        "status": "Active",
        "description": "Middle East regional distribution center",
        "primary_contact": "Ahmed Al-Rashid",
        "primary_phone": "+971 4 234 5678",
        "primary_email": "a.alrashid@valkyrie-logistics.com",
        "facility_manager": "Fatima Hassan",
        "facility_type": "Distribution Hub"
    },
    {
        "name": "Sydney Pacific Hub",
        "location": "-33.8688, 151.2093",
        "risk": 2,
        "status": "Active",
        "description": "Oceania primary logistics facility",
        "primary_contact": "James Mitchell",
        "primary_phone": "+61 2 9876 5432",
        "primary_email": "j.mitchell@valkyrie-logistics.com",
        "facility_manager": "Emily Watson",
        "facility_type": "Distribution Hub"
    },
    {
        "name": "São Paulo South American Center",
        "location": "-23.5505, -46.6333",
        "risk": 6,
        "status": "Active",
        "description": "South American regional distribution",
        "primary_contact": "Rafael Santos",
        "primary_phone": "+55 11 9876 5432",
        "primary_email": "r.santos@valkyrie-logistics.com",
        "facility_manager": "Maria Oliveira",
        "facility_type": "Distribution Hub"
    }
]


def check_database_exists():
    """Verify the database exists and is accessible"""
    try:
        response = requests.get(
            f"https://api.notion.com/v1/databases/{LOGISTICS_DB_ID}",
            headers=HEADERS
        )
        if response.status_code == 200:
            print(f"✅ Database found: {response.json().get('title', [{}])[0].get('plain_text', 'Untitled')}")
            return True
        else:
            print(f"❌ Database not found: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error checking database: {e}")
        return False


def clear_existing_assets():
    """Clear existing assets from the database (optional)"""
    print("\n🔍 Checking for existing assets...")
    
    try:
        response = requests.post(
            f"https://api.notion.com/v1/databases/{LOGISTICS_DB_ID}/query",
            headers=HEADERS
        )
        
        if response.status_code == 200:
            results = response.json().get("results", [])
            if results:
                print(f"   Found {len(results)} existing assets")
                print("   Skipping deletion (set CLEAR_EXISTING=true to clear)")
                return False
            else:
                print("   Database is empty")
                return True
        return False
    except Exception as e:
        print(f"   Warning: Could not query database: {e}")
        return False


def seed_assets():
    """Seed the database with sample assets"""
    print("\n🚀 Seeding assets to Notion...")
    print(f"   Database ID: {LOGISTICS_DB_ID}")
    print(f"   Assets to create: {len(ASSETS)}")
    print()
    
    success_count = 0
    error_count = 0
    
    for i, asset in enumerate(ASSETS, 1):
        print(f"[{i}/{len(ASSETS)}] Creating: {asset['name']}...", end=" ")
        
        payload = {
            "parent": {"database_id": LOGISTICS_DB_ID},
            "properties": {
                "Asset Name": {
                    "title": [{"text": {"content": asset["name"]}}]
                },
                "Coordinates": {
                    "rich_text": [{"text": {"content": asset["location"]}}]
                },
                "Risk Sensitivity": {
                    "number": asset["risk"]
                },
                "Primary Contact": {
                    "rich_text": [{"text": {"content": asset.get("primary_contact", "Unassigned")}}]
                },
                "Primary Phone": {
                    "phone_number": asset.get("primary_phone", "")
                },
                "Primary Email": {
                    "email": asset.get("primary_email", "")
                },
                "Facility Manager": {
                    "rich_text": [{"text": {"content": asset.get("facility_manager", "")}}]
                },
                "Facility Type": {
                    "select": {"name": asset.get("facility_type", "Other")}
                }
            }
        }
        
        try:
            response = requests.post(
                "https://api.notion.com/v1/pages",
                headers=HEADERS,
                json=payload
            )
            
            if response.status_code == 200:
                print(f"✅ (Risk: {asset['risk']}, Type: {asset.get('facility_type', 'N/A')})")
                success_count += 1
            else:
                print(f"❌ Error: {response.status_code}")
                error_count += 1
                if response.status_code == 400:
                    error_data = response.json()
                    print(f"      {error_data.get('message', 'Unknown error')}")
        except Exception as e:
            print(f"❌ Exception: {e}")
            error_count += 1
    
    print()
    print("=" * 50)
    print(f"✅ Successfully created: {success_count}")
    if error_count > 0:
        print(f"❌ Failed: {error_count}")
    print("=" * 50)
    
    return success_count, error_count


def verify_seeding():
    """Verify the assets were created correctly"""
    print("\n🔍 Verifying seeded assets...")
    
    try:
        response = requests.post(
            f"https://api.notion.com/v1/databases/{LOGISTICS_DB_ID}/query",
            headers=HEADERS
        )
        
        if response.status_code == 200:
            results = response.json().get("results", [])
            print(f"   Total assets in database: {len(results)}")
            
            # Show risk distribution
            risk_levels = {"high": 0, "medium": 0, "low": 0}
            for page in results:
                props = page.get("properties", {})
                risk = props.get("Risk Sensitivity", {}).get("number", 0)
                if risk >= 7:
                    risk_levels["high"] += 1
                elif risk >= 4:
                    risk_levels["medium"] += 1
                else:
                    risk_levels["low"] += 1
            
            print(f"   🔴 High risk (7+): {risk_levels['high']}")
            print(f"   🟡 Medium risk (4-6): {risk_levels['medium']}")
            print(f"   🟢 Low risk (1-3): {risk_levels['low']}")
            
            return True
        return False
    except Exception as e:
        print(f"   Error: {e}")
        return False


def main():
    print("=" * 50)
    print("🛡️ PROJECT VALKYRIE - Asset Seeding Script")
    print("=" * 50)
    
    # Check database access
    if not check_database_exists():
        print("\n💡 Tip: Make sure you've:")
        print("   1. Created a database in Notion")
        print("   2. Added the required properties:")
        print("      - Asset Name (Title)")
        print("      - Coordinates (Text)")
        print("      - Risk Sensitivity (Number)")
        print("   3. Shared the database with your integration")
        sys.exit(1)
    
    # Clear existing if requested
    if os.getenv("CLEAR_EXISTING", "").lower() == "true":
        # Note: Notion API doesn't support bulk delete, would need to archive each page
        print("⚠️  CLEAR_EXISTING is set but bulk delete is not implemented")
    
    # Seed assets
    success, errors = seed_assets()
    
    # Verify
    if success > 0:
        verify_seeding()
    
    print("\n✨ Seeding complete!")
    print("\nNext steps:")
    print("   1. Open your Notion database to verify the assets")
    print("   2. Create a Gallery view with risk emoji formula")
    print("   3. Run the MCP server to start monitoring")


if __name__ == "__main__":
    main()
