const state = {
    currentUser: null,
    isOnline: navigator.onLine,
    isFirebaseMode: false, // This will be updated based on Firebase config
    habits: [],
    completions: {}, // Store completions by date
    currentDate: new Date(),
    // Add other relevant state properties here
};

const listeners = [];

export const subscribe = (listener) => {
    listeners.push(listener);
    return () => { // Unsubscribe function
        const index = listeners.indexOf(listener);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    };
};

const publish = () => {
    for (const listener of listeners) {
        listener(state);
    }
};

// --- State Getters ---

export const getState = () => {
    return { ...state };
};

// --- State Setters ---
// These functions will be the only way to modify the state.

export const setCurrentUser = (user) => {
    state.currentUser = user;
    publish();
};

export const setHabits = (habits) => {
    state.habits = habits;
    publish();
};

export const setCompletions = (completions) => {
    state.completions = completions;
    publish();
};

export const setCurrentDate = (date) => {
    state.currentDate = date;
    publish();
};

export const setFirebaseMode = (isConfigured) => {
    state.isFirebaseMode = isConfigured;
    publish();
};
