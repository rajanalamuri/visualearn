/* Parent sign-in settings. Fill these in from the Firebase console (Project settings > Your apps > Web app).
   They are public identifiers, not secrets; Firestore rules (firestore.rules) are what keep data private.
   While apiKey is empty, /parents/ says sign-in is not switched on yet and nothing is loaded from Google. */
globalThis.VL_FIREBASE = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  appId: '',
};
