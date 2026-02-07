/**
 * Main Application Module
 * Coordinates between modules and handles event listeners
 */

const App = (function () {
    let currentTournament = null;
    let displayedRoundIndex = 0; // 0-based index of displayed round

    /**
     * Initialize the application
     */
    async function init() {
        console.log('Mexicano Tournament App Initializing...');

        // Load settings into UI
        loadSettingsFromConfig();

        // Wire up event listeners
        bindEvents();

        // Check configuration and load tournaments
        if (Config.isConfigured()) {
            await refreshTournamentList();
        } else {
            UI.toggleModal(UI.elements.settingsModal, true);
            UI.showToast('Please configure your GitHub settings first', 'info');
        }

        // Show prepopulate button in dev mode
        if (Config.isDevMode()) {
            UI.elements.prepopulateBtn.classList.remove('hidden');
        }
    }

    /**
     * Bind all DOM event listeners
     */
    function bindEvents() {
        // Tournament List Events
        UI.elements.createTournamentBtn.addEventListener('click', () => {
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('tournamentDate').value = today;
            UI.generatePlayerInputs(parseInt(document.getElementById('playerCount').value));
            UI.showView('createTournamentView');
        });

        UI.elements.tournamentList.addEventListener('click', async (e) => {
            const card = e.target.closest('.tournament-card');
            if (card) {
                const date = card.dataset.date;
                await openTournament(date);
            }
        });

        // Create Tournament Events
        document.getElementById('playerCount').addEventListener('change', (e) => {
            UI.generatePlayerInputs(parseInt(e.target.value));
        });

        UI.elements.createTournamentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleCreateTournament();
        });

        UI.elements.backFromCreateBtn.addEventListener('click', () => UI.showView('tournamentListView'));
        UI.elements.backFromTournamentBtn.addEventListener('click', () => UI.showView('tournamentListView'));

        // Prepopulate Event
        UI.elements.prepopulateBtn.addEventListener('click', () => {
            UI.prepopulateForm();
            UI.showToast('Form prepopulated!', 'info');
        });

        UI.elements.prepopulateBtn2.addEventListener('click', () => {
            UI.showView('createTournamentView');
            UI.prepopulateForm();
            UI.showToast('Form prepopulated!', 'info');
        });

        // Active Tournament Events
        UI.elements.prevRoundBtn.addEventListener('click', () => {
            if (displayedRoundIndex > 0) {
                displayedRoundIndex--;
                updateActiveTournamentView();
            }
        });

        UI.elements.nextRoundBtn.addEventListener('click', () => {
            if (displayedRoundIndex < currentTournament.rounds.length - 1) {
                displayedRoundIndex++;
                updateActiveTournamentView();
            }
        });

        UI.elements.matchesContainer.addEventListener('click', (e) => {
            const card = e.target.closest('.match-card');
            if (card) {
                const matchId = parseInt(card.dataset.matchId);
                const roundNum = parseInt(card.dataset.round);

                // Only allow editing if tournament is editable
                if (Tournament.canEdit(currentTournament)) {
                    openScoreEntry(roundNum, matchId);
                } else {
                    UI.showToast('Tournament is read-only (1 day edit window expired)', 'warning');
                }
            }
        });

        // Score Modal Events
        UI.elements.scoreSlider.addEventListener('input', (e) => UI.updateScoreModal(e.target.value));
        UI.elements.team1ScoreInput.addEventListener('input', (e) => UI.updateScoreModal(e.target.value));

        document.querySelectorAll('.quick-score-btn').forEach(btn => {
            btn.addEventListener('click', (e) => UI.updateScoreModal(e.target.dataset.score));
        });

        UI.elements.confirmScoreBtn.addEventListener('click', handleConfirmScore);
        UI.elements.cancelScoreBtn.addEventListener('click', () => UI.toggleModal(UI.elements.scoreModal, false));
        UI.elements.closeScoreModal.addEventListener('click', () => UI.toggleModal(UI.elements.scoreModal, false));

        // FAB Events
        UI.elements.leaderboardFab.addEventListener('click', () => {
            const rankings = Tournament.rankPlayers(currentTournament);
            UI.renderLeaderboard(rankings);
            UI.toggleModal(UI.elements.leaderboardModal, true);
        });

        UI.elements.nextRoundFab.addEventListener('click', handleNextRound);

        UI.elements.closeLeaderboardModal.addEventListener('click', () => UI.toggleModal(UI.elements.leaderboardModal, false));

        // Settings Events
        UI.elements.settingsBtn.addEventListener('click', () => UI.toggleModal(UI.elements.settingsModal, true));
        UI.elements.closeSettingsModal.addEventListener('click', () => UI.toggleModal(UI.elements.settingsModal, false));

        UI.elements.settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            Config.saveGitHubConfig(
                UI.elements.githubUser.value,
                UI.elements.githubRepo.value,
                UI.elements.githubPat.value
            );
            UI.toggleModal(UI.elements.settingsModal, false);
            UI.showToast('Settings saved successfully', 'success');
            refreshTournamentList();
        });
    }

    /**
     * Load current config values into settings form
     */
    function loadSettingsFromConfig() {
        UI.elements.githubUser.value = Config.getGitHubUser();
        UI.elements.githubRepo.value = Config.getGitHubRepo();
        UI.elements.githubPat.value = Config.getGitHubPAT();
    }

    /**
     * Refresh the list of tournaments from GitHub
     */
    async function refreshTournamentList() {
        try {
            const tournaments = await Storage.listTournaments();
            UI.renderTournamentList(tournaments);
        } catch (error) {
            UI.showToast(`Failed to load tournaments: ${error.message}`, 'error');
        }
    }

    /**
     * Handle creating a new tournament
     */
    async function handleCreateTournament() {
        const name = document.getElementById('tournamentName').value;
        const date = document.getElementById('tournamentDate').value;
        const description = document.getElementById('tournamentDescription').value;
        const playerNames = Array.from(document.querySelectorAll('.player-name-input')).map(input => input.value);

        try {
            // Check if tournament already exists for this date
            const existing = await Storage.tournamentExists(date);
            if (existing) {
                if (!confirm(`A tournament already exists for ${date}. Overwrite it?`)) return;
            }

            // Create tournament object
            const tournament = Tournament.createTournament(name, date, playerNames, description);

            // Randomize player order for fresh pairings
            tournament.players = Pairing.shuffleArray(tournament.players);

            // Generate Round 1
            const round1 = Pairing.generateNextRound(tournament);
            tournament.rounds.push(round1);

            // Save to GitHub
            await Storage.saveTournament(tournament);

            UI.showToast('Tournament started!', 'success');
            await openTournament(date);

        } catch (error) {
            UI.showToast(`Error: ${error.message}`, 'error');
        }
    }

    /**
     * Open an existing tournament
     */
    async function openTournament(date) {
        try {
            currentTournament = await Storage.loadTournament(date);
            if (!currentTournament) throw new Error('Tournament not found');

            displayedRoundIndex = currentTournament.rounds.length - 1;
            updateActiveTournamentView();
            UI.showView('activeTournamentView');
        } catch (error) {
            UI.showToast(`Failed to open tournament: ${error.message}`, 'error');
        }
    }

    /**
     * Update the active tournament view based on state
     */
    function updateActiveTournamentView() {
        if (!currentTournament) return;

        const round = currentTournament.rounds[displayedRoundIndex];
        const canEdit = Tournament.canEdit(currentTournament);
        const rankings = Tournament.rankPlayers(currentTournament);

        // Enable/Disable round navigation buttons
        UI.elements.prevRoundBtn.disabled = displayedRoundIndex === 0;
        UI.elements.nextRoundBtn.disabled = displayedRoundIndex === currentTournament.rounds.length - 1;

        UI.renderMatches(round, canEdit, rankings);
    }

    /**
     * Open score entry modal for a specific match
     */
    let activeMatchId = null;
    let activeRoundNum = null;

    function openScoreEntry(roundNum, matchId) {
        activeMatchId = matchId;
        activeRoundNum = roundNum;

        const round = currentTournament.rounds.find(r => r.roundNumber === roundNum);
        const match = round.matches.find(m => m.id === matchId);

        UI.showScoreModal(match);
    }

    /**
     * Handle score confirmation
     */
    async function handleConfirmScore() {
        const team1Score = parseInt(UI.elements.team1ScoreInput.value);
        const team2Score = parseInt(UI.elements.team2ScoreInput.value);

        try {
            // Update tournament state
            Tournament.updateMatchScore(
                currentTournament,
                activeRoundNum,
                activeMatchId,
                team1Score,
                team2Score
            );

            // Save to GitHub
            await Storage.saveTournament(currentTournament);

            UI.toggleModal(UI.elements.scoreModal, false);
            UI.showToast('Score saved', 'success');

            // If we edited a previous round, displayedRoundIndex might be invalidated
            if (activeRoundNum < currentTournament.rounds.length) {
                // Stay on current round if still exists, or move to end
                displayedRoundIndex = Math.min(displayedRoundIndex, currentTournament.rounds.length - 1);
            }

            updateActiveTournamentView();

        } catch (error) {
            UI.showToast(`Error saving score: ${error.message}`, 'error');
        }
    }

    /**
     * Handle generating next round
     */
    async function handleNextRound() {
        try {
            // Check if current round (last one) is complete
            const lastRound = currentTournament.rounds[currentTournament.rounds.length - 1];
            if (!Tournament.isRoundComplete(lastRound)) {
                UI.showToast('Please complete all matches in the current round', 'warning');
                return;
            }

            // Confirm generation
            if (!confirm('Start the next round? Pairings will be based on current rankings.')) return;

            // Generate next round
            const nextRound = Pairing.generateNextRound(currentTournament);
            currentTournament.rounds.push(nextRound);

            // Save to GitHub
            await Storage.saveTournament(currentTournament);

            UI.showToast(`Round ${nextRound.roundNumber} generated!`, 'success');

            // Move view to next round
            displayedRoundIndex = currentTournament.rounds.length - 1;
            updateActiveTournamentView();

        } catch (error) {
            UI.showToast(`Error: ${error.message}`, 'error');
        }
    }

    // Public API
    return {
        init
    };
})();

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
