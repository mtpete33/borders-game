// Import Firebase functions
import { collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

async function getUserStatistics() {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const statsRef = collection(window.db, "leaderboard");
    const userEntriesQuery = query(
      statsRef,
      where("uid", "==", user.uid)
    );

    const querySnapshot = await getDocs(userEntriesQuery);
    const entries = [];
    querySnapshot.forEach(doc => entries.push(doc.data()));

    // Calculate total games played
    const totalGames = entries.length;

    // Calculate win percentage
    const completedGames = entries.filter(entry => entry.hasCompleted).length;
    const winPercentage = totalGames > 0 ? Math.round((completedGames / totalGames) * 100) : 0;

    // Find best time
    const completedEntries = entries.filter(entry => entry.hasCompleted);
    const bestTime = completedEntries.length > 0 ? 
      Math.min(...completedEntries.map(entry => entry.time)) : 
      null;

    // Find best rank (need to query global leaderboard per day)
    let bestRank = { rank: Infinity, count: 0 };
    const uniquePuzzleIds = [...new Set(completedEntries.map(entry => entry.puzzleId))];

    for (const puzzleId of uniquePuzzleIds) {
      const dailyLeaderboardQuery = query(
        statsRef,
        where("puzzleId", "==", puzzleId),
        where("hasCompleted", "==", true),
        orderBy("time", "asc")
      );

      const dailySnapshot = await getDocs(dailyLeaderboardQuery);
      const dailyEntries = [];
      dailySnapshot.forEach(doc => dailyEntries.push(doc.data()));

      const userRank = dailyEntries.findIndex(entry => entry.uid === user.uid) + 1;

      if (userRank > 0) { // If user found in leaderboard
        if (userRank < bestRank.rank) {
          bestRank = { rank: userRank, count: 1 };
        } else if (userRank === bestRank.rank) {
          bestRank.count++;
        }
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

// Function to update the stats modal with user data
async function updateStatsModal() {
  const stats = await getUserStatistics();
  if (!stats) return;

  document.querySelector('.stats-numbers .stat-item:nth-child(1) .stat-number').textContent = stats.gamesPlayed;
  document.querySelector('.stats-numbers .stat-item:nth-child(2) .stat-number').textContent = stats.winPercentage;
  document.querySelector('.stats-numbers .stat-item:nth-child(3) .stat-number').textContent = stats.bestRank;
  document.querySelector('.stats-numbers .stat-item:nth-child(4) .stat-number').textContent = stats.bestTime;
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