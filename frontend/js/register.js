// JavaScript pour la page d'inscription
document.addEventListener('DOMContentLoaded', function() {
    initRegisterPage();
});

function initRegisterPage() {
    // Rediriger si déjà connecté
    if (window.authManager.isAuthenticated()) {
        window.location.href = '/';
        return;
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Validation en temps réel
    initRealTimeValidation();

    // Focus automatique sur le premier champ
    const firstnameInput = document.getElementById('firstname');
    if (firstnameInput) {
        firstnameInput.focus();
    }
}

function initRealTimeValidation() {
    // Validation du mot de passe en temps réel
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            validatePasswordStrength(this.value);
            if (confirmPasswordInput.value) {
                validatePasswordMatch();
            }
        });
    }

    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', validatePasswordMatch);
    }

    // Validation de l'email en temps réel
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            validateEmail(this.value);
        });
    }

    // Validation du téléphone
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            this.value = formatPhoneNumber(this.value);
        });
    }
}

async function handleRegister(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = document.getElementById('submitBtn');
    
    // Récupération des données du formulaire
    const formData = new FormData(form);
    const userData = {
        firstname: formData.get('firstname').trim(),
        lastname: formData.get('lastname').trim(),
        email: formData.get('email').trim(),
        password: formData.get('password'),
        phone: formData.get('phone')?.trim() || '',
        address: formData.get('address')?.trim() || ''
    };

    // Validation côté client
    if (!validateRegisterForm(userData, formData.get('confirmPassword'))) {
        return;
    }

    // Vérification des conditions d'utilisation
    const acceptTerms = formData.get('acceptTerms');
    if (!acceptTerms) {
        showAlert('Vous devez accepter les conditions d\'utilisation', 'error');
        return;
    }

    // Désactiver le bouton et afficher le loading
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    
    try {
        // Tentative d'inscription
        const result = await window.authManager.register(userData);

        if (result.success) {
            // Inscription réussie
            showAlert(result.message, 'success');
            
            // Désactiver le formulaire
            form.style.opacity = '0.6';
            form.style.pointerEvents = 'none';
            
            // Afficher un message de confirmation
            setTimeout(() => {
                showSuccessMessage();
            }, 2000);

        } else {
            // Erreur d'inscription
            showAlert(result.message, 'error');

            // Affichage des erreurs de validation
            if (result.errors && Array.isArray(result.errors)) {
                displayValidationErrors(result.errors);
            }
        }

    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        showAlert('Erreur de connexion au serveur', 'error');
    } finally {
        // Réactiver le bouton
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
    }
}

function validateRegisterForm(userData, confirmPassword) {
    let isValid = true;
    const errors = [];

    // Validation du prénom
    if (!userData.firstname || userData.firstname.length < 2) {
        errors.push('Le prénom doit contenir au moins 2 caractères');
        markFieldError('firstname');
        isValid = false;
    } else {
        clearFieldError('firstname');
    }

    // Validation du nom
    if (!userData.lastname || userData.lastname.length < 2) {
        errors.push('Le nom doit contenir au moins 2 caractères');
        markFieldError('lastname');
        isValid = false;
    } else {
        clearFieldError('lastname');
    }

    // Validation de l'email
    if (!userData.email) {
        errors.push('L\'adresse email est requise');
        markFieldError('email');
        isValid = false;
    } else if (!isValidEmail(userData.email)) {
        errors.push('L\'adresse email n\'est pas valide');
        markFieldError('email');
        isValid = false;
    } else {
        clearFieldError('email');
    }

    // Validation du mot de passe
    if (!userData.password) {
        errors.push('Le mot de passe est requis');
        markFieldError('password');
        isValid = false;
    } else if (userData.password.length < 6) {
        errors.push('Le mot de passe doit contenir au moins 6 caractères');
        markFieldError('password');
        isValid = false;
    } else {
        clearFieldError('password');
    }

    // Validation de la confirmation du mot de passe
    if (userData.password !== confirmPassword) {
        errors.push('Les mots de passe ne correspondent pas');
        markFieldError('confirmPassword');
        isValid = false;
    } else {
        clearFieldError('confirmPassword');
    }

    // Validation du téléphone (optionnel mais doit être valide si fourni)
    if (userData.phone && !isValidPhoneNumber(userData.phone)) {
        errors.push('Le numéro de téléphone n\'est pas valide');
        markFieldError('phone');
        isValid = false;
    } else {
        clearFieldError('phone');
    }

    // Affichage des erreurs
    if (!isValid) {
        showAlert(errors[0], 'error'); // Afficher seulement la première erreur
    }

    return isValid;
}

