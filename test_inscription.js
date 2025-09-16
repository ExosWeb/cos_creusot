const fetch = require('node-fetch');

async function testInscription() {
    try {
        const response = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'test@example.com',
                password: '123456',
                firstname: 'Test',
                lastname: 'User',
                phone: '0123456789',
                address: 'Adresse de test'
            })
        });

        const result = await response.json();
        console.log('Status:', response.status);
        console.log('Résultat:', result);
    } catch (error) {
        console.error('Erreur:', error);
    }
}

testInscription();