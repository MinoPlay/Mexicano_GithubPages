/**
 * UI module for Mexicano Tournament
 * Handles DOM manipulation, rendering, and UI interactions
 */

const UI = (function () {
    // DOM Elements
    const elements = {
        app: document.getElementById('app'),
        views: document.querySelectorAll('.view'),
        tournamentListView: document.getElementById('tournamentListView'),
        createTournamentView: document.getElementById('createTournamentView'),
        activeTournamentView: document.getElementById('activeTournamentView'),

        tournamentList: document.getElementById('tournamentList'),
        playerInputs: document.getElementById('playerInputs'),
        matchesContainer: document.getElementById('matchesContainer'),

        createTournamentBtn: document.getElementById('createTournamentBtn'),
        createTournamentForm: document.getElementById('createTournamentForm'),
        backFromCreateBtn: document.getElementById('backFromCreateBtn'),
        backFromTournamentBtn: document.getElementById('backFromTournamentBtn'),
        settingsBtn: document.getElementById('settingsBtn'),
        prepopulateBtn: document.getElementById('prepopulateBtn'),
        prepopulateBtn2: document.getElementById('prepopulateBtn2'),

        roundIndicator: document.getElementById('roundIndicator'),
        matchesCompleted: document.getElementById('matchesCompleted'),
        prevRoundBtn: document.getElementById('prevRoundBtn'),
        nextRoundBtn: document.getElementById('nextRoundBtn'),

        fabContainer: document.getElementById('fabContainer'),
        leaderboardFab: document.getElementById('leaderboardFab'),
        nextRoundFab: document.getElementById('nextRoundFab'),

        scoreModal: document.getElementById('scoreModal'),
        scoreModalTitle: document.getElementById('scoreModalTitle'),
        team1Names: document.getElementById('team1Names'),
        team2Names: document.getElementById('team2Names'),
        team1ScoreInput: document.getElementById('team1ScoreInput'),
        team2ScoreInput: document.getElementById('team2ScoreInput'),
        scoreSlider: document.getElementById('scoreSlider'),
        confirmScoreBtn: document.getElementById('confirmScoreBtn'),
        cancelScoreBtn: document.getElementById('cancelScoreBtn'),
        closeScoreModal: document.getElementById('closeScoreModal'),

        leaderboardModal: document.getElementById('leaderboardModal'),
        leaderboardBody: document.getElementById('leaderboardBody'),
        closeLeaderboardModal: document.getElementById('closeLeaderboardModal'),

        settingsModal: document.getElementById('settingsModal'),
        settingsForm: document.getElementById('settingsForm'),
        closeSettingsModal: document.getElementById('closeSettingsModal'),
        githubUser: document.getElementById('githubUser'),
        githubRepo: document.getElementById('githubRepo'),
        githubPat: document.getElementById('githubPat'),

        toastContainer: document.getElementById('toastContainer')
    };

    /**
     * Switch to a specific view
     */
    function showView(viewId) {
        elements.views.forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(viewId).classList.add('active');

        // Handle FAB visibility
        if (viewId === 'activeTournamentView') {
            elements.fabContainer.classList.remove('hidden');
        } else {
            elements.fabContainer.classList.add('hidden');
        }
    }

    /**
     * Show/Hide a modal
     */
    function toggleModal(modal, show) {
        if (show) {
            modal.classList.remove('hidden');
        } else {
            modal.classList.add('hidden');
        }
    }

    /**
     * Show a toast notification
     */
    function showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Render the tournament list
     */
    function renderTournamentList(tournaments) {
        if (!tournaments || tournaments.length === 0) {
            elements.tournamentList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🏆</span>
                    <p>No tournaments yet</p>
                    <p class="empty-hint">Create your first tournament to get started</p>
                </div>`;
            return;
        }

        elements.tournamentList.innerHTML = tournaments.map(t => `
            <div class="tournament-card" data-date="${t.date}">
                <h3>Mexicano ${t.date}</h3>
                <div class="date">${new Date(t.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
        `).join('');
    }

    /**
     * Generate player input fields based on count
     */
    function generatePlayerInputs(count) {
        elements.playerInputs.innerHTML = '';
        for (let i = 1; i <= count; i++) {
            const div = document.createElement('div');
            div.className = 'form-group';
            div.innerHTML = `<input type="text" class="player-name-input" placeholder="Player ${i}" required>`;
            elements.playerInputs.appendChild(div);
        }
    }

    /**
     * Render match cards for a specific round
     */
    function renderMatches(round, canEdit, rankedPlayers = []) {
        if (!round) return;

        // Create a map for quick rank lookup
        const rankMap = {};
        rankedPlayers.forEach(p => {
            rankMap[p.name] = p.rank;
        });

        // Ensure matches are ordered by the ranks of players in them
        // (Top players/Court 1 at the top)
        const sortedMatches = [...round.matches].sort((a, b) => {
            const getMinRank = (match) => {
                const players = [match.team1Player1, match.team1Player2, match.team2Player1, match.team2Player2];
                return Math.min(...players.map(p => rankMap[p] || 999));
            };
            return getMinRank(a) - getMinRank(b);
        });

        elements.roundIndicator.textContent = `Round ${round.roundNumber}`;
        const completedCount = round.matches.filter(m => Tournament.isMatchComplete(m)).length;
        elements.matchesCompleted.textContent = `${completedCount}/${round.matches.length} matches completed`;

        elements.matchesContainer.innerHTML = sortedMatches.map((m, index) => {
            const isComplete = Tournament.isMatchComplete(m);
            const winner = isComplete ? (m.team1Score > m.team2Score ? 1 : 2) : 0;

            const formatPlayer = (name) => {
                const rank = rankMap[name];
                const rankDisplay = rank ? `<span class="player-rank">#${rank}</span>` : '';
                const winnerClass = winner === (name === m.team1Player1 || name === m.team1Player2 ? 1 : 2) ? 'winner' : '';
                return `<div class="player-name ${winnerClass}">${name} ${rankDisplay}</div>`;
            };

            return `
                <div class="match-card ${isComplete ? 'completed' : ''}" data-match-id="${m.id}" data-round="${round.roundNumber}">
                    <div class="match-header">
                        <span>Court #${index + 1}</span>
                        ${isComplete && !canEdit ? '<span>Final</span>' : ''}
                    </div>
                    <div class="match-body">
                        <div class="team team-1">
                            ${formatPlayer(m.team1Player1)}
                            ${formatPlayer(m.team1Player2)}
                        </div>
                        <div class="match-score-display">
                            ${isComplete ?
                    `<span>${m.team1Score}</span> - <span>${m.team2Score}</span>` :
                    '<span class="score-pending">Tap to Score</span>'}
                        </div>
                        <div class="team team-2">
                            ${formatPlayer(m.team2Player1)}
                            ${formatPlayer(m.team2Player2)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Show/Hide Next Round FAB
        if (Tournament.isRoundComplete(round)) {
            elements.nextRoundFab.classList.remove('hidden');
        } else {
            elements.nextRoundFab.classList.add('hidden');
        }
    }

    /**
     * Render the leaderboard
     */
    function renderLeaderboard(rankedPlayers) {
        elements.leaderboardBody.innerHTML = rankedPlayers.map(p => `
            <tr>
                <td class="rank-cell">${p.rank}</td>
                <td class="name-cell">${p.name}</td>
                <td class="pts-cell">${p.totalPoints}</td>
                <td>${p.wins}</td>
                <td>${p.losses}</td>
                <td>${p.pointsPerGame.toFixed(1)}</td>
            </tr>
        `).join('');
    }

    /**
     * Show the score entry modal
     */
    function showScoreModal(match) {
        elements.scoreModalTitle.textContent = `Match Score`;
        elements.team1Names.textContent = `${match.team1Player1} & ${match.team1Player2}`;
        elements.team2Names.textContent = `${match.team2Player1} & ${match.team2Player2}`;

        const t1Score = match.team1Score !== null ? match.team1Score : 13;
        elements.team1ScoreInput.value = t1Score;
        elements.team2ScoreInput.value = 25 - t1Score;
        elements.scoreSlider.value = t1Score;

        toggleModal(elements.scoreModal, true);
    }

    /**
     * Update score modal based on slider/input
     */
    function updateScoreModal(value) {
        value = parseInt(value);
        if (isNaN(value)) value = 0;
        if (value < 0) value = 0;
        if (value > 25) value = 25;

        elements.team1ScoreInput.value = value;
        elements.team2ScoreInput.value = 25 - value;
        elements.scoreSlider.value = value;
    }

    /**
     * Prepopulate the tournament form with test data
     */
    function prepopulateForm() {
        const testNames = [
            'Alice', 'Bob', 'Charlie', 'David',
            'Eve', 'Frank', 'Grace', 'Heidi',
            'Ivan', 'Judy', 'Kevin', 'Lars',
            'Mallory', 'Niaj', 'Oscar', 'Peggy'
        ];

        const nameInput = document.getElementById('tournamentName');
        const dateInput = document.getElementById('tournamentDate');
        const playerCountSelect = document.getElementById('playerCount');

        if (nameInput) nameInput.value = 'Test Tournament ' + new Date().getHours() + ':' + new Date().getMinutes();
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

        // Default to 8 players for quick testing
        if (playerCountSelect) {
            playerCountSelect.value = '8';
            generatePlayerInputs(8);
        }

        const nameInputs = document.querySelectorAll('.player-name-input');
        nameInputs.forEach((input, index) => {
            input.value = testNames[index] || `Player ${index + 1}`;
        });
    }

    // Public API
    return {
        elements,
        showView,
        toggleModal,
        showToast,
        renderTournamentList,
        generatePlayerInputs,
        renderMatches,
        renderLeaderboard,
        showScoreModal,
        updateScoreModal,
        prepopulateForm
    };
})();
