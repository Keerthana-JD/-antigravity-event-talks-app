// Global App State
let releases = [];
let bookmarks = [];
let activeFilters = {
    search: '',
    category: 'all',
    sort: 'newest',
    bookmarksOnly: false
};
let lastFetchedTime = null;
let activeTweetData = null; // Stores date, link, text and type for active tweet modal

// DOM Elements
const elements = {
    refreshBtn: document.getElementById('refresh-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    lastUpdatedText: document.getElementById('last-updated-text'),
    loader: document.getElementById('loader'),
    errorMessage: document.getElementById('error-message'),
    errorText: document.getElementById('error-text'),
    retryBtn: document.getElementById('retry-btn'),
    noResults: document.getElementById('no-results'),
    feedContainer: document.getElementById('feed-container'),
    searchInput: document.getElementById('search-input'),
    categoryFilter: document.getElementById('category-filter'),
    sortOrder: document.getElementById('sort-order'),
    toggleBookmarksFilter: document.getElementById('toggle-bookmarks-filter'),
    clearFiltersBtn: document.getElementById('clear-filters-btn'),
    
    // Stats elements
    statFeatures: document.getElementById('stat-features'),
    statAnnouncements: document.getElementById('stat-announcements'),
    statIssues: document.getElementById('stat-issues'),
    statBookmarks: document.getElementById('stat-bookmarks'),
    
    // Sidebar elements
    sidebarBookmarksList: document.getElementById('sidebar-bookmarks-list'),
    bookmarksCountBadge: document.getElementById('bookmarks-count-badge'),
    
    // Tweet Modal Elements
    tweetModal: document.getElementById('tweet-modal'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    cancelModalBtn: document.getElementById('cancel-modal-btn'),
    shareTweetBtn: document.getElementById('share-tweet-btn'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    tweetLinkText: document.getElementById('tweet-link-text'),
    charProgressCircle: document.getElementById('char-progress-circle'),
    charCount: document.getElementById('char-count'),
    templateButtons: document.querySelectorAll('.template-btn'),
    
    // Toast Element
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    // 1. Load bookmarks from localStorage
    loadBookmarks();
    
    // 2. Load theme settings from localStorage
    loadTheme();
    
    // 3. Bind Event Listeners
    setupEventListeners();
    
    // 4. Fetch release notes
    fetchReleases();
    
    // Initialize Lucide Icons
    lucide.createIcons();
});

// Setup Event Listeners
function setupEventListeners() {
    // Refresh button
    elements.refreshBtn.addEventListener('click', () => fetchReleases(true));
    elements.retryBtn.addEventListener('click', () => fetchReleases(true));
    
    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Search and filters
    elements.searchInput.addEventListener('input', debounce((e) => {
        activeFilters.search = e.target.value.trim().toLowerCase();
        applyFiltersAndRender();
    }, 250));
    
    elements.categoryFilter.addEventListener('change', (e) => {
        activeFilters.category = e.target.value;
        applyFiltersAndRender();
    });
    
    elements.sortOrder.addEventListener('change', (e) => {
        activeFilters.sort = e.target.value;
        applyFiltersAndRender();
    });
    
    elements.toggleBookmarksFilter.addEventListener('click', () => {
        activeFilters.bookmarksOnly = !activeFilters.bookmarksOnly;
        elements.toggleBookmarksFilter.classList.toggle('active', activeFilters.bookmarksOnly);
        applyFiltersAndRender();
    });
    
    elements.clearFiltersBtn.addEventListener('click', resetFilters);
    
    // Modal controls
    elements.closeModalBtn.addEventListener('click', hideTweetModal);
    elements.cancelModalBtn.addEventListener('click', hideTweetModal);
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) hideTweetModal();
    });
    
    // Tweet composer textarea changes
    elements.tweetTextarea.addEventListener('input', updateCharCounter);
    
    // Template selections
    elements.templateButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            elements.templateButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const templateId = btn.getAttribute('data-template-id');
            applyTweetTemplate(templateId);
        });
    });
    
    // Share on X/Twitter
    elements.shareTweetBtn.addEventListener('click', publishTweet);
    
    // Event delegation for cards (Bookmarks, Tweet, Copy)
    elements.feedContainer.addEventListener('click', handleCardActions);
    
    // Timer to update last-updated timestamp
    setInterval(updateLastUpdatedTimeText, 60000);
}

