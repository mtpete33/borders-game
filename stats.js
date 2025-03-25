// Import Firebase functions
import { collection, query, where, orderBy, getDocs, limit } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

async function getUserStatistics() {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const statsRef = collection(window.db, "leaderboard");
    const userEntriesQuery = query(
      statsRef,
      where("uid", "==", user.uid),
      where("hasCompleted", "==", true)
    );

    // Get all user entries in one query
    const querySnapshot = await getDocs(userEntriesQuery);
    const entries = [];
    const puzzleTimeMap = new Map();
    querySnapshot.forEach(doc => {
      const data = doc.data();
      entries.push(data);
      puzzleTimeMap.set(data.puzzleId, data.time);
    });

    // Get total games count
    const allGamesQuery = query(statsRef, where("uid", "==", user.uid));
    const allGamesSnapshot = await getDocs(allGamesQuery);
    const totalGames = allGamesSnapshot.size;

    // Calculate win percentage
    const completedGames = entries.length;
    const winPercentage = totalGames > 0 ? Math.round((completedGames / totalGames) * 100) : 0;

    // Find best time
    const bestTime = entries.length > 0 ? 
      Math.min(...entries.map(entry => entry.time)) : 
      null;

    // Get all first place times for user's puzzles in one batch query
    const puzzleIds = Array.from(puzzleTimeMap.keys());
    let bestRank = { rank: Infinity, count: 0 };

    if (puzzleIds.length > 0) {
      const batchSize = 10;
      for (let i = 0; i < puzzleIds.length; i += batchSize) {
        const batch = puzzleIds.slice(i, i + batchSize);
        const firstPlacesQuery = query(
          statsRef,
          where("puzzleId", "in", batch),
          where("hasCompleted", "==", true),
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

        // Calculate ranks for this batch
        batch.forEach(puzzleId => {
          const userTime = puzzleTimeMap.get(puzzleId);
          const firstPlaceTime = firstPlaceTimes.get(puzzleId);
          if (firstPlaceTime) {
            const timeDiff = Math.abs(userTime - firstPlaceTime);
            const rank = Math.ceil(timeDiff / 10) + 1;
            if (rank < bestRank.rank) {
              bestRank = { rank, count: 1 };
            } else if (rank === bestRank.rank) {
              bestRank.count++;
            }
          }
        });
      }
    }

    // Format best time
    const formattedBestTime = bestTime ? formatTime(bestTime) : "--:--";

    // Format best rank
    const formattedBestRank = bestRank.rank === Infinity ? 
      "--" : 
      `${bestRank.rank}${getOrdinalSuffix(bestRank.rank)} (${bestRank.count})`;

    return {
      gamesPlayed: totalGames,
      winPercentage: winPercentage,
      bestRank: formattedBestRank,
      bestTime: formattedBestTime
    };
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

// Export functions
export { getUserStatistics, updateStatsModal };