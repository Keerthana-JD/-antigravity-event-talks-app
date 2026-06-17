import os
import time
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    "data": None,
    "last_fetched": 0,
    "ttl": 900  # 15 minutes default TTL
}

def parse_feed():
    try:
        response = requests.get(FEED_URL, timeout=10)
        if response.status_code != 200:
            return None, f"Failed to fetch feed, status code: {response.status_code}"
        
        xml_data = response.content
        root = ET.fromstring(xml_data)
        
        # XML Namespace for Atom
        namespaces = {
            'atom': 'http://www.w3.org/2005/Atom'
        }
        
        parsed_entries = []
        
        for entry in root.findall('atom:entry', namespaces):
            title_elem = entry.find('atom:title', namespaces)
            id_elem = entry.find('atom:id', namespaces)
            updated_elem = entry.find('atom:updated', namespaces)
            link_elem = entry.find('atom:link', namespaces)
            content_elem = entry.find('atom:content', namespaces)
            
            entry_title = title_elem.text if title_elem is not None else "Unknown Date"
            entry_id = id_elem.text if id_elem is not None else ""
            entry_updated = updated_elem.text if updated_elem is not None else ""
            entry_link = link_elem.attrib.get('href') if link_elem is not None else ""
            content_html = content_elem.text if content_elem is not None else ""
            
            # Parse HTML content to extract multiple updates if present
            soup = BeautifulSoup(content_html, 'html.parser')
            updates = []
            
            current_type = "Update"
            current_content_parts = []
            
            # Go through elements to split by h3 tags
            for child in soup.contents:
                if child.name == 'h3':
                    # If we already have accumulated content, save it as an update
                    if current_content_parts:
                        html_content = "".join(str(c) for c in current_content_parts).strip()
                        text_content = "".join(c.get_text() if hasattr(c, 'get_text') else str(c) for c in current_content_parts).strip()
                        updates.append({
                            "type": current_type,
                            "html": html_content,
                            "text": text_content
                        })
                        current_content_parts = []
                    current_type = child.get_text().strip()
                else:
                    if str(child).strip():
                        current_content_parts.append(child)
            
            # Add the last remaining update section
            if current_content_parts:
                html_content = "".join(str(c) for c in current_content_parts).strip()
                text_content = "".join(c.get_text() if hasattr(c, 'get_text') else str(c) for c in current_content_parts).strip()
                updates.append({
                    "type": current_type,
                    "html": html_content,
                    "text": text_content
                })
                
            # If no updates parsed but we have content HTML, add standard fallback
            if not updates and content_html.strip():
                updates.append({
                    "type": "Update",
                    "html": content_html.strip(),
                    "text": soup.get_text().strip()
                })
                
            parsed_entries.append({
                "title": entry_title,
                "id": entry_id,
                "updated": entry_updated,
                "link": entry_link,
                "updates": updates
            })
            
        return parsed_entries, None
        
    except Exception as e:
        return None, f"Error parsing XML feed: {str(e)}"

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/releases")
def get_releases():
    force_refresh = request.args.get("refresh", "false").lower() == "true"
    current_time = time.time()
    
    # Check if cache is valid and not expired
    if not force_refresh and cache["data"] is not None and (current_time - cache["last_fetched"]) < cache["ttl"]:
        return jsonify({
            "success": True,
            "source": "cache",
            "last_fetched": cache["last_fetched"],
            "data": cache["data"]
        })
        
    # Fetch fresh data
    data, error = parse_feed()
    if error:
        # If fetch failed but we have cached data, fallback to cache
        if cache["data"] is not None:
            return jsonify({
                "success": True,
                "source": "cache_fallback",
                "error": error,
                "last_fetched": cache["last_fetched"],
                "data": cache["data"]
            })
        return jsonify({
            "success": False,
            "error": error
        }), 500
        
    # Update cache
    cache["data"] = data
    cache["last_fetched"] = current_time
    
    return jsonify({
        "success": True,
        "source": "network",
        "last_fetched": current_time,
        "data": data
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
