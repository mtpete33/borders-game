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
    const userEntriesQuery = query(
      statsRef,
      where("uid", "==", user.uid),
      where("hasCompleted", "==", true)
    );

    // Single query for user entries
    const querySnapshot = await getDocs(userEntriesQuery);
    const entries = [];
    const puzzleTimeMap = new Map();
    querySnapshot.forEach(doc => {
      const data = doc.data();
      entries.push(data);
      puzzleTimeMap.set(data.puzzleId, data.time);
    });

    // Single query for total games
    const allGamesQuery = query(statsRef, where("uid", "==", user.uid));
    const allGamesSnapshot = await getDocs(allGamesQuery);
    const totalGames = allGamesSnapshot.size;

    const completedGames = querySnapshot.docs.filter(doc => doc.data().hasCompleted).length;
    const winPercentage = totalGames > 0 ? Math.round((completedGames / totalGames) * 100) : 0;
    const bestTime = entries.length > 0 ? Math.min(...entries.map(entry => entry.time)) : null;

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

function displayAttempted(attemptedData) {
    console.log("Displaying attempted data:", attemptedData);

    const attemptedTable = document.getElementById('attemptedTable');
    if (!attemptedTable) {
        console.error("Attempted table element not found");
        return;
    }

    // Find all entries where hasGivenUp is true
    const givenUpEntries = attemptedData.filter(entry => {
        console.log("Checking entry:", entry);
        return entry && entry.hasGivenUp === true;
    });
    
    console.log("Given up entries after filter:", givenUpEntries);

    // Clear existing rows
    attemptedTable.innerHTML = '';

    // Add table header with section title
    const titleRow = document.createElement('tr');
    const titleCell = document.createElement('th');
    titleCell.colSpan = 6;
    titleCell.textContent = `Players Who Gave Up (${givenUpEntries.length})`;
    titleCell.style.backgroundColor = '#ffebee';
    titleRow.appendChild(titleCell);
    attemptedTable.appendChild(titleRow);

    // Build the header row
    const headerRow = document.createElement('tr');
    ['Rank', 'User', 'Time', 'Date', 'Puzzle #', 'Status'].forEach((headerText) => {
        const th = document.createElement('th');
        th.innerText = headerText;
        headerRow.appendChild(th);
    });
    attemptedTable.appendChild(headerRow);

    // Sort attempted data by date (most recent first)
    givenUpEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Fill table rows
    givenUpEntries.forEach((playerData, index) => {
        console.log("Processing given up entry:", playerData);
        const row = document.createElement('tr');
        
        const rankCell = document.createElement('td');
        rankCell.textContent = index + 1;
        row.appendChild(rankCell);

        const userCell = document.createElement('td');
        userCell.textContent = playerData.username || playerData.user || 'Unknown';
        row.appendChild(userCell);

        const timeCell = document.createElement('td');
        timeCell.textContent = playerData.time ? formatTime(playerData.time) : '--:--';
        row.appendChild(timeCell);

        const dateCell = document.createElement('td');
        const dateStr = playerData.date ? new Date(playerData.date).toLocaleDateString() : '--';
        dateCell.textContent = dateStr;
        row.appendChild(dateCell);

        const puzzleCell = document.createElement('td');
        puzzleCell.textContent = playerData.puzzleId || '--';
        row.appendChild(puzzleCell);

        const statusCell = document.createElement('td');
        statusCell.textContent = "Gave Up";
        row.appendChild(statusCell);

        attemptedTable.appendChild(row);
    });
}

// Export functions
export { getUserStatistics, displayAttempted };