
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateHistoricalUsernames() {
  const uid = 'llgOlAN03FMBZfZjqDO57hkSuZV2';
  const newUsername = 'ianharwick';
  
  try {
    // Get all leaderboard entries with this user's UID
    const leaderboardRef = db.collection('leaderboard');
    const snapshot = await leaderboardRef.where('uid', '==', uid).get();
    
    if (snapshot.empty) {
      console.log('No matching documents.');
      return;
    }

    // Update each document
    const batch = db.batch();
    snapshot.forEach(doc => {
      batch.update(doc.ref, { username: newUsername });
    });

    await batch.commit();
    console.log(`Successfully updated ${snapshot.size} documents.`);
  } catch (error) {
    console.error('Error updating documents:', error);
  }
}

// Run the update
updateHistoricalUsernames().then(() => {
  console.log('Update complete');
  process.exit(0);
});
