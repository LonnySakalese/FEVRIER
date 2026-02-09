// ============================================================
// MOTIVATION - QUOTES SYSTEM
// ============================================================

// Collection de citations de motivation
export const quotes = [
    { text: "Je ne compte pas mes abdos. Je commence à compter seulement quand ça fait mal.", author: "Muhammad Ali" },
    { text: "La douleur que tu ressens aujourd'hui sera la force que tu ressentiras demain.", author: "Arnold Schwarzenegger" },
    { text: "Je ne suis pas le plus talentueux, ni le plus doué... mais personne ne travaillera plus dur que moi.", author: "Cristiano Ronaldo" },
    { text: "Qui va porter les bateaux ?!", author: "David Goggins" },
    { text: "Souffre maintenant et vis le reste de ta vie comme un champion.", author: "Muhammad Ali" },
    { text: "Quand tu penses avoir terminé, tu n'es qu'à 40% de ta capacité.", author: "David Goggins" },
    { text: "La seule personne que tu es destiné à devenir est celle que tu décides d'être.", author: "Ralph Waldo Emerson" },
    { text: "Le travail acharné bat le talent quand le talent ne travaille pas dur.", author: "Tim Notke" }
];

// Affiche une citation aléatoire
export function displayRandomQuote() {
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    document.getElementById('dailyQuote').textContent = '"' + quote.text + '"';
    document.getElementById('quoteAuthor').textContent = '- ' + quote.author;
}

// Affiche un message de bienvenue différent selon l'heure
export function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 6) return "Debout tôt, GUERRIER !";
    if (hour < 12) return "Bonne matinée, WARRIOR !";
    if (hour < 18) return "Continue comme ça !";
    if (hour < 21) return "Finis en beauté !";
    return "Dernière ligne droite !";
}
