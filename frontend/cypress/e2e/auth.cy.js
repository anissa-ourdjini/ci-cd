describe('Authentification administrateur', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('affiche le formulaire de connexion', () => {
    cy.visit('/');
    cy.contains('button', 'Admin').click();
    cy.contains('h1', 'Admin');
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
  });

  it('connecte un administrateur avec des identifiants valides', () => {
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: {
        token: 'test-token',
        user: { id: 1, email: 'admin@test.fr', role: 'ADMIN' }
      }
    }).as('login');

    cy.visit('/');
    cy.contains('button', 'Admin').click();
    cy.get('input[type="email"]').type('admin@test.fr');
    cy.get('input[type="password"]').type('secret123');
    cy.contains('button', 'Connexion').click();
    cy.wait('@login');
    cy.window().its('localStorage.admin_token').should('equal', 'test-token');
  });

  it('reste sur le formulaire apres des identifiants invalides', () => {
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 401,
      body: { error: 'Invalid credentials' }
    });
    cy.on('window:alert', (message) => {
      expect(message).to.include('Invalid credentials');
    });

    cy.visit('/');
    cy.contains('button', 'Admin').click();
    cy.get('input[type="email"]').type('wrong@test.fr');
    cy.get('input[type="password"]').type('wrong-password');
    cy.contains('button', 'Connexion').click();
    cy.contains('h1', 'Admin').should('be.visible');
  });
});
