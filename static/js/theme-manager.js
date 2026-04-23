/**
 * Theme Management Module
 * Centralizes all theme-related functionality
 */

// Theme Configuration
const THEME_STORAGE_KEY = "theme";
const THEME_DATA_ATTRIBUTE = "data-theme";
const THEME_TRANSITION_CLASS = "theme-transition";
const DARK_THEME = "dark";
const LIGHT_THEME = "light";
const TRANSITION_DURATION = 300; // ms

// Theme Management Class
class ThemeManager {
  constructor() {
    this.initialized = false;
    this.toggleElements = {
      main: document.getElementById("darkModeToggle"),
      mobile: document.getElementById("darkModeToggleMobile"),
    };
    this.systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)");
  }

  /**
   * Initialize the theme manager
   */
  init() {
    if (this.initialized) return;

    // Apply theme immediately to prevent flash
    this._applyThemeImmediately();

    // Setup event listeners after DOM is fully loaded
    document.addEventListener("DOMContentLoaded", () => {
      this._setupEventListeners();
      this._syncToggles();
      this._updateActiveStatus();
    });

    // Setup system preference detection
    this.systemPrefersDark.addEventListener("change", (e) => {
      if (localStorage.getItem(THEME_STORAGE_KEY) === null) {
        this.setTheme(e.matches ? DARK_THEME : LIGHT_THEME, false);
      }
    });

    // Create MutationObserver to handle dynamically added elements
    const observer = new MutationObserver(() => {
      this._updateToggles();
      this._syncToggles();
    });

    // Start observing the document with the configured parameters
    observer.observe(document.body, { childList: true, subtree: true });

    this.initialized = true;
    console.log("Theme manager initialized");
  }

  /**
   * Set the theme with transition effect
   * @param {string} theme - The theme to set ('dark' or 'light')
   * @param {boolean} savePreference - Whether to save the preference
   */
  setTheme(theme, savePreference = true) {
    // Early exit if theme is already set
    const currentTheme = this._getCurrentTheme();
    if (theme === currentTheme) return;

    // IMPROVEMENT: Set all changes before visual updates
    // Update document data attribute for CSS variables
    document.documentElement.setAttribute(THEME_DATA_ATTRIBUTE, theme);

    // Update HTML classes for compatibility with existing code
    if (theme === DARK_THEME) {
      document.documentElement.classList.add("dark-theme");
      document.body.classList.add("dark-mode");
    } else {
      document.documentElement.classList.remove("dark-theme");
      document.body.classList.remove("dark-mode");
    }

    // Save preference if requested
    if (savePreference) {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }

    // Update toggles immediately
    this._updateToggles();

    console.log(`Theme set to ${theme}`);
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme() {
    const currentTheme = this._getCurrentTheme();
    const newTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
    this.setTheme(newTheme);
  }

  /**
   * Apply the correct theme immediately without transition (prevents flash)
   * @private
   */
  _applyThemeImmediately() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const prefersDark = this.systemPrefersDark.matches;
    const theme = savedTheme || (prefersDark ? DARK_THEME : LIGHT_THEME);

    // Set the theme directly without transitions
    document.documentElement.setAttribute(THEME_DATA_ATTRIBUTE, theme);

    if (theme === DARK_THEME) {
      document.documentElement.classList.add("dark-theme");
      document.body.classList.add("dark-mode");
    }

    // Add the no-transitions class to prevent flashes
    document.documentElement.classList.add("no-transitions");

    // Remove the no-transitions class after a short delay
    setTimeout(() => {
      document.documentElement.classList.remove("no-transitions");
    }, 100);

    console.log(`Theme applied immediately: ${theme}`);
  }

  /**
   * Set up event listeners for theme toggles
   * @private
   */
  _setupEventListeners() {
    // Helper function to add event listener
    const addToggleListener = (element) => {
      if (element) {
        element.addEventListener("change", () => this.toggleTheme());
      }
    };

    // Add listeners to both toggles
    addToggleListener(this.toggleElements.main);
    addToggleListener(this.toggleElements.mobile);

    console.log("Theme toggle event listeners set up");
  }

  /**
   * Sync the state of all theme toggles
   * @private
   */
  _syncToggles() {
    const isDark = this._getCurrentTheme() === DARK_THEME;

    // Update all toggles to match the current theme
    const updateToggle = (toggle) => {
      if (toggle && toggle.checked !== isDark) {
        toggle.checked = isDark;
      }
    };

    updateToggle(this.toggleElements.main);
    updateToggle(this.toggleElements.mobile);

    // Also look for any other toggles that might have been added dynamically
    document.querySelectorAll(".theme-checkbox").forEach(updateToggle);
  }

  /**
   * Update toggle references in case DOM has changed
   * @private
   */
  _updateToggles() {
    this.toggleElements = {
      main: document.getElementById("darkModeToggle"),
      mobile: document.getElementById("darkModeToggleMobile"),
    };
  }

  /**
   * Get the current theme
   * @private
   * @returns {string} - The current theme ('dark' or 'light')
   */
  _getCurrentTheme() {
    return document.documentElement.getAttribute(THEME_DATA_ATTRIBUTE) ===
      DARK_THEME
      ? DARK_THEME
      : LIGHT_THEME;
  }

  /**
   * Update active status in navbar
   * @private
   */
  _updateActiveStatus() {
    const currentPath = window.location.pathname;

    // Update desktop menu
    document.querySelectorAll(".nav-links a").forEach((link) => {
      const linkPath = link.getAttribute("href");
      if (
        linkPath === currentPath ||
        (linkPath === "/" && currentPath === "/") ||
        (linkPath !== "/" && currentPath.includes(linkPath))
      ) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });

    // Update mobile menu
    document.querySelectorAll(".sidebar-nav a").forEach((link) => {
      const linkPath = link.getAttribute("href");
      if (
        linkPath === currentPath ||
        (linkPath === "/" && currentPath === "/") ||
        (linkPath !== "/" && currentPath.includes(linkPath))
      ) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  }
}

// Create and initialize the theme manager
const themeManager = new ThemeManager();

// Initialize theme on script load
document.addEventListener("DOMContentLoaded", () => {
  themeManager.init();
});

// Also initialize immediately to prevent theme flash
themeManager.init();

// Expose the theme manager for debugging
window.themeManager = themeManager;
