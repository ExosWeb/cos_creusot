// Animations d'entrée au scroll
document.addEventListener('DOMContentLoaded', function() {
    // Observer pour détecter les éléments qui entrent dans le viewport
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                // Ne plus observer cet élément une fois animé
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Sélectionner tous les éléments à animer
    const animatedElements = document.querySelectorAll(
        '.service-card, .section-title, .article-card, .footer-section, .hero-content, .hero-image'
    );

    // Ajouter la classe 'animate-on-scroll' et observer chaque élément
    animatedElements.forEach((element, index) => {
        element.classList.add('animate-on-scroll');
        element.style.animationDelay = `${index * 0.1}s`;
        observer.observe(element);
    });

    // Animation spéciale pour les service cards avec délai échelonné
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.2}s`;
    });
});

// Animation de particules pour la hero section
function createParticles() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 20 + 's';
        particle.style.animationDuration = (15 + Math.random() * 10) + 's';
        hero.appendChild(particle);
    }
}

// Créer les éléments animés du background
function createAnimatedBackground() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    // Créer les vagues animées
    const waves = document.createElement('div');
    waves.className = 'hero-waves';
    hero.appendChild(waves);

    // Créer les formes géométriques
    const shapes = document.createElement('div');
    shapes.className = 'hero-shapes';
    
    for (let i = 0; i < 5; i++) {
        const shape = document.createElement('div');
        shape.className = 'hero-shape';
        shapes.appendChild(shape);
    }
    
    hero.appendChild(shapes);

    // Créer les lignes diagonales
    const lines = document.createElement('div');
    lines.className = 'hero-lines';
    
    for (let i = 0; i < 3; i++) {
        const line = document.createElement('div');
        line.className = 'hero-line';
        lines.appendChild(line);
    }
    
    hero.appendChild(lines);

    // Ajouter des étoiles scintillantes
    createTwinklingStars();
}

// Créer des étoiles scintillantes
function createTwinklingStars() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    for (let i = 0; i < 15; i++) {
        const star = document.createElement('div');
        star.style.position = 'absolute';
        star.style.width = '3px';
        star.style.height = '3px';
        star.style.background = 'white';
        star.style.borderRadius = '50%';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.animation = `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`;
        star.style.animationDelay = Math.random() * 5 + 's';
        hero.appendChild(star);
    }

    // Ajouter l'animation CSS pour les étoiles si elle n'existe pas
    if (!document.querySelector('#twinkle-animation')) {
        const style = document.createElement('style');
        style.id = 'twinkle-animation';
        style.textContent = `
            @keyframes twinkle {
                0%, 100% { opacity: 0.3; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.2); }
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialiser les particules et le background animé après le chargement
document.addEventListener('DOMContentLoaded', function() {
    createParticles();
    createAnimatedBackground();
});

// Animation de typing pour le titre hero
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.innerHTML = '';
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// Lancer l'animation de typing au chargement
document.addEventListener('DOMContentLoaded', function() {
    const heroTitle = document.querySelector('.hero-content h2');
    if (heroTitle) {
        const originalText = heroTitle.textContent;
        setTimeout(() => {
            typeWriter(heroTitle, originalText, 80);
        }, 500);
    }
});