// Fetch Release Notes from Backend API
async function fetchReleases(forceRefresh = false) {
    showLoading(true);
    
    const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
    
    try {
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            releases = result.data;
            lastFetchedTime = new Date(result.last_fetched * 1000);
            
            showLoading(false);
            elements.errorMessage.classList.add('hidden');
            
            // Build / apply content
            updateStats();
            applyFiltersAndRender();
            updateLastUpdatedTimeText();
            renderSidebarBookmarks();
            
            if (forceRefresh) {
                showToast("Release notes synchronized successfully!");
            }
        } else {
            throw new Error(result.error || "Failed to load data from server");
        }
    } catch (error) {
        console.error("Error fetching release notes:", error);
        showLoading(false);
        elements.errorText.textContent = error.message || "Could not connect to Flask API server.";
        elements.errorMessage.classList.remove('hidden');
        elements.feedContainer.innerHTML = '';
        showToast("Error updating release notes.", "error");
    }
}

// Show/Hide Loading Spinner states
function showLoading(isLoading) {
    const refreshIcon = elements.refreshBtn.querySelector('i');
    const statusDot = document.querySelector('.status-dot');
    
    if (isLoading) {
        elements.loader.classList.remove('hidden');
        elements.feedContainer.classList.add('hidden');
        elements.noResults.classList.add('hidden');
        refreshIcon.classList.add('spinning');
        elements.refreshBtn.disabled = true;
        
        statusDot.className = 'status-dot loading';
        elements.lastUpdatedText.textContent = "Fetching updates...";
    } else {
        elements.loader.classList.add('hidden');
        elements.feedContainer.classList.remove('hidden');
        refreshIcon.classList.remove('spinning');
        elements.refreshBtn.disabled = false;
        
        statusDot.className = 'status-dot green';
    }
}

// Reset all search and category filters
function resetFilters() {
    activeFilters.search = '';
    activeFilters.category = 'all';
    activeFilters.bookmarksOnly = false;
    
    elements.searchInput.value = '';
    elements.categoryFilter.value = 'all';
    elements.toggleBookmarksFilter.classList.remove('active');
    
    applyFiltersAndRender();
}

// Map the GCP heading text to logical categories
function categorizeType(typeText) {
    const t = typeText.toLowerCase();
    if (t.includes('feature') || t.includes('new')) return 'Feature';
    if (t.includes('announcement') || t.includes('notice')) return 'Announcement';
    if (t.includes('issue') || t.includes('bug') || t.includes('fix') || t.includes('resolved') || t.includes('known issue')) return 'Issue';
    if (t.includes('changed') || t.includes('update')) return 'Changed';
    if (t.includes('deprecated') || t.includes('removal')) return 'Deprecated';
    return 'Other';
}

// Build counts of different categories
function updateStats() {
    let features = 0;
    let announcements = 0;
    let issues = 0;
    
    releases.forEach(entry => {
        entry.updates.forEach(upd => {
            const cat = categorizeType(upd.type);
            if (cat === 'Feature') features++;
            else if (cat === 'Announcement') announcements++;
            else if (cat === 'Issue') issues++;
        });
    });
    
    // Animate numbers simple tick
    animateNumber(elements.statFeatures, features);
    animateNumber(elements.statAnnouncements, announcements);
    animateNumber(elements.statIssues, issues);
    animateNumber(elements.statBookmarks, bookmarks.length);
    elements.bookmarksCountBadge.textContent = bookmarks.length;
}

// Animate numbers for nice transitions
function animateNumber(element, target) {
    let current = parseInt(element.textContent) || 0;
    if (current === target) return;
    
    const step = Math.ceil(Math.abs(target - current) / 10);
    const direction = target > current ? 1 : -1;
    
    const timer = setInterval(() => {
        current += step * direction;
        if ((direction === 1 && current >= target) || (direction === -1 && current <= target)) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = current;
    }, 30);
}

// Filter and render the cards
function applyFiltersAndRender() {
    let list = [];
    
    // Unpack updates to a flat list for filtering
    releases.forEach(entry => {
        entry.updates.forEach((upd, idx) => {
            const updateId = `${entry.id}_${idx}`;
            const isBookmarked = bookmarks.includes(updateId);
            const category = categorizeType(upd.type);
            
            // Check bookmarks filter
            if (activeFilters.bookmarksOnly && !isBookmarked) return;
            
            // Check category filter
            if (activeFilters.category !== 'all' && category !== activeFilters.category) return;
            
            // Check search query
            if (activeFilters.search) {
                const searchMatch = 
                    upd.type.toLowerCase().includes(activeFilters.search) || 
                    upd.text.toLowerCase().includes(activeFilters.search) ||
                    entry.title.toLowerCase().includes(activeFilters.search);
                if (!searchMatch) return;
            }
            
            list.push({
                updateId,
                dateTitle: entry.title,
                dateUpdated: entry.updated,
                link: entry.link,
                type: upd.type,
                html: upd.html,
                text: upd.text,
                category,
                isBookmarked
            });
        });
    });
    
    // Apply sorting
    if (activeFilters.sort === 'newest') {
        list.sort((a, b) => new Date(b.dateUpdated) - new Date(a.dateUpdated));
    } else {
        list.sort((a, b) => new Date(a.dateUpdated) - new Date(b.dateUpdated));
    }
    
    // Group back by date for rendering
    renderFeed(list);
}

