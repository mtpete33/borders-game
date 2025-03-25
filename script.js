import { doc, getDoc, setDoc, getDocs, collection, addDoc, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getUserStatistics } from './stats.js';

let currentLeaderboardDate = new Date();

// Function to update navigation button states
function updateNavigationButtons() {
    const activeFilter = $('.filter-btn.active').attr('id');

    if (activeFilter === 'bestTimeFilter' || activeFilter === 'mostWinsFilter') {
        $('.nav-arrow').prop('disabled', true);
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentDate = new Date(currentLeaderboardDate);
    currentDate.setHours(0, 0, 0, 0);

    $('.nav-arrow').prop('disabled', false);
    $('#nextDay').prop('disabled', currentDate >= today);
}


import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

let validWords = [];
let isProgrammaticChange = false;



$(document).ready(function() {

    // function isInstagramBrowser() {
    //     let ua = navigator.userAgent || navigator.vendor || window.opera;
    //     return (ua.indexOf("Instagram") > -1);
    // }

    // if (isInstagramBrowser()) {
    //     alert("Please open this page in an external browser to use Google Login. Click the three dots at the top right corner and select 'Open in external browser'. If you're logging in with regular email you may continue in this browser.");
    // }
    
    // Variables for guest gameplay
    let guestStartTime;
    let guestPuzzleAnswers;
    let guestCurrentCellIndex = 0;
    let guestFocusableCells = ["guest-cell-1", "guest-cell-3", "guest-cell-4", "guest-cell-7", "guest-cell-8", "guest-cell-11", "guest-cell-12", "guest-cell-14"];
    let guestIsProgrammaticChange = false;

    // Function to get yesterday's puzzle ID
    function getYesterdaysPuzzleId() {
        const currentDay = getSequentialDay();
        return Math.max(1, currentDay - 1); // Ensure we don't go below 1
    }

    // Function to reset the guest game board
    function resetGuestGameBoard() {
        // Clear all input cells
        $('#guestCrossword .cell').each(function() {
            $(this).val(''); // Clear the value
            $(this).prop('disabled', false); // Ensure it's enabled if applicable
        });
        // Hide and reset any completion message or related UI elements
        $("#guestResultTime").hide().text('');
        $("#guestSubmitBtn").show().css('display', 'block'); // Show the submit button as block to stack vertically
        $("#guestGiveUpBtn").show().css('display', 'block'); // Show the give up button as block to stack vertically
        $("#guestSignUpCTA").hide();
        $("#guestLeaderboardContainer").hide(); // Hide leaderboard if visible
    }

    // Function to fetch yesterday's puzzle
    async function fetchYesterdaysPuzzle() {
        const yesterdayId = getYesterdaysPuzzleId().toString();
        try {
            const docRef = doc(window.db, "puzzles", yesterdayId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const puzzleData = docSnap.data();
                guestPuzzleAnswers = {
                    word1: puzzleData.word1,
                    word2: puzzleData.word2,
                    word3: puzzleData.word3,
                    word4: puzzleData.word4
                };
                
                // Update the game board with the puzzle data
                // Word1: Top word
                $("#guest-cell-2").val(puzzleData.word1.charAt(1)).prop('disabled', true); // 2nd letter of word1

                // Word2: Right word (down)
                $("#guest-cell-6").val(puzzleData.word2.charAt(1)).prop('disabled', true); // 2nd letter of word2
                $("#guest-cell-10").val(puzzleData.word2.charAt(3)).prop('disabled', true); // 4th letter of word2

                // Word3: Bottom word (across)
                $("#guest-cell-13").val(puzzleData.word3.charAt(2)).prop('disabled', true); // 3rd letter of word3

                // Word4: Left word (down)
                $("#guest-cell-5").val(puzzleData.word4.charAt(1)).prop('disabled', true); // 2nd letter of word4
                $("#guest-cell-9").val(puzzleData.word4.charAt(3)).prop('disabled', true); // 4th letter of word4
                
                console.log("Yesterday's puzzle loaded:", yesterdayId);
            } else {
                // If yesterday's puzzle doesn't exist, fetch a random puzzle
                await fetchRandomPuzzleForGuest();
                console.log("No puzzle found for yesterday. Using random puzzle.");
            }
        } catch (error) {
            console.error("Error retrieving yesterday's puzzle data:", error);
            await fetchRandomPuzzleForGuest();
            toastr.error("Error retrieving puzzle data. Using random puzzle.");
        }
    }

    // Function to fetch a random puzzle for guest play
    async function fetchRandomPuzzleForGuest() {
        const randomPuzzleId = Math.floor(Math.random() * 50) + 1; // Random ID between 1 and 50
        try {
            const docRef = doc(window.db, "puzzles", randomPuzzleId.toString());
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const puzzleData = docSnap.data();
                guestPuzzleAnswers = {
                    word1: puzzleData.word1,
                    word2: puzzleData.word2,
                    word3: puzzleData.word3,
                    word4: puzzleData.word4,
                };
                
                // Update the game board with the random puzzle data
                // Word1: Top word
                $("#guest-cell-2").val(puzzleData.word1.charAt(1)).prop('disabled', true); // 2nd letter of word1

                // Word2: Right word (down)
                $("#guest-cell-6").val(puzzleData.word2.charAt(1)).prop('disabled', true); // 2nd letter of word2
                $("#guest-cell-10").val(puzzleData.word2.charAt(3)).prop('disabled', true); // 4th letter of word2

                // Word3: Bottom word (across)
                $("#guest-cell-13").val(puzzleData.word3.charAt(2)).prop('disabled', true); // 3rd letter of word3

                // Word4: Left word (down)
                $("#guest-cell-5").val(puzzleData.word4.charAt(1)).prop('disabled', true); // 2nd letter of word4
                $("#guest-cell-9").val(puzzleData.word4.charAt(3)).prop('disabled', true); // 4th letter of word4
                
            } else {
                toastr.error("Failed to fetch a random puzzle.");
            }
        } catch (error) {
            console.error("Error fetching random puzzle:", error);
            toastr.error("Error fetching random puzzle.");
        }
    }

    // Function to validate the guest puzzle
    function validateGuestPuzzle() {
        // Get all input fields
        let cells = $("#guestCrossword .cell");

        // Check if all input fields are filled
        let allFilled = true;
        cells.each(function() {
            if ($(this).val().trim() === '') {
                allFilled = false;
                return false; // Break loop on finding an empty field
            }
        });

        if (!allFilled) {
            toastr.warning("Please fill in all letters before submitting.");
            return; // Exit validation function early
        }

        // Construct words from the user's input
        let userWord1 = $("#guest-cell-1").val() + $("#guest-cell-2").val() + $("#guest-cell-3").val() + $("#guest-cell-4").val();
        let userWord2 = $("#guest-cell-4").val() + $("#guest-cell-6").val() + $("#guest-cell-8").val() + $("#guest-cell-10").val() + $("#guest-cell-14").val();
        let userWord3 = $("#guest-cell-11").val() + $("#guest-cell-12").val() + $("#guest-cell-13").val() + $("#guest-cell-14").val();
        let userWord4 = $("#guest-cell-1").val() + $("#guest-cell-5").val() + $("#guest-cell-7").val() + $("#guest-cell-9").val() + $("#guest-cell-11").val();

        console.log("Guest user's input words:", userWord1, userWord2, userWord3, userWord4);

        // Validate each word using the isValidWord function
        const allValid = [userWord1, userWord2, userWord3, userWord4].every(isValidWord);

        if (allValid) {
            toastr.success("Puzzle Complete!");
            let endTime = new Date();
            let elapsedTime = (endTime - guestStartTime) / 1000;

            // Formatting the elapsed time
            const formattedTime = formatTime(elapsedTime);

            // Hide both Submit and Give Up buttons
            $("#guestSubmitBtn").css('display', 'none');
            $("#guestGiveUpBtn").css('display', 'none');

            $("#guest-virtual-keyboard").hide();
            
            $("#guestResultTime").css('display', 'block').text(`Completed in: ${formattedTime}`);
            
            // Create and show Share button right after result time
            const yesterdayPuzzleId = getYesterdaysPuzzleId();
            const shareButtonHTML = `<button id="guestShareBtn" class="form-button">Share</button>`;
            $("#guestResultTime").after(shareButtonHTML);
            
            // Show sign up CTA after the share button
            $("#guestSignUpCTA").show();
            
            // Add click handler for Share button
            $("#guestShareBtn").click(async function() {
                try {
                    if (navigator.share) {
                        const shareData = {
                            title: 'Borders',
                            text: `Borders Puzzle #${yesterdayPuzzleId} - Time: ${formattedTime}`,
                            url: window.location.href
                        };
                        await navigator.share(shareData);
                    } else {
                        // Fallback for browsers that don't support Web Share API
                        const shareText = `Borders Puzzle #${yesterdayPuzzleId} - Time: ${formattedTime}`;
                        const textarea = document.createElement('textarea');
                        textarea.value = shareText;
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                        toastr.success('Score copied to clipboard!');
                    }
                } catch (error) {
                    console.error('Error sharing:', error);
                }
            });
            
            // Store the score in localStorage
            try {
                const guestScore = {
                    puzzleId: yesterdayPuzzleId,
                    time: elapsedTime,
                    date: new Date().toISOString(),
                    words: [userWord1, userWord2, userWord3, userWord4]
                };
                localStorage.setItem('guestScore', JSON.stringify(guestScore));
                
                // Display the leaderboard for this puzzle
                displayGuestLeaderboard(yesterdayPuzzleId);
            } catch (e) {
                console.error("Could not save score to localStorage:", e);
            }
            
            // Disable all cells in the game grid
            $("#guestCrossword .cell").prop('disabled', true);
        } else {
            toastr.error("Some of your words are not valid. Try again.");
        }
    }

    // Function to handle deletion in guest mode
    function handleGuestDelete() {
        let currentCell = $(`#${guestFocusableCells[guestCurrentCellIndex]}`);
        if (currentCell.val().length > 0) {
            currentCell.val("");
        } else if (guestCurrentCellIndex > 0) {
            guestCurrentCellIndex--; // Move back one cell
            let previousCell = $(`#${guestFocusableCells[guestCurrentCellIndex]}`);
            previousCell.val(""); // Clear the previous cell
            previousCell.focus(); // Focus the previous cell
        }

        // Reset any programmatic change flags
        guestIsProgrammaticChange = false;
    }

    // Handle Guest Play button click
    $('#guestPlayBtn').click(function() {
        // Reset the game board
        resetGuestGameBoard();
        
        // Hide landing page and login elements
        $('#landingPage').hide();
        $('#loginForm').hide();
        $('#signUpForm').hide();
        $('#googleLoginBtn').hide();
        
        // Show guest game board
        $('#guestGameBoard').show();
        
        // Fetch yesterday's puzzle
        fetchYesterdaysPuzzle();
        
        // Initialize focus and start time
        $("#guest-cell-1").focus();
        guestStartTime = new Date();
        
        console.log("Guest play button clicked - loading yesterday's puzzle");
    });
    
    // Handle Guest Give Up button click
    $("#guestGiveUpBtn").click(function() {
        $("#guestGiveUpModal").show(); // Show the confirmation modal
    });
    
    // Event handler for the guest confirmation button inside the modal
    $("#guestConfirmGiveUpBtn").click(function() {
        // Display the correct answers on the game board
        $("#guest-cell-1").val(guestPuzzleAnswers.word1.charAt(0));
        $("#guest-cell-2").val(guestPuzzleAnswers.word1.charAt(1));
        $("#guest-cell-3").val(guestPuzzleAnswers.word1.charAt(2));
        $("#guest-cell-4").val(guestPuzzleAnswers.word1.charAt(3));

        $("#guest-cell-4").val(guestPuzzleAnswers.word2.charAt(0));
        $("#guest-cell-6").val(guestPuzzleAnswers.word2.charAt(1));
        $("#guest-cell-8").val(guestPuzzleAnswers.word2.charAt(2));
        $("#guest-cell-10").val(guestPuzzleAnswers.word2.charAt(3));
        $("#guest-cell-14").val(guestPuzzleAnswers.word2.charAt(4));

        $("#guest-cell-11").val(guestPuzzleAnswers.word3.charAt(0));
        $("#guest-cell-12").val(guestPuzzleAnswers.word3.charAt(1));
        $("#guest-cell-13").val(guestPuzzleAnswers.word3.charAt(2));
        $("#guest-cell-14").val(guestPuzzleAnswers.word3.charAt(3));

        $("#guest-cell-1").val(guestPuzzleAnswers.word4.charAt(0));
        $("#guest-cell-5").val(guestPuzzleAnswers.word4.charAt(1));
        $("#guest-cell-7").val(guestPuzzleAnswers.word4.charAt(2));
        $("#guest-cell-9").val(guestPuzzleAnswers.word4.charAt(3));
        $("#guest-cell-11").val(guestPuzzleAnswers.word4.charAt(4));

        // Disable all cells in the game grid
        $("#guestCrossword .cell").prop('disabled', true);

        // Show the give up message
        toastr.info("You gave up! Sorry, better luck next time.");
        
        // Hide the confirmation modal
        $("#guestGiveUpModal").hide();
        
        // Hide the submit and give up buttons
        $("#guestSubmitBtn").css('display', 'none');
        $("#guestGiveUpBtn").css('display', 'none');

        $("#guest-virtual-keyboard").hide();

        $("#guestSignUpCTA").show();

        // Show the result message
        $("#guestResultTime").css('display', 'block').text(`You gave up. Better luck next time!`);
        
        // Display the leaderboard for yesterday's puzzle
        const yesterdayPuzzleId = getYesterdaysPuzzleId();
        displayGuestLeaderboard(yesterdayPuzzleId);
    });
    
    // Event handler for cancel button inside the guest modal
    $("#guestCancelGiveUpBtn").click(function() {
        $("#guestGiveUpModal").hide();
    });
    
    // Handle Help button clicks for both regular and guest modes
    $('#guestHelpBtn').click(function() {
        $("#guestInstructionsModal").show();
    });
    
    $('#helpBtn').click(function() {
        $("#instructionsModal").show();
    });
    
    // Close the instructions modal when clicking the X
    $('.close-modal').click(function() {
        $("#guestInstructionsModal, #instructionsModal").hide();
    });
    
    // Close the instructions modal when clicking outside of it
    $("#guestInstructionsModal, #instructionsModal").click(function(event) {
        if (event.target === this) {
            $(this).hide();
        }
    });
    
    // Handle Guest Back button click
    $('#guestBackBtn').click(function() {
        // Hide guest game board
        $('#guestGameBoard').hide();
        
        // Show landing page
        $('#landingPage').show();
        $('#googleLoginBtn').show();
    });
    
    // Handle Guest Sign Up button click
    $(document).on('click', '#guestSignUpBtn', function() {
        // Hide guest game board
        $('#guestGameBoard').hide();
        
        // Show landing page with all sign up/login options
        $('#landingPage').show();
        $('#googleLoginBtn').show();
        $('#signUpBtn').show();
        $('#logInBtn').show();
        
        // Make sure all forms are hidden
        $('#signUpForm').hide();
        $('#loginForm').hide();
    });
    
    // Function to display the guest leaderboard
    async function displayGuestLeaderboard(puzzleId) {
        if (!puzzleId) return;
        
        try {
            const statsRef = collection(window.db, "leaderboard");
            const q = query(
                statsRef,
                where("puzzleId", "==", puzzleId),
                where("hasCompleted", "==", true),
                orderBy("time", "asc"),
                limit(10)
            );
            
            const querySnapshot = await getDocs(q);
            const leaderboardData = [];
            
            querySnapshot.forEach(doc => {
                const data = doc.data();
                if (!data.hasGivenUp) {
                    leaderboardData.push(data);
                }
            });
            
            // Display the leaderboard
            const leaderboardHTML = `
                <h2>Leaderboard</h2>
                <table id="guestLeaderboardTable" class="leaderboard-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>User</th>
                            <th>Time</th>
                            <th>Date</th>
                            <th>Puzzle #</th>
                            <th>Answers</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${leaderboardData.map((entry, index) => {
                            // Format the date
                            const dateObj = entry.date ? new Date(entry.date) : new Date();
                            const formattedDate = `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}/${dateObj.getFullYear().toString().slice(-2)}`;
                            
                            // Get answers or placeholder
                            const answers = entry.words ? entry.words.join(', ') : 'No words submitted';
                            
                            return `
                            <tr ${index === 0 ? 'style="background-color: #e6ffe6;"' : ''}>
                                <td>${index + 1}${getOrdinalSuffix(index + 1)}</td>
                                <td>${entry.username}</td>
                                <td>${formatTime(entry.time)}</td>
                                <td>${formattedDate}</td>
                                <td>${entry.puzzleId}</td>
                                <td>${answers}</td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
            
            // Only render if we have data
            if (leaderboardData.length > 0) {
                $('#guestLeaderboardContainer').html(leaderboardHTML).show();
            } else {
                $('#guestLeaderboardContainer').html('<p>No leaderboard data available for this puzzle yet.</p>').show();
            }
        } catch (error) {
            console.error("Error fetching guest leaderboard:", error);
            $('#guestLeaderboardContainer').html('<p>Error loading leaderboard data.</p>').show();
        }
    }
    
    // Event listener for the guest Submit button
    $("#guestSubmitBtn").click(function() {
        validateGuestPuzzle(); // Run the validation for the guest puzzle
    });
    
    // Key event logic for clicks on guest keyboard keys
    $(".guest-key").click(function() {
        const key = $(this).data("key");
        guestIsProgrammaticChange = true; // Mark change as programmatic before any way this happens
        if (key === "backspace") {
            handleGuestDelete();
        } else {
            $(`#${guestFocusableCells[guestCurrentCellIndex]}`).val(key.toUpperCase());
            if (guestCurrentCellIndex < guestFocusableCells.length - 1) {
                guestCurrentCellIndex++;
                $(`#${guestFocusableCells[guestCurrentCellIndex]}`).focus();
            }
        }
        guestIsProgrammaticChange = false; // Reset after handling input
    });
    
    // Convert all guest user inputs to uppercase
    $("#guestCrossword .cell").on('input', function() {
        this.value = this.value.toUpperCase();
    });
    
    // Initialize focus on the first cell when the guest game starts
    $("#guest-cell-1").on('focus', function() {
        guestCurrentCellIndex = 0;
    });
    
    // Attach event listeners to each guest cell to update currentCellIndex on focus
    guestFocusableCells.forEach((cellId, index) => {
        $(`#${cellId}`).on('focus click', function(e) {
            if (guestCurrentCellIndex !== index) {
                guestCurrentCellIndex = index; // Update the index of the focused cell
            }
            $(this).select();
            e.preventDefault();
        });

        // Also handle mouseup to maintain selection
        $(`#${cellId}`).on('mouseup', function(e) {
            e.preventDefault();
            $(this).select();
        });
    });
    
    // Input event to move focus for guest cells
    guestFocusableCells.forEach((cellId, index) => {
        $(`#${cellId}`).on('input', function(event) {
            if (!guestIsProgrammaticChange && $(this).val().length === 1 && index < guestFocusableCells.length - 1) {
                guestCurrentCellIndex++;
                $(`#${guestFocusableCells[guestCurrentCellIndex]}`).focus().select();
            }
        });
        
        // Add Enter key handler for each cell
        $(`#${cellId}`).on('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                $("#guestSubmitBtn").click(); // Trigger guest submit button
            }
        });
    });
    
    // Handle keyboard events for navigation and deletion in guest mode
    $(document).keydown(function(event) {
        const focusedElement = document.activeElement;
        const isGuestGameCell = $(focusedElement).hasClass('cell') && focusedElement.id.startsWith('guest-');
        
        if (isGuestGameCell) {
            let nextCell;

            switch(event.key) {
                case "Backspace":
                    event.preventDefault();
                    handleGuestDelete();
                    break;

                case "ArrowLeft":
                    if (guestCurrentCellIndex > 0) {
                        event.preventDefault();
                        guestCurrentCellIndex--;
                        nextCell = $(`#${guestFocusableCells[guestCurrentCellIndex]}`);
                        nextCell.focus();
                        // Force selection after a brief delay
                        setTimeout(() => {
                            nextCell.select();
                        }, 0);
                    }
                    break;

                case "ArrowRight":
                    if (guestCurrentCellIndex < guestFocusableCells.length - 1) {
                        event.preventDefault();
                        guestCurrentCellIndex++;
                        nextCell = $(`#${guestFocusableCells[guestCurrentCellIndex]}`);
                        nextCell.focus();
                        // Force selection after a brief delay
                        setTimeout(() => {
                            nextCell.select();
                        }, 0);
                    }
                    break;

                // Handle alphanumeric input
                default:
                    if (event.key.length === 1 && event.key.match(/[a-zA-Z]/)) {
                        // If it's a letter key, select the current content
                        $(focusedElement).select();
                    }
                    break;
            }
        }
    });



    $('#playBtn').hide();


    $('#instructionsBtn').click(function() {
        const content = $('#instructionsContent');
        content.toggleClass('show');
        content.slideToggle(300);
    });
    
    // Filter button handlers for both main and stats modal
    $('.filter-btn, .stats-filter-btn').click(function() {
        const isStatsModal = $(this).hasClass('stats-filter-btn');
        const buttonClass = isStatsModal ? 'stats-filter-btn' : 'filter-btn';
        $(`.${buttonClass}`).removeClass('active');
        $(this).addClass('active');
        
        const id = this.id;
        const mainId = id.replace('stats-', '');
        
        if (mainId === 'stats-todayFilter') {
            $('#leaderboardDate, #stats-leaderboardDate').show();
            getLeaderboard(new Date());
        } else if (mainId === 'bestTimeFilter') {
            getBestTimes();
        } else if (mainId === 'mostWinsFilter') {
            getMostWins();
        }
    });

    // Friends/Global filter click handlers for both views
    $('#stats-friendsFilterBtn, #stats-globalFilterBtn').click(function() {
        $('#stats-friendsFilterBtn, #stats-globalFilterBtn').removeClass('active');
        $(this).addClass('active');
        
        const activeFilter = $('.stats-filter-btn.active').attr('id');

        if (activeFilter === 'stats-bestTimeFilter') {
            getBestTimes();
        } else if (activeFilter === 'stats-mostWinsFilter') {
            getMostWins();
        } else {
            getLeaderboard(currentLeaderboardDate);
        }
    });

    // Navigation button handlers
    $('#stats-prevDay').click(function() {
        const prevDay = new Date(currentLeaderboardDate);
        prevDay.setDate(prevDay.getDate() - 1);
        getLeaderboard(prevDay);
    });

    $('#stats-nextDay').click(function() {
        const nextDay = new Date(currentLeaderboardDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const today = new Date();
        if (nextDay <= today) {
            getLeaderboard(nextDay);
        }
    });

// getLeaderboard(); // <----comment this out

    // const auth = getAuth();
    const auth = window.auth;

    // On auth state change, fetch and display user details
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            decideButtonDisplay().catch(error => console.error("Error during deciding button display:", error));
            try {
                // Fetch the username from Firestore for both authentication methods
                // const username = await getUserDetails(user.uid);
                // currentUsername = username || 'Unknown User';
                const username = await getUserDetails(user.uid);
                // currentUsername = userDetails.username || 'Unknown User';
                displayLoggedInMessage(username);
                $("#guestPlaySection").hide();
                $("#manageFriendsBtn").show();

            } catch (error) {
                console.error('Error fetching user details:', error.message);
            }
        } else {
            $('#loggedInAs').text(''); // Clear if logged out
            // User is signed out
            // $("#playBtn").show();
            $("#viewSolvedBtn").hide();

        }
        decideButtonDisplay().catch(error => console.error("Error during deciding button display:", error));
    });



    // Load the word list on page load
    fetch('filtered_word_list.json')
        .then(response => response.json())
        .then(data => {
            validWords = data;
            // console.log('Word list loaded successfully:', validWords.length, 'words');
        })
        .catch(error => {
            console.error('Error loading word list:', error);
        });


    // const provider = new GoogleAuthProvider();



    async function decideButtonDisplay() {
        const user = auth.currentUser;
        if (user) {
            const statsRef = collection(window.db, "leaderboard");
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const q = query(
                statsRef, 
                where("uid", "==", user.uid), 
                where("puzzleId", "==", currentPuzzleId),
                where("date", ">=", today.toISOString()),
                where("date", "<", tomorrow.toISOString())
            );

            console.log("Checking for document with user ID and puzzle ID:", user.uid, currentPuzzleId);

            const querySnapshot = await getDocs(q);
            // Reset button visibility
            $("#playBtn, #viewSolvedBtn").hide();

            if (!querySnapshot.empty) {
                const docSnap = querySnapshot.docs[0];
                const data = docSnap.data();
                console.log("Leaderboard data retrieved:", data);

                if (data.hasCompleted || data.hasGivenUp) {
                    $("#viewSolvedBtn").show().off("click").click(data.hasCompleted ? showSolvedPuzzle : showGivenUpPuzzle);
                    $("#manageFriendsBtn").show();
                    
                    if (data.hasGivenUp) {
                        await fetchTodaysPuzzle();
                    }
                    return; // Exit early to prevent Play button from showing
                }
            }
            // Only show Play button if puzzle not completed/given up today
            $("#playBtn").show();
        }
    }




    // Function to check and register new Google users
    async function registerGoogleUser(user, emailUsername) {
        try {
            const userRef = doc(window.db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            // If the user doesn't have a document, create one
            if (!userSnap.exists()) {
                console.log('New Google user detected. Creating Firestore entry.');
                await setDoc(userRef, {
                    uid: user.uid,
                    username: emailUsername || user.displayName || 'Unknown User', // Use displayName if available
                    email: user.email
                });
            } else {
                // Update username if it's different
                const currentUsername = userSnap.data().username;
                if (emailUsername !== currentUsername) {
                    await setDoc(userRef, { username: emailUsername || user.displayName || 'Unknown User' }, { merge: true });
                }
            }
        } catch (error) {
            console.error('Error registering Google user:', error);
        }
    }

    // Google Login Functionality
    $('#googleLoginBtn, .google-login-btn').click(function() {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider)
            .then(async (result) => {
                const user = result.user;
                console.log('User logged in with Google:', user);
                // Extract username from email for Google users
                let emailUsername = user.email.split('@')[0];

                // Check if username exists
                const usersRef = collection(window.db, "users");
                const q = query(usersRef, where("username", "==", emailUsername));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    // Check if the existing username belongs to a different user
                    const existingUser = querySnapshot.docs[0].data();
                    if (existingUser.email !== user.email) {
                        // Only append random numbers if it's a different user
                        const randomNum = Math.floor(Math.random() * 100);
                        emailUsername = `${emailUsername}${randomNum}`;
                    }
                }

                // Update user document with the username
                const userRef = doc(window.db, "users", user.uid);
                await setDoc(userRef, {
                    uid: user.uid,
                    username: emailUsername,
                    email: user.email
                }, { merge: true });
                displayLoggedInMessage(emailUsername);
                toastr.success("Logged in successfully!");
                $("#loginForm").hide();
                $("#signUpForm").hide();
                $("#signUpBtn").hide();
                $("#googleLoginBtn").hide();
                $("#logInBtn").hide();
                $("#guestPlaySection").hide();

                // Check if puzzle is already completed before showing Play button
                decideButtonDisplay().catch(error => console.error("Error checking puzzle completion:", error));

            })
            .catch((error) => {
                console.error('Error during Google login:', error.message);
                toastr.error('Error: ' + error.message);
            });
    });

    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Conditionally set 'readonly' for mobile devices
    if (isMobileDevice()) {
        $('.cell').attr('readonly', true);
    }



    $('#loginForm').hide();

    // Function to toggle the visibility of login-related buttons
    function toggleAuthButtons(user) {
        if (user) {
            $('#signUpBtn').hide();
            $('#logInBtn').hide();
            $('#googleLoginBtn').hide();
            $('#loggedInAs').text(`Logged in as ${user.displayName || 'User'}`).show();
        } else {
            $('#signUpBtn').show();
            $('#logInBtn').show();
            $('#googleLoginBtn').show();
            $('#loggedInAs').hide();
        }
    }

    // Call this function initially on page load and whenever auth state changes to hide/show correct buttons
    auth.onAuthStateChanged((user) => {
        toggleAuthButtons(user);
    });



    // Key event logic for clicks on keys
    $(".key").click(function() {
        const key = $(this).data("key");
        isProgrammaticChange = true; // Mark change as programmatic before any way this happens
        if (key === "backspace") {
            // console.log("Delete button clicked");
            handleDelete();
        } else {
            $(`#${focusableCells[currentCellIndex]}`).val(key.toUpperCase());
            if (currentCellIndex < focusableCells.length - 1) {
                currentCellIndex++;
                // console.log("Moved to next cell due to key input. Current cell index:", currentCellIndex);
                $(`#${focusableCells[currentCellIndex]}`).focus();
            }
        }
        isProgrammaticChange = false; // Reset after handling input
    });


    let currentPuzzleId = getSequentialDay();
    // console.log(currentPuzzleId);
    // const date = new Date();
    let currentUsername = "";


    function getSequentialDay() {
        const startDate = new Date(Date.UTC(2024, 9, 15)); // Reference start date in UTC (sET TO 2024, 9, 15 for correct puzzle# fetching)
        const localToday = new Date(); // Get the current date in local time
        const localDate = new Date(localToday.getFullYear(), localToday.getMonth(), localToday.getDate());

        // console.log("Start Date (UTC):", startDate.toISOString());
        // console.log("Today's Date (Local):", localDate.toISOString());

        const diff = localDate - startDate;
        const oneDay = 1000 * 60 * 60 * 24;
        const sequentialDay = Math.floor(diff / oneDay) + 1;

        // console.log("Difference in milliseconds:", diff);
        // console.log("Difference in days:", diff / oneDay);
        // console.log("Calculated sequential day:", sequentialDay);

        return sequentialDay;
    }


    let puzzleAnswers;

    async function fetchTodaysPuzzle() {
      const dayId = getSequentialDay().toString();
      try {
        const docRef = doc(window.db, "puzzles", dayId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const puzzleData = docSnap.data();
          // console.log("Puzzle data:", puzzleData);
          puzzleAnswers = {
              word1: puzzleData.word1,
              word2: puzzleData.word2,
              word3: puzzleData.word3,
              word4: puzzleData.word4
          };
          // Update the game board with the puzzle data.
          // Word1: Top word
          $("#cell-2").val(puzzleData.word1.charAt(1)).prop('disabled', true); // 2nd letter of word1

          // Word2: Right word (down)
          $("#cell-6").val(puzzleData.word2.charAt(1)).prop('disabled', true); // 2nd letter of word2
          $("#cell-10").val(puzzleData.word2.charAt(3)).prop('disabled', true); // 4th letter of word2

          // Word3: Bottom word (across)
          $("#cell-13").val(puzzleData.word3.charAt(2)).prop('disabled', true); // 3rd letter of word3

          // Word4: Left word (down)
          $("#cell-5").val(puzzleData.word4.charAt(1)).prop('disabled', true); // 2nd letter of word4
          $("#cell-9").val(puzzleData.word4.charAt(3)).prop('disabled', true); // 4th letter of word4

        } else {
            await fetchRandomPuzzle();
          console.log("No puzzle found for today.");
          toastr.error("No puzzle available for today! Displaying random puzzle.");

        }
      } catch (error) {
        console.error("Error retrieving puzzle data:", error);
        toastr.error("Error retrieving puzzle data.");
      }
    }

    async function fetchRandomPuzzle() {
        const randomPuzzleId = Math.floor(Math.random() * 50) + 1; // Random ID between 1 and 50
        try {
            const docRef = doc(window.db, "puzzles", randomPuzzleId.toString());
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const puzzleData = docSnap.data();
                puzzleAnswers = {
                    word1: puzzleData.word1,
                    word2: puzzleData.word2,
                    word3: puzzleData.word3,
                    word4: puzzleData.word4,
                };
                // Update the game board with the random puzzle data
                // Word1: Top word
                  $("#cell-2").val(puzzleData.word1.charAt(1)).prop('disabled', true); // 2nd letter of word1

                  // Word2: Right word (down)
                  $("#cell-6").val(puzzleData.word2.charAt(1)).prop('disabled', true); // 2nd letter of word2
                  $("#cell-10").val(puzzleData.word2.charAt(3)).prop('disabled', true); // 4th letter of word2

                  // Word3: Bottom word (across)
                  $("#cell-13").val(puzzleData.word3.charAt(2)).prop('disabled', true); // 3rd letter of word3

                  // Word4: Left word (down)
                  $("#cell-5").val(puzzleData.word4.charAt(1)).prop('disabled', true); // 2nd letter of word4
                  $("#cell-9").val(puzzleData.word4.charAt(3)).prop('disabled', true); // 4th letter of word4

            } else {
                toastr.error("Failed to fetch a random puzzle.");
            }
        } catch (error) {
            console.error("Error fetching random puzzle:", error);
            toastr.error("Error fetching random puzzle.");
        }
    }

    // Event listener for the "Give Up" button
    $("#giveUpBtn").click(function() {
        $("#giveUpModal").show(); // Show the confirmation modal
    });

    // Event handler for the confirmation button inside the modal
    $("#confirmGiveUpBtn").click(async function () {
        const user = auth.currentUser;
        if (user) {
            try {
                // Store the give up state in leaderboard
                const statsRef = collection(window.db, "leaderboard");
                const userDoc = await getDoc(doc(window.db, "users", user.uid));
                const username = userDoc.exists() ? userDoc.data().username : 'Unknown User';
                
                await addDoc(statsRef, {
                    puzzleId: currentPuzzleId,
                    date: new Date().toISOString(),
                    uid: user.uid,
                    username: username,
                    hasGivenUp: true,
                    hasCompleted: false
                });
            } catch (error) {
                console.error("Error storing give up state:", error);
            }
        }

        // Clear all user inputs and display correct answers
        $(".cell").each(function() {
            $(this).val('');
        });
        // Display the correct answers
        $("#cell-1").val(puzzleAnswers.word1.charAt(0));
        $("#cell-2").val(puzzleAnswers.word1.charAt(1));
        $("#cell-3").val(puzzleAnswers.word1.charAt(2));
        $("#cell-4").val(puzzleAnswers.word1.charAt(3));

        $("#cell-6").val(puzzleAnswers.word2.charAt(1));
        $("#cell-7").val(puzzleAnswers.word4.charAt(2));
        $("#cell-8").val(puzzleAnswers.word2.charAt(2));
        $("#cell-10").val(puzzleAnswers.word2.charAt(3));
        $("#cell-11").val(puzzleAnswers.word3.charAt(0));
        $("#cell-12").val(puzzleAnswers.word3.charAt(1));
        $("#cell-13").val(puzzleAnswers.word3.charAt(2));
        $("#cell-14").val(puzzleAnswers.word3.charAt(3));

        $("#cell-5").val(puzzleAnswers.word4.charAt(1));
        $("#cell-9").val(puzzleAnswers.word4.charAt(3));

        // Disable all cells in the game grid
        $(".cell").prop('disabled', true);

        // $("#cell-1").css('padding-top', '5px');
        // $("#cell-3").css('padding-top', '6px');
        // $("#cell-4").css('padding-top', '6px');
        // $("#cell-7").css('padding-top', '5px');
        // $("#cell-8").css('padding-top', '5px');
        // $("#cell-11").css('padding-top', '2px');
        // $("#cell-12").css('padding-top', '5px');
        // $("#cell-14").css('padding-top', '5px');
        // Show the give up message
        toastr.info("You gave up! Sorry, better luck tomorrow.");
        // Hide the confirmation modal
        $("#giveUpModal").hide();
        //hide the submit and give up buttons
        $("#submitBtn").hide();
        $("#giveUpBtn").hide();

        $("#resultTime").css('display', 'block').text(`You gave up. Better luck tomorrow!`);

        $("#gameBoard").css('display', 'block');
        // Show default words and message

        getLeaderboard();

        // Hide modal and submit button
        $("#giveUpModal").hide();
        $("#submitBtn").hide();
        $("#giveUpBtn").hide();
        $("#resultTime").css('display', 'block').text(`You gave up. Better luck tomorrow!`);
    });
    
    // Event handler for cancel button inside the modal
    $("#cancelGiveUpBtn").click(function() {
        $("#giveUpModal").hide();
    });




    let startTime;

    // Event listener for the "Play" button
    $("#playBtn").click(function() {
        // Perform reset actions
        resetGameBoard();
        fetchTodaysPuzzle();
        $('#signUpForm').hide(); // Hide the sign-up form
        $('#loginForm').hide();   // Hide the login form
        $("#landingPage").css('display', 'none');
        $("#gameBoard").css('display', 'block');
        $("#cell-1").focus();
        $("#googleLoginBtn").hide();
        $("#example").hide();
        $("#viewLeaderboardBtn").hide();
        $("#leaderboard").hide();

        startTime = new Date(); // Record the start time

        // Scroll to the top of the game board
        document.getElementById('gameBoard').scrollIntoView({ behavior: 'smooth' });
    });

    // Show the Sign-Up Form
      $('#signUpBtn').click(function() {
        $('#signUpForm').show(); // Show the sign-up form
        $('#loginForm').hide();   // Hide the login form if it's visible
        // $('#playBtn').hide(); // Hide the play button if it's visible
        $('#username').focus();
          // $('#guestPlaySection').hide();
      });
      // Show the Log-In Form
      $('#logInBtn').click(function() {
        $('#loginForm').show();   // Show the login form
        $('#signUpForm').hide(); // Hide the sign-up form if it's visible
        $("#loginEmail").focus();
        // $('#guestPlaySection').hide();
      });

    // Convert all user inputs to uppercase
    $(".cell").on('input', function() {
        this.value = this.value.toUpperCase();
    });

    // Function to format time in seconds into a "mm:ss" format
    function formatTime(elapsedTimeInSeconds) {
        const minutes = Math.floor(elapsedTimeInSeconds / 60);
        const seconds = Math.floor(elapsedTimeInSeconds % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }


    // Function to check if a word is valid using the loaded word list
    function isValidWord(word) {
        const isValid = validWords.includes(word.toLowerCase());
        console.log(`Checking word: ${word} - Valid: ${isValid}`);
        return isValid;
    }


    // Validation function to check user's input against the dictionary
    function validatePuzzle() {
        console.log("Starting puzzle validation");
        
        // Explicitly specify the IDs of editable cells
        let editableCellIds = ["cell-1", "cell-3", "cell-4", "cell-7", "cell-8", "cell-11", "cell-12", "cell-14"];
        let editableCells = editableCellIds.map(id => $(`#${id}`));
        
        console.log("Editable cells to check:", editableCellIds);
        
        // Log each cell's content
        editableCellIds.forEach(id => {
            console.log(`Cell ${id} content: "${$(`#${id}`).val()}" - Empty: ${$(`#${id}`).val().trim() === ''}`);
        });
        
        // Check if all editable input fields are filled
        let allFilled = true;
        let emptyCell = null;
        for (let i = 0; i < editableCells.length; i++) {
            if (editableCells[i].val().trim() === '') {
                allFilled = false;
                emptyCell = editableCellIds[i];
                console.log(`Empty cell found: ${emptyCell}`);
                break; // Break loop on finding an empty field
            }
        }

        console.log("All cells filled:", allFilled);

        if (!allFilled) {
            console.log("Validation failed: Not all cells are filled");
            toastr.warning("Please fill in all letters before submitting.");
            return; // Exit validation function early
        }

        // Construct words from the user's input
        let userWord1 = $("#cell-1").val() + $("#cell-2").val() + $("#cell-3").val() + $("#cell-4").val();
        let userWord2 = $("#cell-4").val() + $("#cell-6").val() + $("#cell-8").val() + $("#cell-10").val() + $("#cell-14").val();
        let userWord3 = $("#cell-11").val() + $("#cell-12").val() + $("#cell-13").val() + $("#cell-14").val();
        let userWord4 = $("#cell-1").val() + $("#cell-5").val() + $("#cell-7").val() + $("#cell-9").val() + $("#cell-11").val();

        console.log("User's input words:", userWord1, userWord2, userWord3, userWord4);

        // Validate each word using the isValidWord function
        const allValid = [userWord1, userWord2, userWord3, userWord4].every(isValidWord);

        if (allValid) {
            toastr.success("Puzzle Complete!");
            $('#giveUpBtn').hide();
            let endTime = new Date();
            let elapsedTime = (endTime - startTime) / 1000;

            // Formatting the elapsed time
            const formattedTime = formatTime(elapsedTime);

            $("#submitBtn").css('display', 'none');
            $("#resultTime").css('display', 'block').text(`Completed in: ${formattedTime}`);
            const user = getAuth().currentUser;

            // Check for Web Share API support and show the share button
            if (navigator.share) {
                $("#shareButtonContainer").show();
                const today = new Date();
                const formattedDate = `${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}`;
                $("#shareBtn").click(async function() {
                    const puzzleNumber = currentPuzzleId; // Ensure this is defined appropriately in your game logic
                    const shareData = {
                        title: 'Borders',
                        text: `Borders Puzzle #${puzzleNumber} - ${formattedDate} - Time: ${formattedTime}`,
                        url: window.location.href
                    };
                    try {
                        await navigator.share(shareData);
                    } catch (error) {
                        console.error('Error sharing:', error);
                    }
                });
            } else {
                console.warn('Web Share API is not supported in this browser.');
            }

            if (user) {
                let userWordsArray = [userWord1, userWord2, userWord3, userWord4];
                storePlayerStats(
                    currentPuzzleId, 
                    new Date().toISOString(), 
                    user.uid, 
                    elapsedTime, 
                    userWordsArray);
                getLeaderboard();
                $("#shareBtn").focus();
                // Show the share button for logged-in users if Web Share API is supported
                if (navigator.share) {
                    $("#shareButtonContainer").show();
                    const today = new Date();
                    const formattedDate = `${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}`;
                    $("#shareBtn").click(async function() {
                        const puzzleNumber = currentPuzzleId;
                        const shareData = {
                            title: 'Borders Puzzle Game',
                            text: `Borders Puzzle #${puzzleNumber} - ${formattedDate} - Time: ${formattedTime}`,
                            url: window.location.href
                        };
                        try {
                            await navigator.share(shareData);
                        } catch (error) {
                            console.error('Error sharing:', error);
                        }
                    });
                } else {
                    console.warn('Web Share API is not supported in this browser.');
                }
            } else {
                // $("#signUpCTA").css('display', 'block');
                getLeaderboard();
                // console.error('User UID is missing. Could not store player stats.');
            }
        } else {
            toastr.error("Some of your words are not valid. Try again.");
        }
    }




    toastr.options = {
      "closeButton": true,
      "debug": false,
      "newestOnTop": true,
      // "progressBar": true,
      "positionClass": "toast-top-full-width",
      "preventDuplicates": false,
      "showDuration": "300",
      "hideDuration": "1000",
      "timeOut": "2500",
      "extendedTimeOut": "1000",
      "showEasing": "swing",
      "hideEasing": "linear",
      "showMethod": "fadeIn",
      "hideMethod": "fadeOut"
    };

    $("#cell-1").focus();

    // Event listener for the "Submit" button
    $("#submitBtn").click(function() {
        validatePuzzle(); // Run the validation when the user clicks submit
    });

    // Event listener for pressing Enter while #cell-14 is focused
    $("#cell-14").on('keydown', function(event) {
        if (event.key === 'Enter') {
            $("#submitBtn").click(); // Trigger the submit button click
        }
    });

    let currentCellIndex = 0;

    // Define the sequence of focusable cells
    const focusableCells = ["cell-1", "cell-3", "cell-4", "cell-7", "cell-8", "cell-11", "cell-12", "cell-14"];

    // Initialize focus on the first cell when the game starts
    // console.log("Initializing focus on first cell:");
    $(`#${focusableCells[currentCellIndex]}`).focus();
    // console.log("Current cell index after initialization:", currentCellIndex);

    // Attach event listeners to each cell to update currentCellIndex on focus
    focusableCells.forEach((cellId, index) => {
        $(`#${cellId}`).on('focus click', function(e) {
            if (currentCellIndex !== index) {
                currentCellIndex = index; // Update the index of the focused cell
            }
            $(this).select();
            e.preventDefault();
        });

        // Also handle mouseup to maintain selection
        $(`#${cellId}`).on('mouseup', function(e) {
            e.preventDefault();
            $(this).select();
        });
    });

    // Input event to move focus which should be conditional and exclude isProgrammaticChange
    focusableCells.forEach((cellId, index) => {
        $(`#${cellId}`).on('input', function(event) {
            if (!isProgrammaticChange && $(this).val().length === 1 && index < focusableCells.length - 1) {
                currentCellIndex++;
                $(`#${focusableCells[currentCellIndex]}`).focus().select();
            }
        });
    });



    // Function to handle the deletion logic
    function handleDelete() {
        // console.log("Handle delete called. Current cell index:", currentCellIndex);
        let currentCell = $(`#${focusableCells[currentCellIndex]}`);
        if (currentCell.val().length > 0) {
            currentCell.val("");

        } else if (currentCellIndex > 0) {
            currentCellIndex--; // Move back one cell
            // console.log("Moved to previous cell. Current cell index:", currentCellIndex);
            let previousCell = $(`#${focusableCells[currentCellIndex]}`);
            previousCell.val(""); // Clear the previous cell
            previousCell.focus(); // Focus the previous cell
        }

        // Reset any programmatic change flags
        isProgrammaticChange = false;
    }



    // Handle keyboard events for navigation and deletion
    $(document).keydown(function(event) {
        const focusedElement = document.activeElement;
        const isGameCell = $(focusedElement).hasClass('cell');

        if (isGameCell) {
            let nextCell;

            switch(event.key) {
                case "Backspace":
                    event.preventDefault();
                    handleDelete();
                    break;

                case "ArrowLeft":
                    if (currentCellIndex > 0) {
                        event.preventDefault();
                        currentCellIndex--;
                        nextCell = $(`#${focusableCells[currentCellIndex]}`);
                        nextCell.focus();
                        // Force selection after a brief delay
                        setTimeout(() => {
                            nextCell.select();
                        }, 0);
                    }
                    break;

                case "ArrowRight":
                    if (currentCellIndex < focusableCells.length - 1) {
                        event.preventDefault();
                        currentCellIndex++;
                        nextCell = $(`#${focusableCells[currentCellIndex]}`);
                        nextCell.focus();
                        // Force selection after a brief delay
                        setTimeout(() => {
                            nextCell.select();
                        }, 0);
                    }
                    break;

                // Handle alphanumeric input
                default:
                    if (event.key.length === 1 && event.key.match(/[a-zA-Z]/)) {
                        // If it's a letter key, select the current content
                        $(focusedElement).select();
                    }
                    break;
            }
        }
    });

    // Also modify the cell input handlers to ensure proper selection
    $('.cell').on('focus click keyup', function(e) {
        $(this).select();
    });

    // Prevent selection from being cleared on mouseup
    $('.cell').on('mouseup', function(e) {
        e.preventDefault();
        $(this).select();
    });
    
    // Handle touch events for mobile to prevent selection UI
    $('.cell, .guest-cell').on('touchstart touchend', function(e) {
        e.preventDefault();
        $(this).focus();
        return false;
    });




    function resetGameBoard() {
        // Clear all input cells
        $('.cell').each(function() {
            $(this).val(''); // Clear the value
            $(this).prop('disabled', false); // Ensure it's enabled if applicable
        });
        // Hide and reset any completion message or related UI elements
        $("#resultTime").hide().text('');
        $("#submitBtn").show(); // Show the submit button if it was previously hidden
    }


    function isValidEmail(email) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(email);
    }

    // Sign-Up Functionality
    $('#signUpSubmitBtn').click(async function() {
      const username = $('#username').val();
      const email = $('#email').val();
        if (!isValidEmail(email)) {
            toastr.error("Please enter a valid email address.");
            return;
        }

        // Check for spaces in username
        if (username.includes(' ')) {
            $('#usernameError').text('Username cannot contain spaces').css('color', 'red');
            return;
        }

        // Proceed with account creation without checking username
        // We'll validate uniqueness when writing to the users collection
        $('#usernameError').text(''); // Clear any previous errors

      const password = $('#password').val();
      const confirmPassword = $('#confirmPassword').val();

        // Check if passwords match
          if (password !== confirmPassword) {
              toastr.error('Passwords do not match. Please try again.');
            return;
          }

        if (!username || !email || !password) {
            toastr.warning('All fields are required.');
            return;
          }

      createUserWithEmailAndPassword(window.auth, email, password)
        .then((userCredential) => {
          // Successfully signed up
          const user = userCredential.user;
          // console.log('User created:', user);


          $('#signUpForm').hide(); // Hide the sign-up form
          $('#loginForm').show();   // Show the login form
          $('#signUpBtn').hide();
          $('#logInBtn').show();

          $('#playBtn').show();
          $("#manageFriendsBtn").show();



            // Store the username in Firestore linked to the user ID
              const userRef = doc(window.db, "users", user.uid);
              setDoc(userRef, {
                uid: user.uid,
                username: username,
                email: email, // Optional if needed for admin reference
              })
              .then(() => {
                // console.log('User data stored successfully');
                // Redirect or show login success message
                // alert("Account created successfully!Please login.");
                toastr.success("Account created successfully!");
                $('#signUpForm').hide();
                  $('#logInBtn').hide();
                  $('#loginForm').hide();

              })
              .catch(error => {
                    console.error('Error storing user data:', error);
                });

        })
        .catch((error) => {
          // Error handling
          const errorCode = error.code;
          const errorMessage = error.message;
          console.error('Error during sign-up:', errorCode, errorMessage);
          alert('Error: ' + errorMessage);
        });
    });


    // Log-In Functionality
    $('#logInSubmitBtn').click(function() {
        const email = $('#loginEmail').val();
        const password = $('#loginPassword').val();
        signInWithEmailAndPassword(window.auth, email, password)
            .then(async (userCredential) => {
                const user = userCredential.user;
                toggleAuthButtons(user); // Update buttons on successful login
                // Ensure uid is defined and fetch user details
                if (user && user.uid) {
                    // console.log('User UID:', user.uid);
                    // Fetch the username from Firestore based on the user's UID
                    const username = await getUserDetails(user.uid);
                    currentUsername = username || 'Unknown User';
                    // console.log('Logged in as:', currentUsername);
                    displayLoggedInMessage(currentUsername);
                    // Show success and hide login-related UI elements
                    toastr.success("Logged in successfully!");
                    $("#playBtn").show();
                    $("#manageFriendsBtn").show();
                    $("#signupSuccess").hide();
                    $("#loginForm").hide();
                    $("#logInBtn").hide();
                    $("#signUpForm").hide();
                    $("#signUpBtn").hide();
                    $("#googleLoginBtn").hide();
                    $("#guestPlaySection").hide();
                    // Proceed with showing the game or leaderboard
                    // Add additional logic if needed to transition to game/leaderboard
                } else {
                    console.error('Error: UID is missing.');
                }
            })
            .catch((error) => {
                const errorCode = error.code;
                const errorMessage = error.message;
                console.error('Error during login:', errorCode, errorMessage);
                // alert('Error: ' + errorMessage);
                toastr.error("Error during login: " + errorMessage);
            });
    });


    // Function to display the logged-in message
    function displayLoggedInMessage(username) {
        $('#loggedInAs').text(`Logged in as ${username}`).show();
    }


    // Event listener for the "Sign in here" link
    $('#haveAccountSignIn').click(function(event) {
        event.preventDefault(); // Prevent default anchor behavior
        // Hide the sign-up form and show the login form
        $('#signUpForm').hide();
        $('#loginForm').show();
        $('#gameBoard').hide();
        $('#leaderboard').hide();
        $('#landingPage').show()
    });


    async function storePlayerStats(puzzleId, date, uid, time, words) {
        try {
            // Get the username first
            const userDoc = await getDoc(doc(window.db, "users", uid));
            const username = userDoc.exists() ? userDoc.data().username : 'Unknown User';
            const formattedDate = new Date(date).toISOString();

            const wordsList = Array.isArray(words) ? words : [];

            const statsRef = collection(window.db, "leaderboard");
            const entryData = {
                puzzleId: puzzleId,
                date: formattedDate,
                uid: uid,
                username: username || 'Unknown User',
                time: Number(time), // Ensure time is stored as a number
                words: wordsList,
                hasCompleted: true,
                hasGivenUp: false,
            };
            // Log the data being stored for debugging
                    console.log('Storing leaderboard entry:', entryData);
                    await addDoc(statsRef, entryData);
                    console.log('Player stats stored successfully');
                    // Refresh the leaderboard display
                    getLeaderboard();
                } catch (error) {
                    console.error('Error storing player stats:', error);
                    throw error; // Rethrow the error for handling upstream
                }
            }

    //Function to close the stats modal
    function closeStatsModal() {
        $('.stats-modal').css('display', 'none');
    }

    $(".close-modal-btn").click(function() {
        closeStatsModal();
    })


    async function showSolvedPuzzle() {
        const stats = await getUserStatistics();
        if (stats) {
            $('#gamesPlayedStat').text(stats.gamesPlayed);
            $('#winPercentageStat').text(stats.winPercentage + '%');
            $('#bestRankStat').text(stats.bestRank);
            $('#bestTimeStat').text(stats.bestTime);
        }
        $(".stats-modal").css('display', 'block');
        
        $("#landingPage").hide();
        $("#submitBtn").hide();
        $("#giveUpBtn").hide();
        $("#example").hide();
        $("#viewSolvedPuzzleBtn").hide();
        $("#virtual-keyboard").hide();


        getLeaderboard();
        const user = auth.currentUser;
        if (!user) {
            console.error("User must be logged in to view the solved puzzle.");
            return;
        }

        const statsRef = collection(window.db, "leaderboard");
        const q = query(statsRef, where("uid", "==", user.uid), where("puzzleId", "==", currentPuzzleId));

        try {
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const docSnap = querySnapshot.docs[0]; // Get the first matching document
                const data = docSnap.data();
                const userWordsArray = data.words;
                const formattedTime = formatTime(data.time);

                // Update the grid with userWordsArray
                $("#cell-1").val(userWordsArray[0].charAt(0));
                $("#cell-2").val(userWordsArray[0].charAt(1));



                $("#cell-3").val(userWordsArray[0].charAt(2));
                $("#cell-4").val(userWordsArray[0].charAt(3));

                $("#cell-4").val(userWordsArray[1].charAt(0));
                $("#cell-6").val(userWordsArray[1].charAt(1));
                $("#cell-8").val(userWordsArray[1].charAt(2));
                $("#cell-10").val(userWordsArray[1].charAt(3));
                $("#cell-14").val(userWordsArray[1].charAt(4));

                $("#cell-11").val(userWordsArray[2].charAt(0));
                $("#cell-12").val(userWordsArray[2].charAt(1));
                $("#cell-13").val(userWordsArray[2].charAt(2));
                $("#cell-14").val(userWordsArray[2].charAt(3));

                $("#cell-1").val(userWordsArray[3].charAt(0));
                $("#cell-5").val(userWordsArray[3].charAt(1));
                $("#cell-7").val(userWordsArray[3].charAt(2));
                $("#cell-9").val(userWordsArray[3].charAt(3));
                $("#cell-11").val(userWordsArray[3].charAt(4));

                // Disable all cells in the game grid
                $(".cell").prop('disabled', true);

                // Apply padding to specific cells
                $("#cell-1, #cell-3, #cell-4, #cell-7, #cell-8, #cell-11, #cell-12, #cell-14").addClass("padded-cell");

                // Show completion time and any success messages
                $("#gameBoard").css('display', 'block');
                $("#resultTime").text(`Completed in: ${formattedTime}`).show();

                // Show share button if Web Share API is supported
                if (navigator.share) {
                    $("#shareButtonContainer").show();

                    $('#shareBtn').on('click', async function () {
                    try {
                        // Get the leaderboard data as text first
                        const leaderboardText = Array.from($('#leaderboardTable tbody tr')).map(row => {
                            const cells = Array.from(row.cells);
                            return `${cells[0].textContent} ${cells[1].textContent} - ${cells[2].textContent}`;
                        }).join('\n');

                        const today = new Date();
                        const formattedDate = `${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}`;
                        const shareText = `Borders #${currentPuzzleId} - ${formattedDate}\n\n${leaderboardText}`;

                        if (navigator.share) {
                            await navigator.share({
                                title: "Borders Leaderboard",
                                text: shareText
                            });
                            console.log("Shared successfully");
                        } else {
                            // Fallback for devices without sharing capability
                            const textarea = document.createElement('textarea');
                            textarea.value = shareText;
                            document.body.appendChild(textarea);
                            textarea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textarea);
                            toastr.success('Leaderboard copied to clipboard!');
                        }
                    } catch (error) {
                        console.error('Error sharing:', error);
                        if (error.name === 'AbortError') {
                            return;
                        }
                        toastr.error('Unable to share leaderboard. Try copying and pasting manually.');
                    }
                });

                }
            } else {
                console.error("No solved puzzle data found.");
            }
        } catch (error) {
            console.error("Error retrieving solved puzzle data:", error);
        }
    }


    function showGivenUpPuzzle() {

        $("#gameBoard").css('display', 'block');
        $("#landingPage").hide();
        $("#example").hide();
        $("#viewSolvedPuzzleBtn").hide();
        $("#submitBtn").hide();
        $("#giveUpBtn").hide();
        $("#virtual-keyboard").hide();

        // Show the saved correct answers from the puzzle data
        // Assume `puzzleAnswers` contains the correct answers
        $("#cell-1").val(puzzleAnswers.word1.charAt(0));
        $("#cell-2").val(puzzleAnswers.word1.charAt(1));
        $("#cell-3").val(puzzleAnswers.word1.charAt(2));
        $("#cell-4").val(puzzleAnswers.word1.charAt(3));
        $("#cell-6").val(puzzleAnswers.word2.charAt(1));
        $("#cell-7").val(puzzleAnswers.word4.charAt(2));
        $("#cell-8").val(puzzleAnswers.word2.charAt(2));
        $("#cell-10").val(puzzleAnswers.word2.charAt(3));
        $("#cell-14").val(puzzleAnswers.word2.charAt(4));
        $("#cell-11").val(puzzleAnswers.word3.charAt(0));
        $("#cell-12").val(puzzleAnswers.word3.charAt(1));
        $("#cell-13").val(puzzleAnswers.word3.charAt(2));
        $("#cell-14").val(puzzleAnswers.word3.charAt(3));
        $("#cell-5").val(puzzleAnswers.word4.charAt(1));
        $("#cell-9").val(puzzleAnswers.word4.charAt(3));
        $("#resultTime").text("You gave up. Better luck tomorrow!").show();

        $("#leaderboard").show();

        getLeaderboard();


        // Apply padding to specific cells
        $("#cell-1, #cell-3, #cell-4, #cell-7, #cell-8, #cell-11, #cell-12, #cell-14").addClass("padded-cell");
        // Disable all cells in the game grid
        $(".cell").prop('disabled', true);
    }


    // Function to get all-time best times
