// JavaScript pour la page de connexion
document.addEventListener('DOMContentLoaded', function() {
    initLoginPage();
});

function initLoginPage() {
    // Rediriger si déjà connecté
    if (window.authManager.isAuthenticated()) {
        window.location.href = '/';
        return;
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Focus automatique sur le premier champ
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.focus();
    }
}

async function handleLogin(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = document.getElementById('submitBtn');
    const alertMessage = document.getElementById('alertMessage');

    // Récupération des données du formulaire
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
        // Tentative de connexion
        const result = await window.authManager.login(email, password);

        if (result.success) {
            // Connexion réussie
            showAlert('Connexion réussie ! Redirection...', 'success');
            
            // Gestion du "se souvenir de moi"
            if (rememberMe) {
                localStorage.setItem('cos_remember', 'true');
            }

            // Redirection après 1.5 secondes
            setTimeout(() => {
                const urlParams = new URLSearchParams(window.location.search);
                const redirect = urlParams.get('redirect');
                
                if (redirect && redirect.startsWith('/')) {
                    window.location.href = redirect;
                } else if (window.authManager.isAdmin()) {
                    window.location.href = '/admin';
                } else {
                    window.location.href = '/';
                }
            }, 1500);

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
    const rememberMe = localStorage.getItem('cos_remember');
    const lastEmail = localStorage.getItem('cos_last_email');
    
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
        localStorage.setItem('cos_last_email', email);
    } else {
        localStorage.removeItem('cos_last_email');
        localStorage.removeItem('cos_remember');
    }
});