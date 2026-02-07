/**
 * Storage module for Mexicano Tournament
 * Handles GitHub API integration for tournament data persistence
 */

const Storage = (function () {
    /**
     * Get authorization headers for GitHub API
     */
    function getAuthHeaders() {
        const pat = Config.getGitHubPAT();
        return {
            'Authorization': `token ${pat}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };
    }

    /**
     * List all tournament files in the repository
     * @returns {Promise<Array>} Array of tournament metadata objects
     */
    async function listTournaments() {
        if (!Config.isConfigured()) {
            throw new Error('GitHub configuration is not complete');
        }

        const url = Config.getContentsUrl(Config.getTournamentsPath());

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (response.status === 404) {
                // Tournaments folder doesn't exist yet
                return [];
            }

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }

            const files = await response.json();

            // Filter for JSON files and extract tournament dates
            return files
                .filter(file => file.name.endsWith('.json'))
                .map(file => ({
                    date: file.name.replace('.json', ''),
                    name: file.name,
                    path: file.path,
                    sha: file.sha
                }))
                .sort((a, b) => b.date.localeCompare(a.date)); // Most recent first
        } catch (error) {
            console.error('Error listing tournaments:', error);
            throw error;
        }
    }

    /**
     * Load a specific tournament by date
     * @param {string} date - Tournament date in YYYY-MM-DD format
     * @returns {Promise<Object>} Tournament data object
     */
    async function loadTournament(date) {
        if (!Config.isConfigured()) {
            throw new Error('GitHub configuration is not complete');
        }

        const path = Config.getTournamentFilePath(date);
        const url = Config.getContentsUrl(path);

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (response.status === 404) {
                return null;
            }

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }

            const fileData = await response.json();

            // GitHub returns content as base64 encoded
            const content = atob(fileData.content);
            const tournament = JSON.parse(content);

            // Store SHA for updates
            tournament._sha = fileData.sha;

            return tournament;
        } catch (error) {
            console.error('Error loading tournament:', error);
            throw error;
        }
    }

    /**
     * Save tournament data to repository
     * @param {Object} tournament - Tournament data object
     * @returns {Promise<Object>} Updated tournament with new SHA
     */
    async function saveTournament(tournament) {
        if (!Config.isConfigured()) {
            throw new Error('GitHub configuration is not complete');
        }

        const date = tournament.tournamentDate;
        const path = Config.getTournamentFilePath(date);
        const url = Config.getContentsUrl(path);

        // Update timestamp
        tournament.updatedAt = new Date().toISOString();
        if (!tournament.createdAt) {
            tournament.createdAt = tournament.updatedAt;
        }

        // Remove internal properties before saving
        const dataToSave = { ...tournament };
        delete dataToSave._sha;

        const content = btoa(unescape(encodeURIComponent(JSON.stringify(dataToSave, null, 2))));

        const body = {
            message: `Update tournament ${date}`,
            content: content,
            branch: Config.getGitHubBranch()
        };

        // Include SHA if updating existing file
        if (tournament._sha) {
            body.sha = tournament._sha;
        }

        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`GitHub API error: ${response.status} - ${errorData.message}`);
            }

            const result = await response.json();

            // Update SHA for future updates
            tournament._sha = result.content.sha;

            return tournament;
        } catch (error) {
            console.error('Error saving tournament:', error);
            throw error;
        }
    }

    /**
     * Delete a tournament file from repository
     * @param {string} date - Tournament date in YYYY-MM-DD format
     * @param {string} sha - SHA of the file to delete
     * @returns {Promise<boolean>} True if deletion was successful
     */
    async function deleteTournament(date, sha) {
        if (!Config.isConfigured()) {
            throw new Error('GitHub configuration is not complete');
        }

        const path = Config.getTournamentFilePath(date);
        const url = Config.getContentsUrl(path);

        const body = {
            message: `Delete tournament ${date}`,
            sha: sha,
            branch: Config.getGitHubBranch()
        };

        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: getAuthHeaders(),
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`GitHub API error: ${response.status} - ${errorData.message}`);
            }

            return true;
        } catch (error) {
            console.error('Error deleting tournament:', error);
            throw error;
        }
    }

    /**
     * Check if a tournament exists for a given date
     * @param {string} date - Tournament date in YYYY-MM-DD format
     * @returns {Promise<boolean>} True if tournament exists
     */
    async function tournamentExists(date) {
        const tournament = await loadTournament(date);
        return tournament !== null;
    }

    // Public API
    return {
        listTournaments,
        loadTournament,
        saveTournament,
        deleteTournament,
        tournamentExists
    };
})();
