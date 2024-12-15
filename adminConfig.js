const admin = require('firebase-admin');

// Path to your service account key JSON file
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const setCustomUserClaims = async (uid, isAdmin) => {
  try {
    await admin.auth().setCustomUserClaims(uid, { admin: isAdmin });
    console.log(`Custom claims set for user with UID ${uid}: { admin: ${isAdmin} }`);
  } catch (error) {
    console.error('Error setting custom claims:', error);
  }
};

// Set mtpete33's UID as an Admin
const userUid = 'HVzGFf7yzIgp7DLbM9T4A1M4jqI2'; 
setCustomUserClaims(userUid, true);