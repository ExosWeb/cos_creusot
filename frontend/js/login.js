// JavaScript pour la page de connexion
document.addEventListener('DOMContentLoaded', function() {
    initLoginPage();
});

async function initLoginPage() {
    console.log('🚀 Initialisation page de connexion');
    // Attendre que l'AuthManager soit initialisé
    while (!window.authManager || !window.authManager.isReady) {
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log('✅ AuthManager prêt');

    // Rediriger si déjà connecté
    if (window.authManager.isAuthenticated()) {
        console.log('✅ Utilisateur déjà connecté, redirection vers accueil');
        window.location.href = '/';
        return;
    }

    const loginForm = document.getElementById('loginForm');
    console.log('🔍 Formulaire trouvé:', !!loginForm);
    
    if (loginForm) {
        // Empêcher toute soumission native
        loginForm.setAttribute('novalidate', 'novalidate');
        loginForm.addEventListener('submit', handleLogin);
        
        // Touche Entrée dans un champ => on gère en JS
        loginForm.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleLogin(e);
            }
        });

        // Listener explicite sur le bouton
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handleLogin(e);
            });
        }

        console.log('✅ Listeners attachés (submit, keydown, click)');
    } else {
        console.error('❌ Formulaire loginForm non trouvé !');
    }

    // Focus automatique sur le premier champ
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.focus();
    }
}

async function handleLogin(e) {
    console.log('🔐 handleLogin appelé');
    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    // Récupérer de façon robuste le formulaire et le bouton
    const form = (e && e.target && e.target.tagName === 'FORM')
        ? e.target
        : document.getElementById('loginForm');
    const submitBtn = document.getElementById('submitBtn');
    const alertMessage = document.getElementById('alertMessage');

    // Récupération des données du formulaire
    if (!form) {
        console.error('❌ Formulaire introuvable dans handleLogin');
        return;
    }

    const formData = new FormData(form);
    const email = formData.get('email');
    const password = formData.get('password');
    const rememberMe = formData.get('rememberMe');

    // Validation côté client
    if (!validateLoginForm(email, password)) {
        return;
    }

    // Désactiver le bouton et afficher le loading
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    submitBtn.textContent = '';

    try {
        if (!window.authManager) {
            console.error('❌ AuthManager non disponible');
            showAlert('Erreur interne: AuthManager indisponible', 'error');
            return;
        }

        console.log('🔐 Tentative de connexion', { email });
        // Tentative de connexion
        const result = await window.authManager.login(email, password);
        console.log('📊 Résultat connexion:', result);

        if (result.success) {
            // Connexion réussie
            showAlert('Connexion réussie ! Redirection...', 'success');
            
            // Gestion du "se souvenir de moi"
            if (rememberMe) {
                localStorage.setItem('remember_me', 'true');
                localStorage.setItem('last_email', email);
            }

            // Vérifier que l'authentification est bien établie avant redirection
            console.log('🔍 Vérification état auth avant redirection:', {
                isAuth: window.authManager.isAuthenticated(),
                user: window.authManager.getCurrentUser(),
                token: !!window.authManager.token
            });

            // Redirection après vérification
            setTimeout(() => {
                // Double vérification avant redirection
                if (!window.authManager.isAuthenticated()) {
                    console.error('❌ Utilisateur non authentifié lors de la redirection !');
                    showAlert('Erreur d\'authentification. Veuillez réessayer.', 'error');
                    return;
                }

                const urlParams = new URLSearchParams(window.location.search);
                const redirect = urlParams.get('redirect');
                
                console.log('🚀 Redirection vers:', redirect || (window.authManager.isAdmin() ? '/admin' : '/'));
                
                if (redirect && redirect.startsWith('/')) {
                    window.location.href = redirect;
                } else if (window.authManager.isAdmin()) {
                    window.location.href = '/admin';
                } else {
                    window.location.href = '/';
                }
            }, 1000); // Réduire le délai à 1 seconde

        } else {
            // Erreur de connexion
            showAlert(result.message, 'error');

            // Affichage des erreurs de validation
            if (result.errors && Array.isArray(result.errors)) {
                displayValidationErrors(result.errors);
            }

            // Focus sur le champ email en cas d'erreur
            document.getElementById('email').focus();
        }

    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        showAlert('Erreur de connexion au serveur', 'error');
    } finally {
        // Réactiver le bouton
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        submitBtn.textContent = 'Se connecter';
    }
}

function validateLoginForm(email, password) {
    let isValid = true;
    const errors = [];

    // Validation de l'email
    if (!email || !email.trim()) {
        errors.push('L\'adresse email est requise');
        markFieldError('email');
        isValid = false;
    } else if (!isValidEmail(email)) {
        errors.push('L\'adresse email n\'est pas valide');
        markFieldError('email');
        isValid = false;
    } else {
        clearFieldError('email');
    }

    // Validation du mot de passe
    if (!password || !password.trim()) {
        errors.push('Le mot de passe est requis');
        markFieldError('password');
        isValid = false;
    } else {
        clearFieldError('password');
    }

    // Affichage des erreurs
    if (!isValid) {
        showAlert(errors.join('. '), 'error');
    }

    return isValid;
}

function displayValidationErrors(errors) {
    errors.forEach(error => {
        if (error.path) {
            const field = error.path;
            const input = document.getElementById(field);
            if (input) {
                markFieldError(field);
                
                // Ajouter le message d'erreur spécifique
                const errorElement = input.parentNode.querySelector('.error-message');
                if (errorElement) {
                    errorElement.textContent = error.msg;
                    errorElement.style.display = 'block';
                }
            }
        }
    });
}

function markFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.add('error');
        field.parentNode.classList.add('has-error');
        
        // Retirer l'erreur quand l'utilisateur commence à taper
        field.addEventListener('input', function() {
            clearFieldError(fieldId);
        }, { once: true });
    }
}

function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.remove('error');
        field.parentNode.classList.remove('has-error');
        
        const errorElement = field.parentNode.querySelector('.error-message');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showAlert(message, type = 'info') {
    window.authManager.showAlert(message, type);
}

// Gestion de la touche Entrée
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const form = document.getElementById('loginForm');
        if (form && document.activeElement && form.contains(document.activeElement)) {
            form.dispatchEvent(new Event('submit'));
        }
    }
});

// Auto-complétion depuis le localStorage (si "se souvenir" était coché)
window.addEventListener('load', function() {
    const rememberMe = localStorage.getItem('remember_me');
    const lastEmail = localStorage.getItem('last_email');
    
    if (rememberMe === 'true' && lastEmail) {
        const emailInput = document.getElementById('email');
        const rememberCheckbox = document.getElementById('rememberMe');
        
        if (emailInput) emailInput.value = lastEmail;
        if (rememberCheckbox) rememberCheckbox.checked = true;
    }
});

// Sauvegarder l'email si "se souvenir" est coché
document.getElementById('loginForm')?.addEventListener('submit', function() {
    const email = document.getElementById('email').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    if (rememberMe && email) {
        localStorage.setItem('last_email', email);
        localStorage.setItem('remember_me', 'true');
    } else {
        localStorage.removeItem('last_email');
        localStorage.removeItem('remember_me');
    }
});