// Render the feed
function renderFeed(updatesList) {
    if (updatesList.length === 0) {
        elements.feedContainer.classList.add('hidden');
        elements.noResults.classList.remove('hidden');
        return;
    }
    
    elements.noResults.classList.add('hidden');
    elements.feedContainer.classList.remove('hidden');
    
    // Group updates by date
    const groups = {};
    updatesList.forEach(upd => {
        if (!groups[upd.dateTitle]) {
            groups[upd.dateTitle] = [];
        }
        groups[upd.dateTitle].push(upd);
    });
    
    let html = '';
    
    // Create DOM structure
    Object.keys(groups).forEach(date => {
        html += `
            <div class="date-group">
                <div class="date-header">
                    <span class="date-title">${date}</span>
                    <div class="date-line"></div>
                </div>
        `;
        
        groups[date].forEach(upd => {
            const starClass = upd.isBookmarked ? 'active star-icon-filled' : '';
            const starIcon = upd.isBookmarked ? 'star' : 'star';
            const badgeClass = `badge-${upd.category.toLowerCase()}`;
            
            html += `
                <article class="update-card card type-${upd.category.toLowerCase()}" id="card-${upd.updateId}" data-id="${upd.updateId}" data-date="${upd.dateTitle}" data-link="${upd.link}" data-type="${upd.category}">
                    <div class="update-card-header">
                        <span class="badge ${badgeClass}">
                            <i data-lucide="${getCategoryIcon(upd.category)}"></i>
                            ${upd.type}
                        </span>
                        
                        <div class="card-header-actions">
                            <button class="action-btn star-btn ${starClass}" data-action="bookmark" title="Bookmark update">
                                <i data-lucide="${starIcon}"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="update-card-body">
                        ${upd.html}
                    </div>
                    
                    <div class="update-card-footer">
                        <button class="footer-btn copy-btn" data-action="copy" title="Copy text">
                            <i data-lucide="copy"></i>
                            <span>Copy</span>
                        </button>
                        <button class="footer-btn star-btn ${starClass}" data-action="bookmark">
                            <i data-lucide="star"></i>
                            <span>${upd.isBookmarked ? 'Starred' : 'Star'}</span>
                        </button>
                        <button class="footer-btn tweet-btn" data-action="tweet">
                            <i data-lucide="twitter"></i>
                            <span>Tweet</span>
                        </button>
                    </div>
                </article>
            `;
        });
        
        html += `</div>`; // Close date-group
    });
    
    elements.feedContainer.innerHTML = html;
    
    // Re-trigger Lucide icon renderer
    lucide.createIcons();
}

// Map logical categories to Lucide icons
function getCategoryIcon(category) {
    switch(category) {
        case 'Feature': return 'rocket';
        case 'Announcement': return 'megaphone';
        case 'Issue': return 'alert-triangle';
        case 'Changed': return 'git-commit';
        case 'Deprecated': return 'trash-2';
        default: return 'info';
    }
}

// Handle action triggers via event delegation
function handleCardActions(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    
    const card = btn.closest('.update-card');
    if (!card) return;
    
    const updateId = card.getAttribute('data-id');
    const action = btn.getAttribute('data-action') || (btn.classList.contains('tweet-btn') ? 'tweet' : '');
    
    // Locate the update object
    let updateObj = null;
    for (let entry of releases) {
        const idx = entry.updates.findIndex((u, i) => `${entry.id}_${i}` === updateId);
        if (idx !== -1) {
            updateObj = {
                id: updateId,
                date: entry.title,
                link: entry.link,
                type: categorizeType(entry.updates[idx].type),
                text: entry.updates[idx].text,
                html: entry.updates[idx].html
            };
            break;
        }
    }
    
    if (!updateObj) return;
    
    if (action === 'bookmark') {
        toggleBookmark(updateId);
    } else if (action === 'tweet') {
        showTweetModal(updateObj);
    } else if (action === 'copy') {
        copyToClipboard(updateObj.text, card.querySelector('.update-card-body'));
    }
}

