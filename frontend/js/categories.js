// Frontend category normalization and utilities
(function() {
    'use strict';
    
    // Canonical categories mapping
    const CATEGORY_CONFIG = {
        general: { name: 'Général', icon: '📰', url: '/articles' },
        prestations: { name: 'Prestations', icon: '🎁', url: '/avantages' },
        voyages: { name: 'Voyages', icon: '✈️', url: '/voyages' },
        retraites: { name: 'Retraites', icon: '👥', url: '/retraites' },
        evenements: { name: 'Événements', icon: '🎉', url: '/evenements' }
    };
    
    // Legacy aliases for backward compatibility
    const CATEGORY_ALIASES = {
        avantages: 'prestations',
        prestation: 'prestations',
        activites: 'prestations'
    };
    
    // Normalize category input to canonical form
    function normalizeCategory(input) {
        if (!input) return null;
        const lower = String(input).toLowerCase();
        if (CATEGORY_CONFIG[lower]) return lower;
        if (CATEGORY_ALIASES[lower]) return CATEGORY_ALIASES[lower];
        return null;
    }
    
    // Get display name for category
    function getCategoryName(category) {
        const normalized = normalizeCategory(category);
        return normalized ? CATEGORY_CONFIG[normalized].name : category;
    }
    
    // Get icon for category
    function getCategoryIcon(category) {
        const normalized = normalizeCategory(category);
        return normalized ? CATEGORY_CONFIG[normalized].icon : '📄';
    }
    
    // Get URL for category
    function getCategoryUrl(category) {
        const normalized = normalizeCategory(category);
        return normalized ? CATEGORY_CONFIG[normalized].url : '/articles';
    }
    
    // Enhanced fetch with better error handling and debug
    async function fetchCategoryArticles(category, options = {}) {
        const normalized = normalizeCategory(category);
        if (!normalized) {
            throw new Error(`Catégorie invalide: ${category}`);
        }
        
        const url = `/api/articles/category/${normalized}`;
        const fetchOptions = {
            credentials: 'include',
            ...options
        };
        
        console.log(`🔍 [Categories] Fetching ${normalized} from ${url}`);
        
        try {
            const response = await fetch(url, fetchOptions);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ [Categories] API Error ${response.status}:`, errorText);
                throw new Error(`API Error ${response.status}: ${errorText}`);
            }
            
            const articles = await response.json();
            console.log(`✅ [Categories] Received ${articles.length} articles for ${normalized}`);
            return articles;
            
        } catch (error) {
            console.error(`💥 [Categories] Fetch failed for ${normalized}:`, error);
            throw error;
        }
    }
    
    // Global export
    window.CategoriesUtils = {
        CATEGORY_CONFIG,
        CATEGORY_ALIASES,
        normalizeCategory,
        getCategoryName,
        getCategoryIcon,
        getCategoryUrl,
        fetchCategoryArticles
    };
    
    console.log('✅ [Categories] Utils loaded');
    
})();