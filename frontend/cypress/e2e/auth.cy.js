describe('Test de connexion administrateur', () => {
  it('connecte avec les identifiants admin', () => {
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: {
        token: 'test-token',
        user: { id: 1, email: 'admin@test.fr', role: 'ADMIN' }
      }
    });

    cy.clearLocalStorage();
    cy.visit('/');
    cy.contains('button', 'Admin').click();
    cy.get('input[type="email"]').type('admin@test.fr');
    cy.get('input[type="password"]').type('secret123');
    cy.contains('button', 'Connexion').click();

    cy.window().its('localStorage.admin_token').should('equal', 'test-token');
  });
});
