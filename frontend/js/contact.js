// JavaScript pour la page de contact
document.addEventListener('DOMContentLoaded', function() {
    initContactPage();
});

function initContactPage() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactSubmit);
    }

    // Pré-remplir les champs si l'utilisateur est connecté
    prefillUserData();
    
    // Validation en temps réel
    initRealTimeValidation();
}

// Pré-remplir les données utilisateur
async function prefillUserData() {
    if (window.authManager && window.authManager.isAuthenticated()) {
        await window.authManager.waitForReady();
        
        const user = window.authManager.user;
        if (user) {
            const firstNameField = document.getElementById('firstName');
            const lastNameField = document.getElementById('lastName');
            const emailField = document.getElementById('email');
            
            if (firstNameField && user.firstname) {
                firstNameField.value = user.firstname;
            }
            
            if (lastNameField && user.lastname) {
                lastNameField.value = user.lastname;
            }
            
            if (emailField && user.email) {
                emailField.value = user.email;
            }
        }
    }
}

// Validation en temps réel
function initRealTimeValidation() {
    const emailField = document.getElementById('email');
    const phoneField = document.getElementById('phone');
    
    if (emailField) {
        emailField.addEventListener('blur', function() {
            validateEmail(this.value, this);
        });
    }
    
    if (phoneField) {
        phoneField.addEventListener('input', function() {
            this.value = formatPhoneNumber(this.value);
        });
    }
}

// Gestion de la soumission du formulaire
async function handleContactSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = document.getElementById('submitBtn');
    const formData = new FormData(form);
    
    // Récupération des données
    const contactData = {
        firstName: formData.get('firstName').trim(),
        lastName: formData.get('lastName').trim(),
        email: formData.get('email').trim(),
        phone: formData.get('phone')?.trim() || '',
        subject: formData.get('subject'),
        message: formData.get('message').trim(),
        newsletter: formData.get('newsletter') ? true : false
    };
    
    // Validation côté client
    if (!validateContactForm(contactData)) {
        return;
    }
    
    // Désactiver le bouton et afficher le loading
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    
    try {
        // Envoyer le message
        const response = await fetch('/api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(contactData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Succès
            showAlert(result.message || 'Message envoyé avec succès !', 'success');
            
            // Réinitialiser le formulaire
            form.reset();
            
            // Pré-remplir à nouveau les données utilisateur
            setTimeout(prefillUserData, 100);
            
        } else {
            // Erreur
            showAlert(result.error || 'Erreur lors de l\'envoi du message', 'error');
        }
        
    } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        showAlert('Erreur de connexion au serveur', 'error');
    } finally {
        // Réactiver le bouton
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
    }
}

// Validation du formulaire de contact
function validateContactForm(data) {
    let isValid = true;
    const errors = [];
    
    // Validation du prénom
    if (!data.firstName || data.firstName.length < 2) {
        errors.push('Le prénom doit contenir au moins 2 caractères');
        markFieldError('firstName');
        isValid = false;
    } else {
        clearFieldError('firstName');
    }
    
    // Validation du nom
    if (!data.lastName || data.lastName.length < 2) {
        errors.push('Le nom doit contenir au moins 2 caractères');
        markFieldError('lastName');
        isValid = false;
    } else {
        clearFieldError('lastName');
    }
    
    // Validation de l'email
    if (!data.email || !isValidEmail(data.email)) {
        errors.push('Adresse email invalide');
        markFieldError('email');
        isValid = false;
    } else {
        clearFieldError('email');
    }
    
    // Validation du sujet
    if (!data.subject) {
        errors.push('Veuillez choisir un sujet');
        markFieldError('subject');
        isValid = false;
    } else {
        clearFieldError('subject');
    }
    
    // Validation du message
    if (!data.message || data.message.length < 10) {
        errors.push('Le message doit contenir au moins 10 caractères');
        markFieldError('message');
        isValid = false;
    } else {
        clearFieldError('message');
    }
    
    // Afficher les erreurs
    if (!isValid) {
        showAlert(errors.join('<br>'), 'error');
    }
    
    return isValid;
}

// Validation de l'email
function validateEmail(email, field) {
    if (email && !isValidEmail(email)) {
        markFieldError(field.id);
        return false;
    } else if (email) {
        clearFieldError(field.id);
        return true;
    }
}

// Formatage du numéro de téléphone
function formatPhoneNumber(phoneNumber) {
    // Supprimer tous les caractères non numériques
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Limiter à 10 chiffres
    const truncated = cleaned.substring(0, 10);
    
    // Formater selon le pattern français
    if (truncated.length >= 6) {
        return truncated.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    } else if (truncated.length >= 4) {
        return truncated.replace(/(\d{2})(\d{2})(\d{2})/, '$1 $2 $3');
    } else if (truncated.length >= 2) {
        return truncated.replace(/(\d{2})/, '$1');
    }
    
    return truncated;
}

// Vérification de la validité de l'email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Marquer un champ en erreur
function markFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.style.borderColor = 'var(--danger-red)';
        field.classList.add('error');
    }
}

// Effacer l'erreur d'un champ
function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.style.borderColor = '';
        field.classList.remove('error');
    }
}

// Afficher une alerte
function showAlert(message, type = 'info') {
    const alertElement = document.getElementById('alertMessage');
    if (!alertElement) return;
    
    alertElement.className = `alert alert-${type}`;
    alertElement.innerHTML = message;
    alertElement.style.display = 'block';
    
    // Faire défiler jusqu'à l'alerte
    alertElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Masquer automatiquement après 5 secondes pour les succès
    if (type === 'success') {
        setTimeout(() => {
            alertElement.style.display = 'none';
        }, 5000);
    }
}