// Import Firebase functions
import { collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Cache for user statistics and leaderboard data
const cache = {
  userStats: new Map(),
  leaderboardData: new Map(),
  // Cache expiry time - 5 minutes
  CACHE_DURATION: 5 * 60 * 1000
};

async function getUserStatistics() {
  const user = auth.currentUser;
  if (!user) return null;

  // Check cache first
  const cacheKey = `${user.uid}`;
  const cachedStats = cache.userStats.get(cacheKey);
  if (cachedStats && (Date.now() - cachedStats.timestamp) < cache.CACHE_DURATION) {
    return cachedStats.data;
  }

  try {
    const statsRef = collection(window.db, "leaderboard");
    // Modified query to include all entries regardless of hasCompleted
    const allUserEntriesQuery = query(
      statsRef,
      where("uid", "==", user.uid)
    );

    // Single query for all user entries
    const querySnapshot = await getDocs(allUserEntriesQuery);
    const entries = [];
    const puzzleTimeMap = new Map();
    let totalGames = 0;
    let completedGames = 0;
    querySnapshot.forEach(doc => {
      const data = doc.data();
      entries.push(data);
      puzzleTimeMap.set(data.puzzleId, data.time);
      totalGames++;
      if (data.hasCompleted) {
        completedGames++;
      }
    });

    const winPercentage = totalGames > 0 ? Math.round((completedGames / totalGames) * 100) : 0;
    const completedEntries = entries.filter(entry => entry.hasCompleted);
    const bestTime = completedEntries.length > 0 ? Math.min(...completedEntries.map(entry => entry.time)) : null;


    // Batch process first place times
    const puzzleIds = Array.from(puzzleTimeMap.keys());
    let bestRank = { rank: Infinity, count: 0 };

    if (puzzleIds.length > 0) {
      // Increase batch size to reduce number of queries
      const batchSize = 30;
      for (let i = 0; i < puzzleIds.length; i += batchSize) {
        const batch = puzzleIds.slice(i, i + batchSize);
        const firstPlacesQuery = query(
          statsRef,
          where("puzzleId", "in", batch),
          where("hasCompleted", "==", true), // Only consider completed games for ranking
          orderBy("time", "asc")
        );

        const firstPlacesSnapshot = await getDocs(firstPlacesQuery);
        const firstPlaceTimes = new Map();

        firstPlacesSnapshot.forEach(doc => {
          const data = doc.data();
          if (!firstPlaceTimes.has(data.puzzleId)) {
            firstPlaceTimes.set(data.puzzleId, data.time);
          }
        });

        batch.forEach(puzzleId => {
          // Get all times for this puzzle and sort them
          const puzzleTimes = [];
          firstPlacesSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.puzzleId === puzzleId) {
              puzzleTimes.push(data.time);
            }
          });
          puzzleTimes.sort((a, b) => a - b);

          const userTime = puzzleTimeMap.get(puzzleId);
          const userRank = puzzleTimes.indexOf(userTime) + 1;

          if (userRank > 0 && (userRank < bestRank.rank || bestRank.rank === Infinity)) {
            bestRank = { rank: userRank, count: 1 };
          } else if (userRank === bestRank.rank) {
            bestRank.count++;
          }
        });
      }
    }

    const formattedBestTime = bestTime ? formatTime(bestTime) : "--:--";
    const formattedBestRank = bestRank.rank === Infinity ? 
      "--" : 
      `${bestRank.rank}${getOrdinalSuffix(bestRank.rank)} (${bestRank.count})`;

    const stats = {
      gamesPlayed: totalGames,
      winPercentage: winPercentage,
      bestRank: formattedBestRank,
      bestTime: formattedBestTime
    };

    // Cache the results
    cache.userStats.set(cacheKey, {
      timestamp: Date.now(),
      data: stats
    });

    return stats;
  } catch (error) {
    console.error("Error fetching user statistics:", error);
    return null;
  }
}

// Helper function to format time (reused from your existing code)
function formatTime(elapsedTimeInSeconds) {
  const minutes = Math.floor(elapsedTimeInSeconds / 60);
  const seconds = Math.floor(elapsedTimeInSeconds % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// Helper function to get ordinal suffix (reused from your existing code)
function getOrdinalSuffix(rank) {
  const j = rank % 10, k = rank % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}

// Placeholder for leaderboard display function.  This needs to be adapted to your actual code.
function displayLeaderboard(leaderboardEntries) {
    // Assume leaderboardEntries is an array of objects with at least 'hasCompleted', 'time', and 'date' properties.
    const validEntries = [...leaderboardEntries]; // Create a copy to avoid modifying the original array

    // Sort entries - completed first by time, then show gave up entries by date
    validEntries.sort((a, b) => {
        if (a.hasCompleted && !b.hasCompleted) return -1;
        if (!a.hasCompleted && b.hasCompleted) return 1;
        if (a.hasCompleted && b.hasCompleted) return a.time - b.time;
        if (!a.hasCompleted && !b.hasCompleted) {
            return new Date(b.date) - new Date(a.date);
        }
        return 0;
    });

    // ... (rest of your leaderboard display logic) ...
    console.log("Leaderboard:", validEntries);
}


// Example usage (replace with your actual leaderboard data retrieval)
async function getLeaderboardData(){
  // ... (Your code to fetch leaderboard data) ...
  const leaderboardEntries = [
      { puzzleId: '1', uid: 'user1', time: 120, hasCompleted: true, date: '2024-10-27T10:00:00' },
      { puzzleId: '1', uid: 'user2', time: 150, hasCompleted: true, date: '2024-10-27T11:00:00' },
      { puzzleId: '1', uid: 'user3', hasCompleted: false, date: '2024-10-27T12:00:00' },
      { puzzleId: '1', uid: 'user4', hasCompleted: false, date: '2024-10-27T09:00:00' }
  ];
  displayLeaderboard(leaderboardEntries);
}

getLeaderboardData();

export { getUserStatistics };