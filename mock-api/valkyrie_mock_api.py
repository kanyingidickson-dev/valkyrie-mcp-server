"""
PROJECT VALKYRIE: Global Threat Simulator
=========================================
A FastAPI-based mock API that simulates real-time global threats
for testing the Valkyrie MCP Server without using real API credits.

This simulator generates randomized environmental, geopolitical,
and infrastructure threats for demo purposes.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import random
import uvicorn
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

app = FastAPI(
    title="Valkyrie Threat Simulator",
    description="Mock API for simulating global crisis threats",
    version="1.0.0"
)

# Enable CORS for cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock Data Sources - MATCHING SEED SCRIPT ASSET NAMES
LOCATIONS = [
    "Singapore Distribution Hub",
    "Rotterdam Port Terminal", 
    "Memphis Air Freight Center",
    "Tokyo Data Vault",
    "Panama Canal Logistics Zone",
    "Dubai Free Zone Warehouse",
    "Sydney Pacific Hub",
    "São Paulo South American Center"
]

THREAT_TYPES = ["Environmental", "Geopolitical", "Infrastructure"]

DESCRIPTIONS = {
    "Environmental": [
        "Tropical storm developing within 50 miles. Wind speeds estimated at 85 mph.",
        "Seismic activity detected; magnitude 4.2. Aftershocks possible.",
        "Flash flood warning in effect. Expected rainfall: 150mm in 6 hours.",
        "Wildfire reported 20km from facility. Air quality index elevated.",
        "Typhoon trajectory updated. Landfall expected in 18 hours."
    ],
    "Geopolitical": [
        "Localized protest blocking main access road. Estimated clearance: 4 hours.",
        "Port authority strike scheduled for 06:00 UTC. Duration unknown.",
        "Trade restriction advisory issued. Customs clearance delays expected.",
        "Civil unrest reported in downtown area. Avoid non-essential travel.",
        "Government facility lockdown affecting nearby logistics routes."
    ],
    "Infrastructure": [
        "Grid instability reported in the industrial sector. Backup power recommended.",
        "Fiber-optic backbone maintenance causing 40% packet loss. ETA: 6 hours.",
        "Cooling system failure at data center. Temperature rising.",
        "Bridge inspection required on primary route. Alternative routing advised.",
        "Water supply disruption affecting industrial zone. Tanker delivery arranged."
    ]
}

MITIGATION_SUGGESTIONS = {
    "Environmental": [
        "Activate storm protocols. Secure outdoor equipment.",
        "Initiate earthquake response procedure. Check structural integrity.",
        "Elevate critical inventory. Activate drainage systems.",
        "Monitor air filtration systems. Prepare evacuation routes.",
        "Begin typhoon preparation checklist. Secure all loose items."
    ],
    "Geopolitical": [
        "Identify alternative access routes. Delay non-critical shipments.",
        "Pre-clear cargo before strike deadline. Consider alternative ports.",
        "Review customs documentation. Prepare for extended processing times.",
        "Restrict personnel movement. Enable remote work protocols.",
        "Reroute shipments around affected government zone."
    ],
    "Infrastructure": [
        "Switch to backup power generation. Test UPS systems.",
        "Enable redundant network paths. Notify IT support.",
        "Activate auxiliary cooling. Monitor server temperatures.",
        "Divert traffic to secondary routes. Update GPS systems.",
        "Coordinate with water tanker service. Reduce non-essential usage."
    ]
}

# Persistent forced alerts
forced_alerts = {}


class ThreatResponse(BaseModel):
    """Response model for threat status"""
    location: str
    status: str
    threat_level: int
    category: Optional[str] = None
    summary: Optional[str] = None
    mitigation: Optional[str] = None
    timestamp: str
    affected_systems: Optional[list] = None


class HealthResponse(BaseModel):
    """Response model for health check"""
    status: str
    version: str
    uptime: str


START_TIME = datetime.utcnow()


@app.get("/", response_model=dict)
async def root():
    """Root endpoint with API information"""
    return {
        "name": "Valkyrie Threat Simulator",
        "version": "1.0.0",
        "endpoints": [
            "/status/{location} - Get threat status for a location",
            "/health - API health check",
            "/locations - List all available locations",
            "/trigger/{location} - Force a threat for testing"
        ]
    }


@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint"""
    uptime = datetime.utcnow() - START_TIME
    return {
        "status": "operational",
        "version": "1.0.0",
        "uptime": str(uptime).split('.')[0]  # Remove microseconds
    }


@app.get("/locations")
async def list_locations():
    """List all available locations for testing"""
    return {
        "locations": LOCATIONS,
        "count": len(LOCATIONS)
    }