async function getBestTimes() {
    const statsRef = collection(window.db, "leaderboard");
    const showFriendsOnly = $('#friendsFilterBtn').hasClass('active');
    let q;

    if (showFriendsOnly && auth.currentUser) {
        const friendsList = await getFriendsList();
        const friendUids = [...friendsList.map(friend => friend.uid), auth.currentUser.uid];

        if (friendUids.length > 0) {
            q = query(
                statsRef,
                where("uid", "in", friendUids),
                orderBy("time", "asc"),
                limit(20)
            );
        } else {
            q = query(
                statsRef,
                where("uid", "==", auth.currentUser.uid),
                orderBy("time", "asc"),
                limit(20)
            );
        }
    } else {
        q = query(
            statsRef,
            orderBy("time", "asc"),
            limit(20)
        );
    }

    try {
        const querySnapshot = await getDocs(q);
        const leaderboardData = [];
        for (const doc of querySnapshot.docs) {
            const data = doc.data();
            if (!data.hasGivenUp) {
                leaderboardData.push(data);
            }
        }
        // $('#leaderboardDate').hide();
        $('#leaderboardDate').text('All Time');
        displayLeaderboard(leaderboardData);
    } catch (error) {
        console.error('Error fetching best times:', error);
    }
}

// Function to get users with most wins
async function getMostWins() {
    const statsRef = collection(window.db, "leaderboard");
    const showFriendsOnly = $('#stats-friendsFilterBtn').hasClass('active');
    try {
        // Get all completed entries
        const baseQuery = query(statsRef, where("hasCompleted", "==", true));
        let querySnapshot;
        
        if (showFriendsOnly && auth.currentUser) {
            const friendsList = await getFriendsList();
            const friendUids = [...friendsList.map(friend => friend.uid), auth.currentUser.uid];
            if (friendUids.length > 0) {
                querySnapshot = await getDocs(query(statsRef, 
                    where("hasCompleted", "==", true),
                    where("uid", "in", friendUids)
                ));
            } else {
                querySnapshot = { docs: [] };
            }
        } else {
            querySnapshot = await getDocs(baseQuery);
        }

        // Group entries by puzzle ID
        const puzzleGroups = {};
        querySnapshot.docs.forEach(doc => {
            const data = doc.data();
            const puzzleId = data.puzzleId;
            if (!puzzleGroups[puzzleId]) {
                puzzleGroups[puzzleId] = [];
            }
            puzzleGroups[puzzleId].push(data);
        });

        // Count wins per user
        const userWins = {};
        Object.values(puzzleGroups).forEach(puzzleEntries => {
            // Sort by completion time
            puzzleEntries.sort((a, b) => a.time - b.time);
            
            // First place gets a win
            if (puzzleEntries.length > 0) {
                const winner = puzzleEntries[0];
                if (!userWins[winner.username]) {
                    userWins[winner.username] = {
                        wins: 1,
                        uid: winner.uid
                    };
                } else {
                    userWins[winner.username].wins++;
                }
            }
        });

        // Convert to array and sort
        const sortedWins = Object.entries(userWins)
            .map(([username, data]) => ({
                username,
                wins: data.wins,
                uid: data.uid
            }))
            .sort((a, b) => b.wins - a.wins)
            .slice(0, 10);

        // $('#leaderboardDate').hide();
        $('#leaderboardDate').text('All Time');
        displayWinnersList(sortedWins);
    } catch (error) {
        console.error('Error fetching most wins:', error);
    }
}

