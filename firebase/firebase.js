const admin = require("firebase-admin");
const serviceAccount = require("./your-service-account.json");
const firebaseAdmin = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "PASTE_HERE"
});


module.exports = firebaseAdmin;

// firebase initialization
// databaseURL & service account
