/**
 * PODEŠAVANJE PRODAVNICE
 * Posle deploy-a Apps Script Web App-a, ovde nalepite njegov URL (završava se sa /exec).
 */
window.KORAK_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbzAqMi9qR5-E9-gfC0Xzw1Nx7gYUif3bFaS5e-1A0EZAocs-0jY2GqwqzrtksBKg2Ph/exec',

  SHOP_NAME: 'Korak',
  PHONE: 'Ovde ide vaš telefon',
  EMAIL: 'dann.web.workshop@gmail.com',

  // Ako je katalog u browseru stariji od ovoga, pri povratku na tab proverava se da li ima izmena.
  // Provera je jedan mali zahtev – ceo katalog se preuzima samo ako se nešto promenilo.
  REVALIDATE_AFTER_MS: 5 * 60 * 1000,
  REQUEST_TIMEOUT_MS: 30000
};
