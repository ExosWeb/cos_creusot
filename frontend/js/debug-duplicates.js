// Script de débogage pour identifier les doublons
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 Debug: Page chargée, pathname:', window.location.pathname);
    
    // Vérifier les éléments présents
    const articlesGrid = document.getElementById('articlesGrid');
    const noArticles = document.getElementById('noArticles');
    
    console.log('🔍 Elements trouvés:');
    console.log('- articlesGrid:', articlesGrid ? '✓' : '❌');
    console.log('- noArticles:', noArticles ? '✓' : '❌');
    
    // Observer les changements dans articlesGrid
    if (articlesGrid) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                console.log('🔄 articlesGrid changé:', articlesGrid.innerHTML.length, 'caractères');
                console.log('🔄 Contenu:', articlesGrid.innerHTML.substring(0, 200) + '...');
            });
        });
        
        observer.observe(articlesGrid, { childList: true, subtree: true });
    }
    
    // Vérifier s'il y a des doublons
    setTimeout(function() {
        const noArticlesTexts = document.querySelectorAll('[class*="no-articles"]');
        console.log('🔍 Nombre d\'éléments "no-articles" trouvés:', noArticlesTexts.length);
        
        noArticlesTexts.forEach((element, index) => {
            console.log(`🔍 Element ${index + 1}:`, element.textContent.trim());
        });
        
        const errors = document.querySelectorAll('.error');
        console.log('🔍 Nombre d\'éléments "error" trouvés:', errors.length);
    }, 2000);
});