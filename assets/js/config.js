/**
 * PODEŠAVANJE PRODAVNICE
 * Posle deploy-a Apps Script Web App-a, ovde nalepite njegov URL (završava se sa /exec).
 */
window.KORAK_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbxbg_J896mJw5bb4rJS_4XSG_H1JIM6MptszhRHMPG2vHkbnWHdMcf_B2hEG0evvsXtvw/exec',

  SHOP_NAME: 'Korak',
  PHONE: '+381 11 123 4567',
  EMAIL: 'prodaja@korak.rs',

  // Ako je katalog u browseru stariji od ovoga, pri povratku na tab proverava se da li ima izmena.
  // Provera je jedan mali zahtev – ceo katalog se preuzima samo ako se nešto promenilo.
  REVALIDATE_AFTER_MS: 5 * 60 * 1000,
  REQUEST_TIMEOUT_MS: 30000
};
