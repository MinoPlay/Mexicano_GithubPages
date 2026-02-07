/**
 * Configuration module for Mexicano Tournament
 * Handles GitHub API settings and app configuration
 */

const Config = (function () {
    // LocalStorage keys
    const STORAGE_KEYS = {
        GITHUB_USER: 'mexicano_github_user',
        GITHUB_REPO: 'mexicano_github_repo',
        GITHUB_PAT: 'mexicano_github_pat',
        GITHUB_BRANCH: 'mexicano_github_branch'
    };

    // Default settings
    const DEFAULTS = {
        BRANCH: 'main',
        TOURNAMENTS_PATH: 'tournaments'
    };

    // GitHub API base URL
    const GITHUB_API_BASE = 'https://api.github.com';

    /**
     * Check if running in development mode (localhost)
     */
    function isDevMode() {
        return window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1';
    }

    /**
     * Get stored GitHub username
     */
    function getGitHubUser() {
        return localStorage.getItem(STORAGE_KEYS.GITHUB_USER) || '';
    }

    /**
     * Set GitHub username
     */
    function setGitHubUser(user) {
        localStorage.setItem(STORAGE_KEYS.GITHUB_USER, user);
    }

    /**
     * Get stored repository name
     */
    function getGitHubRepo() {
        return localStorage.getItem(STORAGE_KEYS.GITHUB_REPO) || '';
    }

    /**
     * Set repository name
     */
    function setGitHubRepo(repo) {
        localStorage.setItem(STORAGE_KEYS.GITHUB_REPO, repo);
    }

    /**
     * Get stored Personal Access Token
     */
    function getGitHubPAT() {
        return localStorage.getItem(STORAGE_KEYS.GITHUB_PAT) || '';
    }

    /**
     * Set Personal Access Token
     */
    function setGitHubPAT(pat) {
        localStorage.setItem(STORAGE_KEYS.GITHUB_PAT, pat);
    }

    /**
     * Get branch name (defaults to 'master')
     */
    function getGitHubBranch() {
        return localStorage.getItem(STORAGE_KEYS.GITHUB_BRANCH) || DEFAULTS.BRANCH;
    }

    /**
     * Set branch name
     */
    function setGitHubBranch(branch) {
        localStorage.setItem(STORAGE_KEYS.GITHUB_BRANCH, branch);
    }

    /**
     * Check if all required GitHub credentials are configured
     */
    function isConfigured() {
        return getGitHubUser() && getGitHubRepo() && getGitHubPAT();
    }

    /**
     * Save all GitHub configuration at once
     */
    function saveGitHubConfig(user, repo, pat, branch = DEFAULTS.BRANCH) {
        setGitHubUser(user);
        setGitHubRepo(repo);
        setGitHubPAT(pat);
        setGitHubBranch(branch);
    }

    /**
     * Clear all stored GitHub configuration
     */
    function clearConfig() {
        localStorage.removeItem(STORAGE_KEYS.GITHUB_USER);
        localStorage.removeItem(STORAGE_KEYS.GITHUB_REPO);
        localStorage.removeItem(STORAGE_KEYS.GITHUB_PAT);
        localStorage.removeItem(STORAGE_KEYS.GITHUB_BRANCH);
    }

    /**
     * Get the GitHub API URL for repository contents
     */
    function getContentsUrl(path = '') {
        const user = getGitHubUser();
        const repo = getGitHubRepo();
        return `${GITHUB_API_BASE}/repos/${user}/${repo}/contents/${path}`;
    }

    /**
     * Get the tournaments folder path
     */
    function getTournamentsPath() {
        return DEFAULTS.TOURNAMENTS_PATH;
    }

    /**
     * Get full path for a tournament file
     */
    function getTournamentFilePath(date) {
        return `${DEFAULTS.TOURNAMENTS_PATH}/${date}.json`;
    }

    // Public API
    return {
        isDevMode,
        getGitHubUser,
        setGitHubUser,
        getGitHubRepo,
        setGitHubRepo,
        getGitHubPAT,
        setGitHubPAT,
        getGitHubBranch,
        setGitHubBranch,
        isConfigured,
        saveGitHubConfig,
        clearConfig,
        getContentsUrl,
        getTournamentsPath,
        getTournamentFilePath,
        GITHUB_API_BASE
    };
})();
