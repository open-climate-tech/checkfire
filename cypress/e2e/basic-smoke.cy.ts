describe('basic smoke tests', () => {
  it('dev login/logout', () => {
    cy.visit('/wildfirecheck');
    cy.contains('Sign in').click();
    cy.url().should('include', '/login');
    cy.get('[data-cy="loginGoogle"]').click();
    cy.contains('Sign off').click();
  });

  it('load old fires', () => {
    cy.visit('/wildfirecheck');
    cy.get('[data-cy="toggleOldFires"]').click();
    cy.contains('Full image');
  });
});
