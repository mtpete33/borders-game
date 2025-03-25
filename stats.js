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

    const querySnapshot = await getDocs(userEntriesQuery);
    const entries = [];
    querySnapshot.forEach(doc => entries.push(doc.data()));

    // Calculate total games including non-completed ones
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

    // Find best rank by looking at smallest time difference from first place
    let bestRank = { rank: Infinity, count: 0 };
    if (entries.length > 0) {
      for (const entry of entries) {
        const puzzlesWithFirstPlaceQuery = query(
          statsRef,
          where("puzzleId", "==", entry.puzzleId),
          where("hasCompleted", "==", true),
          orderBy("time", "asc"),
          limit(1)
        );

        const firstPlaceSnapshot = await getDocs(puzzlesWithFirstPlaceQuery);
        if (!firstPlaceSnapshot.empty) {
          const firstPlaceTime = firstPlaceSnapshot.docs[0].data().time;
          const timeDiff = Math.abs(entry.time - firstPlaceTime);
          const rank = Math.ceil(timeDiff / 10) + 1;
          if (rank < bestRank.rank) {
            bestRank = { rank, count: 1 };
          } else if (rank === bestRank.rank) {
            bestRank.count++;
          }
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