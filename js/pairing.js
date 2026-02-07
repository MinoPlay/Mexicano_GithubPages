/**
 * Pairing module for Mexicano Tournament
 * Handles match pairing algorithms for initial and Mexicano-style rounds
 */

const Pairing = (function () {
    /**
     * Create initial pairings for Round 1 (entry order)
     * Pattern: Players 1+4 vs 2+3, 5+8 vs 6+7, etc.
     * @param {Array<string>} players - Array of player names in entry order
     * @returns {Array<Object>} Array of match objects
     */
    function createInitialPairings(players) {
        const matches = [];
        let matchId = 1;

        // Process players in groups of 4
        for (let i = 0; i < players.length; i += 4) {
            const group = players.slice(i, i + 4);

            // Pairing: Player 1 + Player 4 vs Player 2 + Player 3
            matches.push({
                id: matchId++,
                team1Player1: group[0],
                team1Player2: group[3],
                team2Player1: group[1],
                team2Player2: group[2],
                team1Score: null,
                team2Score: null
            });
        }

        return matches;
    }

    /**
     * Create Mexicano-style pairings based on rankings
     * Pattern: #1+#4 vs #2+#3 within each group of 4 ranked players
     * @param {Array<Object>} rankedPlayers - Array of player stats sorted by rank
     * @returns {Array<Object>} Array of match objects
     */
    function createMexicanoPairings(rankedPlayers) {
        const matches = [];
        let matchId = 1;

        // Process players in groups of 4 based on ranking
        for (let i = 0; i < rankedPlayers.length; i += 4) {
            const group = rankedPlayers.slice(i, i + 4);

            // Pairing: #1 (best) + #4 (weakest) vs #2 + #3
            // This creates balanced matches within each group
            matches.push({
                id: matchId++,
                team1Player1: group[0].name,  // #1 in group
                team1Player2: group[3].name,  // #4 in group
                team2Player1: group[1].name,  // #2 in group
                team2Player2: group[2].name,  // #3 in group
                team1Score: null,
                team2Score: null
            });
        }

        return matches;
    }

    /**
     * Generate the next round for a tournament
     * Uses initial pairing for Round 1, Mexicano pairing for subsequent rounds
     * @param {Object} tournament - Tournament object
     * @returns {Object|null} New round object or null if cannot generate
     */
    function generateNextRound(tournament) {
        // Check if we can start a new round
        if (!Tournament.canStartNextRound(tournament)) {
            return null;
        }

        const nextRoundNumber = Tournament.getCurrentRoundNumber(tournament) + 1;
        let matches;

        if (nextRoundNumber === 1) {
            // Round 1: Use entry order pairing
            matches = createInitialPairings(tournament.players);
        } else {
            // Subsequent rounds: Use Mexicano pairing based on rankings
            const rankedPlayers = Tournament.rankPlayers(tournament);
            matches = createMexicanoPairings(rankedPlayers);
        }

        // Update match IDs to be unique across the tournament
        const allPreviousMatches = tournament.rounds.flatMap(r => r.matches);
        const maxId = allPreviousMatches.reduce((max, m) => Math.max(max, m.id), 0);
        matches.forEach((match, index) => {
            match.id = maxId + index + 1;
        });

        return {
            roundNumber: nextRoundNumber,
            matches: matches
        };
    }

    /**
     * Add next round to tournament
     * @param {Object} tournament - Tournament object
     * @returns {Object} Updated tournament with new round
     */
    function addNextRound(tournament) {
        const newRound = generateNextRound(tournament);

        if (!newRound) {
            throw new Error('Cannot start next round: current round is not complete');
        }

        tournament.rounds.push(newRound);
        tournament.updatedAt = new Date().toISOString();

        return tournament;
    }

    /**
     * Shuffle an array (Fisher-Yates algorithm)
     * Can be used for randomizing initial player order
     * @param {Array} array - Array to shuffle
     * @returns {Array} Shuffled array (copy)
     */
    function shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Get match display string
     * @param {Object} match - Match object
     * @returns {string} Formatted match string
     */
    function getMatchDisplayString(match) {
        const team1 = `${match.team1Player1} & ${match.team1Player2}`;
        const team2 = `${match.team2Player1} & ${match.team2Player2}`;

        if (match.team1Score !== null && match.team2Score !== null) {
            return `${team1} [${match.team1Score}] vs [${match.team2Score}] ${team2}`;
        }
        return `${team1} vs ${team2}`;
    }

    // Public API
    return {
        createInitialPairings,
        createMexicanoPairings,
        generateNextRound,
        addNextRound,
        shuffleArray,
        getMatchDisplayString
    };
})();
