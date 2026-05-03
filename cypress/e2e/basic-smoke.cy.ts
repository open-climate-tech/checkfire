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

  it('wildfirecheck with locID query param loads without error', () => {
    // Regression test: URL params (locID, latLong, notify) must be applied to
    // the SSE filter refs before the first SSE event arrives, not only after
    // getUserPreferences() resolves.
    cy.visit('/wildfirecheck?locID=test-cam&notify=true');
    // Page should render without crashing
    cy.get('.App').should('exist');
    // Location filter message should reflect the locID param
    cy.contains('test-cam');
  });

  it('wildfirecheck with latLong query param loads without error', () => {
    cy.visit('/wildfirecheck?latLong=32.5,34.5,-117.5,-115.5');
    cy.get('.App').should('exist');
  });
});