// Function to display winners list
async function displayWinnersList(winnersList) {
    const targetElement = document.getElementById('stats-leaderboard');
    if (!targetElement) return;

    let table = targetElement.querySelector('table');
    if (!table) {
        table = document.createElement('table');
        table.className = 'leaderboard-table';
        targetElement.appendChild(table);
    }
    const thead = table.getElementsByTagName('thead')[0] || table.createTHead();
    const tbody = table.getElementsByTagName('tbody')[0] || table.createTBody();
    
    const user = auth.currentUser;
    const friendsList = user ? await getFriendsList() : [];

    // Filter out entries with undefined username
    winnersList = winnersList.filter(winner => 
        winner.username && 
        winner.username !== 'undefined' && 
        winner.username.toLowerCase() !== 'undefined'
    );

    // Get list of friend UIDs for easier comparison
    const friendUids = friendsList.map(friend => friend.uid);

    // Update table headers for Most 1st Place view
    thead.innerHTML = `
        <tr>
            <th>Rank</th>
            <th>User</th>
            <th>Wins</th>
        </tr>
    `;

    tbody.innerHTML = '';

    winnersList.forEach((winner, index) => {
        const row = tbody.insertRow();
        const rankCell = row.insertCell(0);
        const usernameCell = row.insertCell(1);
        const winsCell = row.insertCell(2);

        rankCell.textContent = `${index + 1}${getOrdinalSuffix(index + 1)}`;
        
        // Create username cell with add friend button
        usernameCell.innerHTML = winner.username;
        if (user && winner.uid && winner.uid !== user.uid && !friendUids.includes(winner.uid)) {
            const friendBtn = document.createElement('button');
            friendBtn.className = 'friend-btn';
            friendBtn.innerHTML = '<span style="color: #359235; font-size:20px;">+</span>';
            friendBtn.style.color = '#4CAF50';
            friendBtn.onclick = async () => {
                await addFriend(winner.uid, winner.username);
                // Refresh the leaderboard
                getMostWins();
            };
            usernameCell.appendChild(friendBtn);
        }
        
        winsCell.textContent = winner.wins;
    });
}