// Bookmark Toggle management
function toggleBookmark(id) {
    const index = bookmarks.indexOf(id);
    let starred = false;
    
    if (index === -1) {
        bookmarks.push(id);
        starred = true;
        showToast("Bookmark added!");
    } else {
        bookmarks.splice(index, 1);
        showToast("Bookmark removed!");
    }
    
    // Save to local storage
    localStorage.setItem('bq_radar_bookmarks', JSON.stringify(bookmarks));
    
    // Update visual count indicator & Sidebar list
    updateStats();
    renderSidebarBookmarks();
    
    // Toggle active state on corresponding card elements (in case multiple elements exist)
    const cards = document.querySelectorAll(`[data-id="${id}"]`);
    cards.forEach(card => {
        const starBtns = card.querySelectorAll('.star-btn');
        starBtns.forEach(btn => {
            btn.classList.toggle('active', starred);
            btn.classList.toggle('star-icon-filled', starred);
            const span = btn.querySelector('span');
            if (span) span.textContent = starred ? 'Starred' : 'Star';
        });
    });
    
    // Reapply filters if Bookmarks Only mode is checked
    if (activeFilters.bookmarksOnly) {
        applyFiltersAndRender();
    }
}

// Load Bookmarks from localStorage
function loadBookmarks() {
    const saved = localStorage.getItem('bq_radar_bookmarks');
    if (saved) {
        try {
            bookmarks = JSON.parse(saved);
        } catch (e) {
            bookmarks = [];
        }
    }
}

// Render Bookmarks Sidebar
function renderSidebarBookmarks() {
    if (bookmarks.length === 0) {
        elements.sidebarBookmarksList.innerHTML = `<p class="empty-state">No bookmarked updates. Star an update card to access it quickly here!</p>`;
        return;
    }
    
    let html = '';
    let foundBookmarks = 0;
    
    // Scan all loaded release updates
    releases.forEach(entry => {
        entry.updates.forEach((upd, idx) => {
            const updateId = `${entry.id}_${idx}`;
            if (bookmarks.includes(updateId)) {
                foundBookmarks++;
                const cat = categorizeType(upd.type);
                const badgeClass = `badge-${cat.toLowerCase()}`;
                
                html += `
                    <div class="sidebar-bookmark-item" data-target-id="card-${updateId}">
                        <div class="bookmark-item-header">
                            <span class="bookmark-item-title">${entry.title}</span>
                            <span class="bookmark-item-type badge ${badgeClass}" style="transform: scale(0.8); transform-origin: right center; padding: 0.15rem 0.45rem;">
                                ${cat}
                            </span>
                        </div>
                        <div class="bookmark-item-text">${upd.text}</div>
                    </div>
                `;
            }
        });
    });
    
    elements.sidebarBookmarksList.innerHTML = html;
    
    // Attach click scrolling event
    const items = elements.sidebarBookmarksList.querySelectorAll('.sidebar-bookmark-item');
    items.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target-id');
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Add highlight blink effect
                targetEl.classList.add('glowing-glow');
                targetEl.style.transition = 'box-shadow 0.5s ease-in-out';
                targetEl.style.boxShadow = '0 0 20px var(--accent-color)';
                setTimeout(() => {
                    targetEl.style.boxShadow = '';
                }, 1500);
            }
        });
    });
}

// Copy update details helper
function copyToClipboard(text, element) {
    navigator.clipboard.writeText(text).then(() => {
        showToast("Copied to clipboard!");
        
        // Brief visual indicator on the text content
        if (element) {
            element.style.opacity = '0.5';
            setTimeout(() => {
                element.style.opacity = '1';
            }, 150);
        }
    }).catch(err => {
        console.error("Could not copy text:", err);
        showToast("Copy failed", "error");
    });
}

// Update Last-Updated Timestamp Text
function updateLastUpdatedTimeText() {
    if (!lastFetchedTime) return;
    
    const now = new Date();
    const diffMs = now - lastFetchedTime;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) {
        elements.lastUpdatedText.textContent = "Last updated: Just now";
    } else if (diffMins === 1) {
        elements.lastUpdatedText.textContent = "Last updated: 1 min ago";
    } else {
        elements.lastUpdatedText.textContent = `Last updated: ${diffMins} mins ago`;
    }
}

