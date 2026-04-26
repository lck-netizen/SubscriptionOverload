/* Simple keyword-based auto-categorization.
   Returns 'Other' if no keyword matches. */
const CATEGORY_KEYWORDS = {
    OTT: ['netflix', 'prime', 'hotstar', 'disney', 'sony', 'zee', 'jio cinema', 'hulu', 'hbo', 'apple tv'],
    Music: ['spotify', 'apple music', 'youtube music', 'gaana', 'wynk', 'tidal'],
    Cloud: ['aws', 'azure', 'gcp', 'google cloud', 'digitalocean', 'linode', 'heroku', 'vercel', 'netlify'],
    Productivity: ['notion', 'slack', 'trello', 'asana', 'monday', 'clickup', 'jira', 'microsoft 365', 'google workspace'],
    SaaS: ['figma', 'github', 'gitlab', 'canva', 'adobe', 'grammarly', 'zoom', 'calendly'],
    Gaming: ['xbox', 'playstation', 'steam', 'ea play', 'nintendo'],
    News: ['nyt', 'new york times', 'washington post', 'bloomberg', 'ft', 'economist'],
    Fitness: ['cult', 'healthify', 'strava', 'fitbit'],
};

function autoCategorize(serviceName) {
    const name = (serviceName || '').toLowerCase();
    for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
        if (kws.some((kw) => name.includes(kw))) return cat;
    }
    return 'Other';
}

module.exports = { autoCategorize };
