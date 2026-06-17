# 📡 BigQuery Release Radar

Track and share the latest Google Cloud BigQuery releases and feature updates in real time. **BigQuery Release Radar** is a web dashboard that aggregates Google's Atom feed, segments release notes into individual elements, and provides a polished developer dashboard to search, bookmark, and compose posts for X (Twitter).

---

## 🚀 Quick Start

### 1. Prerequisites
Make sure Python is installed on your system.

### 2. Install Dependencies
Run the following command to install the required Python packages:
```bash
pip install flask requests beautifulsoup4
```

### 3. Run the Server
Launch the Flask development server:
```bash
python app.py
```



---

## 🛠️ Architecture & Core Files

The project has a lightweight and highly organized structure:

* **[app.py](file:///C:/Users/KEERTHANA%20J%20D/vibe-project/app.py)**: The main entry point. Fetches the Atom RSS feed from GCP, parses and divides daily entries into distinct updates using BeautifulSoup, and implements a 15-minute in-memory cache.
* **[templates/index.html](file:///C:/Users/KEERTHANA%20J%20D/vibe-project/templates/index.html)**: The frontend layout featuring dashboard stats, filtering controls, feed sections, sidebar bookmarks drawer, and X post modal.
* **[static/css/style.css](file:///C:/Users/KEERTHANA%20J%20D/vibe-project/static/css/style.css)**: Modern glassmorphic styles with responsive grid sizing, category-colored glows, custom keyframe animation, and light/dark theme variables.
* **[static/js/app.js](file:///C:/Users/KEERTHANA%20J%20D/vibe-project/static/js/app.js)**: Handles all dashboard logic: fetching, filtering, real-time search, bookmarks synced with `localStorage`, scrolling effects, and SVG progress trackers.
* **[.gitignore](file:///C:/Users/KEERTHANA%20J%20D/vibe-project/.gitignore)**: Standard pattern ignores for Python, environments, IDE setups, and system logs.

---

## ✨ Features

### 🔄 Dynamic Sync & Refresh
* Clicking **Refresh** triggers a spinning loader, clears the backend cache, and requests a fresh XML feed from Google.
* The header features a synced status dot (turns blue/blinking during load, green when synced).

### 🔍 Search & Filtering
* **Debounced Search**: Typing dynamically filters updates by matching text in headers or descriptions (250ms debounce prevents lag).
* **Category Filters**: Dropdowns categorize updates into *Features, Announcements, Issues & Fixes, Changes, or Deprecations*.
* **Sorting**: Toggle feed lists between *Newest First* and *Oldest First*.

### ⭐ LocalStorage Bookmarking & Navigation
* Star updates to save them. A persistent counter updates in the header stats.
* Bookmarked items are shown in a sidebar drawer.
* Clicking any sidebar item automatically scrolls your viewport directly to that card and flashes a quick vertical bounce animation (`pulse-glow`) to highlight the card.

### 🐦 Mock X (Twitter) Composer Modal
* Shows a customized tweet card matching the official X (Twitter) theme.
* **Templates**: Access *Standard Update*, *Summary & Link*, and *Tech Enthusiast* (prepopulated with hashtags `#BigQuery #GoogleCloud #GCP`).
* **Circular Character Tracker**: Displays a radial progress ring. Counts down from 280 characters, turning yellow/red and disabling the post button when limits are exceeded.
* **X Web Intent**: Clicking "Post on X" redirects to the secure Web Intent page in a new tab.

---

## 🎨 Theme Toggle
A theme switch in the header toggles between **Dark Mode** (default) and **Light Mode**. Your preference is saved in `localStorage` so it persists on reload.