async function getLeaderboard(date = new Date()) {
        const statsRef = collection(window.db, "leaderboard");
        currentLeaderboardDate = date;
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
        const showFriendsOnly = $('#friendsFilterBtn').hasClass('active');

        // Update the displayed date
        const formattedDisplayDate = startOfDay.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
        });
        $('#leaderboardDate').text(formattedDisplayDate);

        // Calculate puzzle ID for the selected date
        const startDateMs = new Date(Date.UTC(2024, 9, 15)).getTime();
        const selectedDateMs = startOfDay.getTime();
        const daysDiff = Math.floor((selectedDateMs - startDateMs) / (1000 * 60 * 60 * 24));
        const puzzleId = daysDiff + 1;
        
        let q;
        if (showFriendsOnly) {
            const friendsList = await getFriendsList();
            if (friendsList.length > 0) {
                const friendUids = friendsList.map(friend => friend.uid);
                friendUids.push(auth.currentUser.uid); // Include current user
                q = query(
                    statsRef,
                    where("uid", "in", friendUids),
                    where("puzzleId", "==", puzzleId),
                    orderBy("date"),
                    orderBy("time", "asc"),
                    limit(20)
                );
            } else {
                // If no friends, only show current user's results
                q = query(
                    statsRef,
                    where("uid", "==", auth.currentUser.uid),
                    where("puzzleId", "==", puzzleId),
                    orderBy("date"),
                    orderBy("time", "asc"),
                    limit(10)
                );
            }
        } else {
            q = query(
                statsRef,
                where("puzzleId", "==", puzzleId),
                orderBy("date"),
                orderBy("time", "asc"),
                limit(20)
            );
        }

        try {
            const querySnapshot = await getDocs(q);
            let leaderboardData = [];

            for (const doc of querySnapshot.docs) {
                const data = doc.data();
                if (data.hasGivenUp) {
                    continue;
                }

                // Get username from users collection if not present
                if (!data.username && data.uid) {
                    try {
                        const userDoc = await getDoc(doc(window.db, "users", data.uid));
                        if (userDoc.exists()) {
                            data.username = userDoc.data().username;
                        }
                    } catch (error) {
                        console.error('Error fetching username:', error);
                        data.username = 'Unknown User';
                    }
                }

                leaderboardData.push(data);
            }
            // Sort by time in ascending order (fastest first)
            leaderboardData.sort((a, b) => a.time - b.time);
            displayLeaderboard(leaderboardData);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        }
    }



    // Event listener for the "View Today's Leaderboard" button
    $('#viewLeaderboardBtn').click(function() {
        const leaderboard = $('#leaderboard');
        if (leaderboard.is(':visible')) {
            leaderboard.hide(); // Hide the leaderboard if currently visible
        } else {
            leaderboard.show(); // Show the leaderboard if currently hidden
            $('#leaderboardTable').find('tbody').html('<tr><td colspan="5">Loading...</td></tr>'); // Set loading message
            getLeaderboard(); // Load leaderboard data when displaying
        }
    });
    
    // Event listener for the "Back to Home" button
    $('#backToHomeBtn').click(function() {
        // Hide all game elements
        $('#gameBoard').hide();
        $('#leaderboard').hide();
        $('#loginForm').hide();
        $('#signUpForm').hide();
        
        // Show landing page
        $('#landingPage').show();
        
        // Show or hide appropriate buttons based on login status
        const user = auth.currentUser;
        if (user) {
            $('#signUpBtn').hide();
            $('#logInBtn').hide();
            $('#googleLoginBtn').hide();
            $('#guestPlaySection').hide();
            $("#manageFriendsBtn").show();
            // Check if puzzle is already completed before showing Play button
            decideButtonDisplay().catch(error => console.error("Error checking puzzle completion:", error));
        } else {
            $('#signUpBtn').show();
            $('#logInBtn').show();
            $('#googleLoginBtn').show();
            $('#guestPlaySection').show();
        }
    });


    async function getUserDetails(uid) {
        console.log(`Fetching user details for UID: ${uid}`);
        try {
            const userRef = doc(window.db, "users", uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                 console.log(`User data found: ${JSON.stringify(userData)}`);
                return userData.username || 'Anonymous User'; // Return the username field
            } else {
                console.warn(`No user document found for UID: ${uid}`);
                return 'Anonymous User';
            }
        } catch (error) {
            console.error('Error fetching user details:', error.message);
            return 'Anonymous User';
        }
    }


    async function displayLeaderboard(leaderboardData) {
        const targetElement = document.getElementById('stats-leaderboard');
        if (!targetElement) return;
        
        updateNavigationButtons();
        const user = auth.currentUser;
        const friendsList = user ? await getFriendsList() : [];
        const isShowingFriends = $('#stats-friendsFilterBtn').hasClass('active');

        // Create table if it doesn't exist in target element
        let table = targetElement.querySelector('table');
        if (!table) {
            table = document.createElement('table');
            table.className = 'leaderboard-table';
            targetElement.appendChild(table);
        }
        const thead = table.getElementsByTagName('thead')[0] || table.createTHead();
        const tbody = table.getElementsByTagName('tbody')[0] || table.createTBody();

        // Determine which view is active
        const activeFilter = $('.filter-btn.active').attr('id');

        // Set appropriate headers based on active filter
        if (activeFilter === 'mostWinsFilter') {
            thead.innerHTML = `
                <tr>
                    <th>Rank</th>
                    <th>User</th>
                    <th>Wins</th>
                </tr>
            `;
        } else {
            thead.innerHTML = `
                <tr>
                    <th>Rank</th>
                    <th>User</th>
                    <th>Time</th>
                    <th>Date</th>
                    <th>Puzzle #</th>
                    <th>Answers</th>
                </tr>
            `;
        }

        tbody.innerHTML = '';

        // Filter out entries with undefined username
        const validEntries = leaderboardData.filter(entry => entry.username !== 'undefined' && entry.username !== undefined);

        validEntries.forEach((entry, index) => {
            const row = tbody.insertRow();
            if (activeFilter === 'mostWinsFilter') {
                const rankCell = row.insertCell(0);
                const usernameCell = row.insertCell(1);
                const winsCell = row.insertCell(2);

                rankCell.textContent = `${index + 1}${getOrdinalSuffix(index + 1)}`;
                usernameCell.textContent = entry.username;
                winsCell.textContent = entry.wins;
            } else {
                const rankCell = row.insertCell(0);
                const usernameCell = row.insertCell(1);
                const timeCell = row.insertCell(2);
                const dateCell = row.insertCell(3);
                const puzzleCell = row.insertCell(4);
                const wordsCell = row.insertCell(5);

                const formattedTime = formatTime(entry.time);

                rankCell.textContent = `${index + 1}${getOrdinalSuffix(index + 1)}`;
                // Create username cell with add/remove friend button
                usernameCell.innerHTML = entry.username;
                if (user && entry.uid !== user.uid) {
                    const isFriend = friendsList.some(friend => friend.uid === entry.uid);
                    if (!isFriend) {
                        const friendBtn = document.createElement('button');
                        friendBtn.className = 'friend-btn';
                        friendBtn.innerHTML = '<span style="color: #359235; font-size:20px;">+</span>';
                        friendBtn.style.color = '#4CAF50';
                        friendBtn.onclick = async () => {
                            await addFriend(entry.uid, entry.username);
                            // Refresh the leaderboard
                            getLeaderboard(currentLeaderboardDate);
                        };
                        usernameCell.appendChild(friendBtn);
                    }
                }
                timeCell.textContent = formattedTime;

                const dateObj = new Date(entry.date);
                const formattedDate = `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}/${dateObj.getFullYear().toString().slice(-2)}`;
                dateCell.textContent = formattedDate;
                puzzleCell.textContent = entry.puzzleId;
                wordsCell.textContent = entry.words ? entry.words.join(', ') : 'No words submitted';
            }
        });
    }



    function getOrdinalSuffix(rank) {
      const j = rank % 10, k = rank % 100;
      if (j === 1 && k !== 11) {
        return "st";
      }
      if (j === 2 && k !== 12) {
        return "nd";
      }
      if (j === 3 && k !== 13) {
        return "rd";
      }
      return "th";
    }


        // Function to toggle the visibility of logout link based on user's login status
        function toggleLogoutLink() {
            const user = auth.currentUser;
            if (user) {
                $('#logoutLink').show(); // Show logout link if the user is logged in
            } else {
                $('#logoutLink').hide(); // Hide it otherwise
            }
        }
        // Call this function initially on page load
        toggleLogoutLink();
        // Listen for changes in authentication state
        auth.onAuthStateChanged((user) => {
            toggleLogoutLink();
        });
        // Event listener for the logout link
        $('#logoutLink').click(function(event) {
            event.preventDefault(); // Prevent default anchor behavior
            signOut(auth)
                .then(() => {
                    console.log('User signed out.');
                    toastr.success('You have been signed out successfully!');
                    // alert('You have been logged out.');
                    // Optionally, navigate to the home page or refresh the page
                    location.reload();
                    $("#playBtn").hide();
                    $("#logInBtn").show();
                    $("#signUpBtn").show();
                    $("#googleLoginBtn").show();
                    $("#gameBoard").hide();
                    $("#landingPage").show();
                    $("#leaderboard").hide();
                })
                .catch((error) => {
                    console.error('Error signing out:', error);
                    alert('Logout failed, please try again.');
                });
        });

        // Event listener for the "Create an account" link
        $('#signupCTAlink').click(function(event) {
            event.preventDefault(); // Prevent default anchor behavior
            // Hide the CTA message and show the sign-up form
            $('#signUpCTA').hide();
            $('#signUpForm').show();
        });


    // Function to check if all inputs are filled
    function allInputsFilled() {
        return focusableCells.every(cellId => $(`#${cellId}`).val().trim() !== '');
    }
    // Function to trigger the button animation
    function triggerButtonAnimation() {
        if (allInputsFilled()) {
            // Add the swell or shake class
            $('#submitBtn').removeClass('swell shake'); // Remove any existing class to reset
            $('#submitBtn').addClass('swell'); // Change to shake if desired
            // Optionally remove the animation class after it runs once
            setTimeout(() => $('#submitBtn').removeClass('swell shake'), 500);
        }
    }
    // Attach input event listeners to each focusable cell
    focusableCells.forEach(cellId => {
        $(`#${cellId}`).on('input', function() {
            triggerButtonAnimation(); // Check after each input change
        });
    });

