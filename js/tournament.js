/**
 * Tournament module for Mexicano Tournament
 * Handles tournament logic, statistics, and rankings
 */

const Tournament = (function () {
    /**
     * Validate player count (must be 8, 12, or 16)
     * @param {number} count - Number of players
     * @returns {boolean} True if valid
     */
    function isValidPlayerCount(count) {
        return [8, 12, 16].includes(count);
    }

    /**
     * Validate that all player names are unique and non-empty
     * @param {Array<string>} players - Array of player names
     * @returns {Object} Validation result with isValid and error message
     */
    function validatePlayers(players) {
        // Check for empty names
        const emptyNames = players.filter(p => !p || p.trim() === '');
        if (emptyNames.length > 0) {
            return { isValid: false, error: 'All player names must be non-empty' };
        }

        // Check for unique names
        const uniqueNames = new Set(players.map(p => p.trim().toLowerCase()));
        if (uniqueNames.size !== players.length) {
            return { isValid: false, error: 'All player names must be unique' };
        }

        // Check player count
        if (!isValidPlayerCount(players.length)) {
            return { isValid: false, error: 'Must have exactly 8, 12, or 16 players' };
        }

        return { isValid: true };
    }

    /**
     * Validate match score (must total 25)
     * @param {number} team1Score - Team 1 score
     * @param {number} team2Score - Team 2 score
     * @returns {boolean} True if valid
     */
    function isValidScore(team1Score, team2Score) {
        return team1Score >= 0 &&
            team2Score >= 0 &&
            team1Score + team2Score === 25;
    }

    /**
     * Create a new tournament
     * @param {string} name - Tournament name
     * @param {string} date - Tournament date (YYYY-MM-DD)
     * @param {Array<string>} players - Array of player names
     * @param {string} description - Optional description
     * @returns {Object} New tournament object
     */
    function createTournament(name, date, players, description = '') {
        const validation = validatePlayers(players);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        return {
            name: name,
            description: description,
            tournamentDate: date,
            players: players.map(p => p.trim()),
            rounds: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    /**
     * Calculate statistics for all players in a tournament
     * @param {Object} tournament - Tournament object
     * @returns {Object} Map of player name to stats object
     */
    function calculateStats(tournament) {
        const stats = {};

        // Initialize stats for all players
        tournament.players.forEach(player => {
            stats[player] = {
                name: player,
                totalPoints: 0,
                gamesPlayed: 0,
                wins: 0,
                losses: 0,
                pointsPerGame: 0,
                winPercentage: 0
            };
        });

        // Process all completed matches
        tournament.rounds.forEach(round => {
            round.matches.forEach(match => {
                if (!isMatchComplete(match)) return;

                const team1Players = [match.team1Player1, match.team1Player2];
                const team2Players = [match.team2Player1, match.team2Player2];
                const team1Won = match.team1Score > match.team2Score;

                // Update Team 1 players
                team1Players.forEach(player => {
                    if (stats[player]) {
                        stats[player].totalPoints += match.team1Score;
                        stats[player].gamesPlayed += 1;
                        if (team1Won) {
                            stats[player].wins += 1;
                        } else {
                            stats[player].losses += 1;
                        }
                    }
                });

                // Update Team 2 players
                team2Players.forEach(player => {
                    if (stats[player]) {
                        stats[player].totalPoints += match.team2Score;
                        stats[player].gamesPlayed += 1;
                        if (!team1Won) {
                            stats[player].wins += 1;
                        } else {
                            stats[player].losses += 1;
                        }
                    }
                });
            });
        });

        // Calculate derived stats
        Object.values(stats).forEach(playerStats => {
            if (playerStats.gamesPlayed > 0) {
                playerStats.pointsPerGame = playerStats.totalPoints / playerStats.gamesPlayed;
                playerStats.winPercentage = (playerStats.wins / playerStats.gamesPlayed) * 100;
            }
        });

        return stats;
    }

    /**
     * Rank players based on tournament standings
     * Priority: TotalPoints → Wins → PointsPerGame → Name
     * @param {Object} tournament - Tournament object
     * @returns {Array} Sorted array of player stats with rank
     */
    function rankPlayers(tournament) {
        const stats = calculateStats(tournament);
        const players = Object.values(stats);

        // Sort by ranking criteria
        players.sort((a, b) => {
            // 1. Total Points (descending)
            if (b.totalPoints !== a.totalPoints) {
                return b.totalPoints - a.totalPoints;
            }
            // 2. Wins (descending)
            if (b.wins !== a.wins) {
                return b.wins - a.wins;
            }
            // 3. Points Per Game (descending)
            if (b.pointsPerGame !== a.pointsPerGame) {
                return b.pointsPerGame - a.pointsPerGame;
            }
            // 4. Name (alphabetical)
            return a.name.localeCompare(b.name);
        });

        // Assign ranks (handle ties)
        let currentRank = 1;
        players.forEach((player, index) => {
            if (index === 0) {
                player.rank = 1;
            } else {
                const prev = players[index - 1];
                // Check if tied with previous player (same points AND wins)
                if (player.totalPoints === prev.totalPoints && player.wins === prev.wins) {
                    player.rank = prev.rank;
                } else {
                    player.rank = index + 1;
                }
            }
        });

        return players;
    }

    /**
     * Check if a match is complete (has valid scores)
     * @param {Object} match - Match object
     * @returns {boolean} True if match is complete
     */
    function isMatchComplete(match) {
        return match.team1Score !== null &&
            match.team1Score !== undefined &&
            match.team2Score !== null &&
            match.team2Score !== undefined &&
            isValidScore(match.team1Score, match.team2Score);
    }

    /**
     * Check if a round is complete (all matches have scores)
     * @param {Object} round - Round object
     * @returns {boolean} True if all matches are complete
     */
    function isRoundComplete(round) {
        return round.matches.every(match => isMatchComplete(match));
    }

    /**
     * Get the current round number
     * @param {Object} tournament - Tournament object
     * @returns {number} Current round number (1-based) or 0 if no rounds
     */
    function getCurrentRoundNumber(tournament) {
        if (tournament.rounds.length === 0) return 0;
        return tournament.rounds.length;
    }

    /**
     * Get the current round object
     * @param {Object} tournament - Tournament object
     * @returns {Object|null} Current round or null
     */
    function getCurrentRound(tournament) {
        if (tournament.rounds.length === 0) return null;
        return tournament.rounds[tournament.rounds.length - 1];
    }

    /**
     * Check if next round can be started
     * @param {Object} tournament - Tournament object
     * @returns {boolean} True if current round is complete
     */
    function canStartNextRound(tournament) {
        const currentRound = getCurrentRound(tournament);
        if (!currentRound) return true; // Can start round 1
        return isRoundComplete(currentRound);
    }

    /**
     * Update a match score
     * @param {Object} tournament - Tournament object
     * @param {number} roundNumber - Round number (1-based)
     * @param {number} matchId - Match ID
     * @param {number} team1Score - New team 1 score
     * @param {number} team2Score - New team 2 score
     * @returns {Object} Updated tournament
     */
    function updateMatchScore(tournament, roundNumber, matchId, team1Score, team2Score) {
        if (!isValidScore(team1Score, team2Score)) {
            throw new Error('Invalid score: team scores must equal 25');
        }

        const roundIndex = roundNumber - 1;
        if (roundIndex < 0 || roundIndex >= tournament.rounds.length) {
            throw new Error('Invalid round number');
        }

        const round = tournament.rounds[roundIndex];
        const match = round.matches.find(m => m.id === matchId);

        if (!match) {
            throw new Error('Match not found');
        }

        match.team1Score = team1Score;
        match.team2Score = team2Score;

        // If editing a previous round, need to regenerate subsequent rounds
        const currentRoundNumber = getCurrentRoundNumber(tournament);
        if (roundNumber < currentRoundNumber) {
            // Remove all rounds after the edited one
            tournament.rounds = tournament.rounds.slice(0, roundNumber);

            // Regenerate next round if the edited round is now complete
            if (isRoundComplete(tournament.rounds[roundIndex])) {
                const nextRound = Pairing.generateNextRound(tournament);
                if (nextRound) {
                    tournament.rounds.push(nextRound);
                }
            }
        }

        tournament.updatedAt = new Date().toISOString();
        return tournament;
    }

    /**
     * Check if tournament is editable (within 1 day of tournament date)
     * @param {Object} tournament - Tournament object
     * @returns {boolean} True if tournament can be edited
     */
    function canEdit(tournament) {
        const tournamentDate = new Date(tournament.tournamentDate);
        const now = new Date();

        // Set both to start of day for comparison
        tournamentDate.setHours(0, 0, 0, 0);
        const editDeadline = new Date(tournamentDate);
        editDeadline.setDate(editDeadline.getDate() + 2); // Tournament day + 1 day

        return now < editDeadline;
    }

    /**
     * Get number of courts based on player count
     * @param {number} playerCount - Number of players
     * @returns {number} Number of courts
     */
    function getCourtCount(playerCount) {
        return playerCount / 4;
    }

    // Public API
    return {
        isValidPlayerCount,
        validatePlayers,
        isValidScore,
        createTournament,
        calculateStats,
        rankPlayers,
        isMatchComplete,
        isRoundComplete,
        getCurrentRoundNumber,
        getCurrentRound,
        canStartNextRound,
        updateMatchScore,
        canEdit,
        getCourtCount
    };
})();
