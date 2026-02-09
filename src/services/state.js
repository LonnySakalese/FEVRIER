// ============================================================
// GLOBAL APPLICATION STATE
// ============================================================

// App state object (shared reference, mutate properties directly)
export const appState = {
    currentUser: null,
    isOnline: navigator.onLine,
    isFirebaseMode: false
};

// Shared mutable habits array (all modules import the same reference)
export const habits = [];

// Current date (needs getter/setter since it's reassigned)
let _currentDate = new Date();
export function getCurrentDate() { return _currentDate; }
export function setCurrentDate(date) { _currentDate = date; }

// Chart instances (needs getter/setter since they're reassigned)
let _weeklyChart = null;
let _habitsChart = null;
export function getWeeklyChart() { return _weeklyChart; }
export function setWeeklyChart(chart) { _weeklyChart = chart; }
export function getHabitsChart() { return _habitsChart; }
export function setHabitsChart(chart) { _habitsChart = chart; }
