// Search Component Class
class ShaderSearchComponent {
    constructor() {
        this.availableTags = ['fragment', 'vertex', 'compute', 'animation', 'lighting', 'procedural', 'raytracing', 'pbr', 'particle', 'post-processing', 'geometry', 'texture'];
        this.currentParams = new URLSearchParams(window.location.search);
        this.searchForm = document.getElementById('search-form');
        this.searchInput = document.getElementById('search-input');
        this.tagFilters = document.getElementById('tag-filters');
        this.clearSearchBtn = document.getElementById('clear-search');
        this.clearAllBtn = document.getElementById('clear-all-filters');
        this.resultsCount = document.getElementById('results-count');
    }

    initialize() {
        this.setupEventListeners();
        this.renderTagFilters();
        this.updateUI();
        this.initializeFromURL();
    }

    initializeFromURL() {
        // Initialize search input from URL parameters
        const nameParam = this.currentParams.get('name');
        if (nameParam && this.searchInput) {
            this.searchInput.value = nameParam;
        }
    }

    setupEventListeners() {
        // Search form submission
        if (this.searchForm) {
            this.searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.performSearch();
            });
        }

        // Clear search button
        if (this.clearSearchBtn) {
            this.clearSearchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearSearch();
            });
        }

        // Clear all filters button
        if (this.clearAllBtn) {
            this.clearAllBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearAllFilters();
            });
        }

        // Search input enter key
        if (this.searchInput) {
            this.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.performSearch();
                }
            });
        }
    }

    renderTagFilters() {
        if (!this.tagFilters) return;

        const selectedTags = this.currentParams.getAll('tags');
        this.tagFilters.innerHTML = '';

        this.availableTags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag tag-filter';
            tagElement.textContent = tag;
            tagElement.dataset.tag = tag;

            // Mark as active if selected
            if (selectedTags.includes(tag)) {
                tagElement.classList.add('active');
            }

            tagElement.addEventListener('click', () => this.toggleTag(tag));
            this.tagFilters.appendChild(tagElement);
        });
    }

    performSearch() {
        const query = this.searchInput ? this.searchInput.value.trim() : '';
        
        if (query) {
            this.currentParams.set('name', query);
        } else {
            this.currentParams.delete('name');
        }

        this.updateURL();
    }

    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        this.currentParams.delete('name');
        this.updateURL();
    }

    toggleTag(tag) {
        const currentTags = this.currentParams.getAll('tags');
        
        if (currentTags.includes(tag)) {
            // Remove tag
            this.currentParams.delete('tags');
            currentTags.filter(t => t !== tag).forEach(t => this.currentParams.append('tags', t));
        } else {
            // Add tag
            this.currentParams.append('tags', tag);
        }

        this.updateURL();
    }

    clearAllFilters() {
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        this.currentParams.delete('name');
        this.currentParams.delete('tags');
        this.updateURL();
    }

    updateURL() {
        const newURL = window.location.pathname + 
                      (this.currentParams.toString() ? '?' + this.currentParams.toString() : '');
        window.location.href = newURL;
    }

    updateUI() {
        // Update tag filter active states
        this.renderTagFilters();

        // Update clear buttons visibility
        const hasFilters = this.currentParams.has('name') || this.currentParams.has('tags');
        const hasSearchQuery = this.searchInput && this.searchInput.value.trim() !== '';
        
        if (this.clearSearchBtn) {
            this.clearSearchBtn.style.display = hasSearchQuery ? 'inline-flex' : 'none';
        }
        
        if (this.clearAllBtn) {
            this.clearAllBtn.style.display = hasFilters ? 'inline-flex' : 'none';
        }
    }
}

// Initialize search component
function setupSearchComponent() {
    const searchComponent = new ShaderSearchComponent();
    searchComponent.initialize();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ShaderSearchComponent,
        setupSearchComponent
    };
}