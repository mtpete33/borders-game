import { doc, getDoc, setDoc, getDocs, collection, addDoc, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

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
    $('#playBtn').hide();
    // Filter button handlers
    $('.filter-btn').click(function() {
        $('.filter-btn').removeClass('active');
        $(this).addClass('active');
    });

    $('#todayFilter').click(function() {
        $('#leaderboardDate').show();
        getLeaderboard(new Date());
    });

    $('#bestTimeFilter').click(function() {
        getBestTimes();
    });

    $('#mostWinsFilter').click(function() {
        getMostWins();
    });

    // Navigation button handlers
    $('#prevDay').click(function() {
        const prevDay = new Date(currentLeaderboardDate);
        prevDay.setDate(prevDay.getDate() - 1);
        getLeaderboard(prevDay);
    });

    $('#nextDay').click(function() {
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
            const q = query(statsRef, where("uid", "==", user.uid), where("puzzleId", "==", currentPuzzleId));

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
                    if (data.hasGivenUp) {
                        await fetchTodaysPuzzle();
                    }
                    return; // Exit early to prevent Play button from showing
                }
            }
            // Only show Play button if puzzle not completed/given up
            $("#playBtn").show();
        }
    }


    

    // Function to check and register new Google users
    async function registerGoogleUser(user) {
        try {
            const userRef = doc(window.db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            // If the user doesn't have a document, create one
            if (!userSnap.exists()) {
                console.log('New Google user detected. Creating Firestore entry.');
                await setDoc(userRef, {
                    uid: user.uid,
                    username: user.displayName || 'Unknown User', // Use displayName if available
                    email: user.email
                });
            }
        } catch (error) {
            console.error('Error registering Google user:', error);
        }
    }

    // Google Login Functionality
    $('#googleLoginBtn').click(function() {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider)
            .then(async (result) => {
                const user = result.user;
                console.log('User logged in with Google:', user);
                // Check and register the Google user if they don't exist in Firestore
                await registerGoogleUser(user);
                // Fetch and display the username
                // const username = await getUserDetails(user.uid) || user.displayName || 'Unknown User';
                const userDetails = await getUserDetails(user.uid);
                const username = userDetails.username || user.displayName || 'Unknown User';
                displayLoggedInMessage(username);
                toastr.success("Logged in successfully!");
                $("#loginForm").hide();
                $("#signUpForm").hide();
                $("#signUpBtn").hide();
                $("#googleLoginBtn").hide();
                $("#logInBtn").hide();
                
                $("#playBtn").show();
                
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
    $("#confirmGiveUpBtn").click(function () {
        
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
      });
      // Show the Log-In Form
      $('#logInBtn').click(function() {
        $('#loginForm').show();   // Show the login form
        $('#signUpForm').hide(); // Hide the sign-up form if it's visible
        $("#loginEmail").focus();
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
        // Get all input fields
        let cells = $(".cell");

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
                $("#signUpCTA").css('display', 'block');
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
      "timeOut": "5000",
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
    $('#signUpSubmitBtn').click(function() {
      const username = $('#username').val();
      const email = $('#email').val();
        if (!isValidEmail(email)) {
            toastr.error("Please enter a valid email address.");
            return;
        }
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
                // alert("Account created successfully! Please login.");
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
                    $("#signupSuccess").hide();
                    $("#loginForm").hide();
                    $("#logInBtn").hide();
                    $("#signUpForm").hide();
                    $("#signUpBtn").hide();
                    $("#googleLoginBtn").hide();
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


    async function showSolvedPuzzle() {
        $("#landingPage").hide();
        $("#submitBtn").hide();
        $("#giveUpBtn").hide();
        $("#example").hide();
        $("#viewSolvedPuzzleBtn").hide();

        
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
    const q = query(
        statsRef,
        orderBy("time", "asc"),
        limit(15)
    );

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
    try {
        // Get all entries
        const querySnapshot = await getDocs(statsRef);
        const winCounts = {};

        // Group first place wins by user
        querySnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (!data.hasGivenUp) {
                const puzzleId = data.puzzleId;
                const date = new Date(data.date);
                date.setHours(0, 0, 0, 0);
                
                // Create a unique key for each puzzle/date combination
                const key = `${puzzleId}_${date.getTime()}`;
                
                if (!winCounts[key]) {
                    winCounts[key] = {
                        time: data.time,
                        username: data.username
                    };
                } else if (data.time < winCounts[key].time) {
                    winCounts[key] = {
                        time: data.time,
                        username: data.username
                    };
                }
            }
        });

        // Count wins per user
        const userWins = {};
        Object.values(winCounts).forEach(win => {
            userWins[win.username] = (userWins[win.username] || 0) + 1;
        });

        // Convert to array and sort
        const sortedWins = Object.entries(userWins)
            .map(([username, wins]) => ({ username, wins }))
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
function displayWinnersList(winnersList) {
    const leaderboardTable = document.getElementById('leaderboardTable');
    const thead = leaderboardTable.getElementsByTagName('thead')[0];
    const tbody = leaderboardTable.getElementsByTagName('tbody')[0];
    
    // Filter out entries with undefined username
    winnersList = winnersList.filter(winner => 
        winner.username && 
        winner.username !== 'undefined' && 
        winner.username.toLowerCase() !== 'undefined'
    );
    
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
        usernameCell.textContent = winner.username;
        winsCell.textContent = winner.wins;
    });
}

async function getLeaderboard(date = new Date()) {
        const statsRef = collection(window.db, "leaderboard");
        currentLeaderboardDate = date;
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

        // Update the displayed date
        const formattedDisplayDate = startOfDay.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
        });
        $('#leaderboardDate').text(formattedDisplayDate);

        const q = query(
            statsRef, 
            where("date", ">=", startOfDay.toISOString()), 
            where("date", "<", endOfDay.toISOString()), 
            orderBy("time", "asc"), 
            limit(10)
        );

        try {
            const querySnapshot = await getDocs(q);
            const leaderboardData = [];

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


    function displayLeaderboard(leaderboardData) {
        const leaderboardDiv = document.getElementById('leaderboard');
        leaderboardDiv.style.display = 'block';
        updateNavigationButtons();
        
        const thead = document.getElementById('leaderboardTable').getElementsByTagName('thead')[0];
        const tbody = document.getElementById('leaderboardTable').getElementsByTagName('tbody')[0];
        
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
                usernameCell.textContent = entry.username;
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

    

    
});