// Toast Manager
let toastTimeout = null;
function showToast(message, type = "success") {
    clearTimeout(toastTimeout);
    
    elements.toastMessage.textContent = message;
    
    const icon = elements.toast.querySelector('i');
    if (type === "success") {
        elements.toast.style.borderColor = 'var(--accent-green)';
        icon.className = 'toast-icon';
        icon.setAttribute('data-lucide', 'check-circle');
    } else {
        elements.toast.style.borderColor = 'var(--accent-red)';
        icon.className = 'toast-icon text-danger';
        icon.setAttribute('data-lucide', 'alert-circle');
    }
    
    lucide.createIcons();
    elements.toast.classList.add('active');
    
    toastTimeout = setTimeout(() => {
        elements.toast.classList.remove('active');
    }, 3000);
}

// Theme Controls
function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    document.body.classList.toggle('dark-theme', !isLight);
    
    localStorage.setItem('bq_radar_theme', isLight ? 'light' : 'dark');
}

function loadTheme() {
    const saved = localStorage.getItem('bq_radar_theme');
    if (saved === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
    }
}

// Tweet Composer Modal Management
function showTweetModal(update) {
    activeTweetData = update;
    
    // Set link URL
    const anchor = `#June_16_2026`; // Example anchor derived from title or update id
    // BigQuery links look like: https://docs.cloud.google.com/bigquery/docs/release-notes#June_16_2026
    // If update.link is available, use it, else default
    const tweetLink = update.link || "https://docs.cloud.google.com/bigquery/docs/release-notes";
    
    elements.tweetLinkText.textContent = tweetLink;
    
    // Activate default template
    elements.templateButtons.forEach(b => b.classList.remove('active'));
    elements.templateButtons[0].classList.add('active'); // default standard
    
    applyTweetTemplate('default');
    
    // Open modal
    elements.tweetModal.classList.add('active');
    elements.tweetTextarea.focus();
}

function hideTweetModal() {
    elements.tweetModal.classList.remove('active');
    activeTweetData = null;
}

// Templates configuration
function applyTweetTemplate(templateId) {
    if (!activeTweetData) return;
    
    const date = activeTweetData.date;
    const type = activeTweetData.type;
    const text = activeTweetData.text;
    const link = activeTweetData.link || "https://docs.cloud.google.com/bigquery/docs/release-notes";
    
    // Clean text by removing excess spacing/newlines
    let cleanText = text.replace(/\s+/g, ' ').trim();
    
    let tweetText = "";
    
    switch (templateId) {
        case 'summary':
            tweetText = `Here's a new BigQuery ${type} update (${date}):\n\n"${truncateText(cleanText, 140)}"\n\nRead more details here: ${link}`;
            break;
            
        case 'excited':
            tweetText = `Google Cloud just released a new BigQuery ${type}! 🚀\n\n"${truncateText(cleanText, 130)}"\n\n👉 Info: ${link} #BigQuery #GoogleCloud #GCP`;
            break;
            
        case 'default':
        default:
            tweetText = `BigQuery ${type} Update (${date}):\n"${truncateText(cleanText, 160)}"\n\nSource: ${link}`;
            break;
    }
    
    elements.tweetTextarea.value = tweetText;
    updateCharCounter();
}

// Truncate text utility
function truncateText(text, maxLen) {
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen - 3) + "...";
}

// Circular progress SVG and count logic
function updateCharCounter() {
    const len = elements.tweetTextarea.value.length;
    const limit = 280;
    const remaining = limit - len;
    
    elements.charCount.textContent = remaining;
    
    // Character Progress Ring
    const radius = 14;
    const circumference = 2 * Math.PI * radius; // 87.96
    
    // SVG circular indicator
    elements.charProgressCircle.style.strokeDasharray = circumference;
    
    // Handle character limit styles
    if (remaining <= 0) {
        // Red, fully filled
        elements.charProgressCircle.style.strokeDashoffset = 0;
        elements.charProgressCircle.style.stroke = 'var(--accent-red)';
        elements.charCount.className = 'danger';
        elements.shareTweetBtn.disabled = true;
    } else {
        const offset = circumference - (Math.min(len, limit) / limit) * circumference;
        elements.charProgressCircle.style.strokeDashoffset = offset;
        elements.shareTweetBtn.disabled = false;
        
        if (remaining <= 20) {
            elements.charProgressCircle.style.stroke = 'var(--accent-yellow)';
            elements.charCount.className = 'warning';
        } else {
            elements.charProgressCircle.style.stroke = 'var(--accent-blue)';
            elements.charCount.className = '';
        }
    }
}

// Publish tweet URL
function publishTweet() {
    const finalTweet = elements.tweetTextarea.value;
    const encodedText = encodeURIComponent(finalTweet);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    hideTweetModal();
    showToast("Twitter intent opened!");
}

// Debounce helper to prevent heavy execution while typing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