// Friend management functions
async function addFriend(friendUid, friendUsername) {
    const user = auth.currentUser;
    if (!user) {
        toastr.error("Please log in to add friends");
        return;
    }

    try {
        const friendsRef = doc(window.db, "friends", user.uid);
        const friendsDoc = await getDoc(friendsRef);

        if (friendsDoc.exists()) {
            const currentFriends = friendsDoc.data().friendsList || [];
            const existingFriendIndex = currentFriends.findIndex(friend => friend.uid === friendUid);
            
            if (existingFriendIndex !== -1) {
                // Update username if it's different
                if (currentFriends[existingFriendIndex].username !== friendUsername) {
                    currentFriends[existingFriendIndex].username = friendUsername;
                    await setDoc(friendsRef, { friendsList: currentFriends });
                    toastr.info(`Updated ${friendUsername}'s information`);
                } else {
                    toastr.error("User is already on your friend list");
                }
                return;
            }
            
            await setDoc(friendsRef, {
                friendsList: [...currentFriends, { uid: friendUid, username: friendUsername }]
            });
        } else {
            await setDoc(friendsRef, {
                friendsList: [{ uid: friendUid, username: friendUsername }]
            });
        }
        toastr.success(`Added ${friendUsername} to friends!`);
    } catch (error) {
        console.error("Error adding friend:", error);
        toastr.error("Failed to add friend");
    }
}