function validatePasswordStrength(password) {
    const strengthIndicator = document.getElementById('passwordStrength');
    if (!strengthIndicator) return;

    let strength = 0;
    let message = '';
    
    if (password.length >= 6) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    switch (strength) {
        case 0:
        case 1:
            message = 'Très faible';
            break;
        case 2:
            message = 'Faible';
            break;
        case 3:
            message = 'Moyen';
            break;
        case 4:
            message = 'Fort';
            break;
        case 5:
            message = 'Très fort';
            break;
    }

    strengthIndicator.textContent = `Force: ${message}`;
    strengthIndicator.className = `password-strength strength-${strength}`;
}

function validatePasswordMatch() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (confirmPassword && password !== confirmPassword) {
        markFieldError('confirmPassword');
        return false;
    } else if (confirmPassword) {
        clearFieldError('confirmPassword');
        return true;
    }
    return true;
}

function validateEmail(email) {
    if (email && !isValidEmail(email)) {
        markFieldError('email');
        return false;
    } else if (email) {
        clearFieldError('email');
        return true;
    }
    return true;
}

function displayValidationErrors(errors) {
    errors.forEach(error => {
        if (error.path) {
            markFieldError(error.path);
        }
    });

    // Scroll vers le premier champ en erreur
    const firstError = document.querySelector('.form-group.has-error');
    if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const input = firstError.querySelector('input, textarea, select');
        if (input) input.focus();
    }
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
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhoneNumber(phone) {
    // Regex pour valider les numéros français
    const phoneRegex = /^(?:(?:\+33|0)[1-9](?:[0-9]{8}))$/;
    const cleanPhone = phone.replace(/[\s\-\.]/g, '');
    return phoneRegex.test(cleanPhone);
}

function formatPhoneNumber(phone) {
    // Formatage automatique du numéro de téléphone
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('33')) {
        cleaned = '0' + cleaned.substring(2);
    }
    
    if (cleaned.length <= 10) {
        return cleaned.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
    }
    
    return phone;
}

function showAlert(message, type = 'info') {
    window.authManager.showAlert(message, type);
}

function showSuccessMessage() {
    const authCard = document.querySelector('.auth-card');
    if (authCard) {
        authCard.innerHTML = `
            <div class="auth-header">
                <h2 style="color: #28a745;">✅ Inscription réussie !</h2>
            </div>
            <div style="text-align: center; padding: 2rem;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
                <h3>Félicitations !</h3>
                <p>Votre inscription a été soumise avec succès.</p>
                <div style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 8px; padding: 1.5rem; margin: 1.5rem 0;">
                    <h4 style="color: #856404; margin-bottom: 1rem;">ℹ️ Prochaine étape</h4>
                    <p style="color: #856404; margin: 0;">Votre compte doit maintenant être approuvé par un administrateur. Vous recevrez une confirmation par email une fois votre compte activé.</p>
                </div>
                <div style="margin-top: 2rem;">
                    <a href="/connexion" class="btn btn-primary" style="margin-right: 1rem;">Se connecter</a>
                    <a href="/" class="btn btn-outline">Retour à l'accueil</a>
                </div>
            </div>
        `;
    }
}