@app.get("/status/{location}", response_model=ThreatResponse)
async def get_location_threat(location: str):
    """
    Simulates a real-time risk check for a specific asset location.
    
    30% chance of a critical threat to keep the 'human-in-the-loop' testing interesting.
    """
    # Normalize location name
    normalized_location = location.strip().lower()
    matched_location = next(
        (loc for loc in LOCATIONS if loc.lower() == normalized_location),
        location  # Use original if no match
    )
    
    # Check if forced alert exists
    if matched_location in forced_alerts:
        return forced_alerts[matched_location]
    
    # 30% chance of a critical threat
    has_threat = random.random() < 0.3
    
    if not has_threat:
        return ThreatResponse(
            location=matched_location,
            status="Stable",
            threat_level=0,
            timestamp=datetime.utcnow().isoformat()
        )
    
    # Generate threat details
    threat_category = random.choice(THREAT_TYPES)
    threat_level = random.randint(7, 10)
    summary = random.choice(DESCRIPTIONS[threat_category])
    mitigation = random.choice(MITIGATION_SUGGESTIONS[threat_category])
    
    # Determine affected systems based on category
    affected_systems = {
        "Environmental": ["logistics", "personnel", "infrastructure"],
        "Geopolitical": ["logistics", "customs", "personnel"],
        "Infrastructure": ["power", "network", "operations"]
    }.get(threat_category, ["operations"])
    
    return ThreatResponse(
        location=matched_location,
        status="Alert",
        threat_level=threat_level,
        category=threat_category,
        summary=summary,
        mitigation=mitigation,
        timestamp=datetime.utcnow().isoformat(),
        affected_systems=affected_systems
    )


@app.get("/trigger/{location}", response_model=ThreatResponse)
async def trigger_threat(location: str, category: Optional[str] = None):
    """
    Force a threat event for testing/demo purposes.
    Optionally specify a category: Environmental, Geopolitical, or Infrastructure
    """
    normalized_location = location.strip().lower()
    matched_location = next(
        (loc for loc in LOCATIONS if loc.lower() == normalized_location),
        location
    )
    
    # Use specified category or random
    threat_category = category if category in THREAT_TYPES else random.choice(THREAT_TYPES)
    threat_level = random.randint(8, 10)  # High threat for demos
    summary = random.choice(DESCRIPTIONS[threat_category])
    mitigation = random.choice(MITIGATION_SUGGESTIONS[threat_category])
    
    affected_systems = {
        "Environmental": ["logistics", "personnel", "infrastructure"],
        "Geopolitical": ["logistics", "customs", "personnel"],
        "Infrastructure": ["power", "network", "operations"]
    }.get(threat_category, ["operations"])
    
    threat_response = ThreatResponse(
        location=matched_location,
        status="Alert",
        threat_level=threat_level,
        category=threat_category,
        summary=summary,
        mitigation=mitigation,
        timestamp=datetime.utcnow().isoformat(),
        affected_systems=affected_systems
    )
    
    # Store in forced_alerts
    forced_alerts[matched_location] = threat_response
    
    return threat_response


@app.get("/clear/{location}", response_model=ThreatResponse)
async def clear_threat(location: str):
    """Clear any threat and return stable status"""
    normalized_location = location.strip().lower()
    matched_location = next(
        (loc for loc in LOCATIONS if loc.lower() == normalized_location),
        location
    )
    
    return ThreatResponse(
        location=matched_location,
        status="Stable",
        threat_level=0,
        timestamp=datetime.utcnow().isoformat()
    )


@app.get("/batch/scan")
async def batch_scan():
    """Scan all locations and return threats"""
    results = []
    
    for location in LOCATIONS:
        # 20% chance per location for batch scan
        if random.random() < 0.2:
            threat_category = random.choice(THREAT_TYPES)
            results.append({
                "location": location,
                "status": "Alert",
                "threat_level": random.randint(7, 10),
                "category": threat_category,
                "summary": random.choice(DESCRIPTIONS[threat_category]),
                "timestamp": datetime.utcnow().isoformat()
            })
        else:
            results.append({
                "location": location,
                "status": "Stable",
                "threat_level": 0,
                "timestamp": datetime.utcnow().isoformat()
            })
    
    return {
        "scan_time": datetime.utcnow().isoformat(),
        "total_assets": len(LOCATIONS),
        "alerts": sum(1 for r in results if r["status"] == "Alert"),
        "results": results
    }


if __name__ == "__main__":
    print("🛡️ Starting Valkyrie Threat Simulator...")
    print("📍 Available locations:", LOCATIONS)
    print("🌐 API running at: http://localhost:8000")
    print("📚 Docs available at: http://localhost:8000/docs")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