async function removeFriend(friendUid) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const friendsRef = doc(window.db, "friends", user.uid);
        const friendsDoc = await getDoc(friendsRef);

        if (friendsDoc.exists()) {
            const currentFriends = friendsDoc.data().friendsList;
            const updatedFriends = currentFriends.filter(friend => friend.uid !== friendUid);
            await setDoc(friendsRef, { friendsList: updatedFriends });
            toastr.success("Friend removed!");
        }
    } catch (error) {
        console.error("Error removing friend:", error);
        toastr.error("Failed to remove friend");
    }
}

async function getFriendsList() {
    const user = auth.currentUser;
    if (!user) return [];

    try {
        const friendsRef = doc(window.db, "friends", user.uid);
        const friendsDoc = await getDoc(friendsRef);
        return friendsDoc.exists() ? friendsDoc.data().friendsList : [];
    } catch (error) {
        console.error("Error getting friends list:", error);
        return [];
    }
}



// Event listener for the "Manage Friends" button
$(document).on('click', '#manageFriendsBtn', async function() {
    const modal = $('<div>').addClass('modal').attr('id', 'friendsModal');
    const modalContent = $('<div>').addClass('modal-content friends-modal');

    // Add header
    modalContent.append($('<h2>').css({
        'font-family': 'Josefin Sans, sans-serif',
        'margin-bottom': '15px'
    }).text('Manage Friends'));

    // Add search section
    const searchSection = $('<div>').addClass('search-section');
    const searchInput = $('<input>')
        .attr({
            type: 'text',
            placeholder: 'Search by username',
            id: 'friendSearchInput',
            autocomplete: 'off'
        })
        .addClass('friend-search-input');
    const searchResults = $('<div>').addClass('search-results');
    searchSection.append(searchInput, searchResults);

    // Add current friends section
    const friendsSection = $('<div>').addClass('friends-section');
    const friendsList = $('<div>').addClass('friends-list');
    const friendsHeader = $('<h3>').css({
        'margin-top': '0'
    }).text('Friends You Follow');
    friendsSection.append(friendsHeader, friendsList);

    // Add close button
    const buttonSection = $('<div>').addClass('modal-buttons');
    const closeBtn = $('<button>').text('Close').addClass('modal-btn close-btn');
    buttonSection.append(closeBtn);

    // Assemble modal
    modalContent.append(searchSection, friendsSection, buttonSection);
    modal.append(modalContent);
    $('body').append(modal);

    // Load current friends
    try {
        const friends = await getFriendsList();
        if (friends.length === 0) {
            friendsList.append($('<p>').text("You haven't followed any friends yet."));
        } else {
            friends.forEach(friend => {
                const friendElement = $('<div>').addClass('friend-item');
                friendElement.append(
                    $('<span>').text(friend.username),
                    $('<button>')
                        .addClass('remove-friend-btn')
                        .text('✕')
                        .data('uid', friend.uid)
                );
                friendsList.append(friendElement);
            });
        }
    } catch (error) {
        console.error('Error loading friends:', error);
        friendsList.append($('<p>').text('Error loading friends list.'));
    }

    // Handle search input
    let searchTimeout;
    searchInput.on('input', function() {
        clearTimeout(searchTimeout);
        const searchTerm = $(this).val().trim();

        searchTimeout = setTimeout(async () => {
            if (searchTerm.length < 2) {
                searchResults.empty();
                return;
            }

            try {
                const usersRef = collection(window.db, "users");
                const searchTermLower = searchTerm.toLowerCase();
                const q = query(
                    usersRef,
                    limit(20)
                );

                const querySnapshot = await getDocs(q);
                searchResults.empty();

                const currentFriends = await getFriendsList();
                const matchingUsers = [];

                querySnapshot.forEach(doc => {
                    const userData = doc.data();
                    if (userData.uid !== auth.currentUser.uid && 
                        userData.username.toLowerCase().includes(searchTermLower)) {
                        matchingUsers.push(userData);
                    }
                });

                if (matchingUsers.length === 0) {
                    searchResults.append($('<p>').text('No users found'));
                    return;
                }

                matchingUsers.forEach(userData => {
                    const isFriend = currentFriends.some(friend => friend.uid === userData.uid);
                    const userElement = $('<div>').addClass('search-result-item');
                    const button = $('<button>')
                        .addClass('add-friend-btn')
                        .html('<span style="font-size:18px;">+</span>')
                        .data({
                            uid: userData.uid,
                            username: userData.username
                        });

                    if (isFriend) {
                        button.prop('disabled', true)
                            .css('opacity', '0.5')
                            .after($('<span>').text(' Already friends').css('color', 'red'));
                    }

                    userElement.append(
                        $('<span>').text(userData.username),
                        button
                    );
                    searchResults.append(userElement);
                });
            } catch (error) {
                console.error('Error searching users:', error);
                searchResults.append($('<p>').text('Error searching users'));
            }
        }, 500);
    });

    // Handle adding/removing friends
    searchResults.on('click', '.add-friend-btn', async function() {
        const uid = $(this).data('uid');
        const username = $(this).data('username');
        await addFriend(uid, username);
        // Add to friends list UI immediately
        const friendElement = $('<div>').addClass('friend-item');
        friendElement.append(
            $('<span>').text(username),
            $('<button>')
                .addClass('remove-friend-btn')
                .text('✕')
                .data('uid', uid)
        );
                // Remove "no friends" message if it exists
        friendsList.find('p').remove();
        friendsList.append(friendElement);
        // Remove from search results
        $(this).closest('.search-result-item').remove();
    });

    friendsList.on('click', '.remove-friend-btn', async function() {
        const uid = $(this).data('uid');
        await removeFriend(uid);
        $(this).closest('.friend-item').remove();
    });

    // Handle close button
    closeBtn.click(() => modal.remove());

    // Close modal when clicking outside
    modal.click(function(e) {
        if (e.target === this) {
            modal.remove();
        }
    });
});

});