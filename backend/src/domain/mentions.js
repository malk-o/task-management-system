// Finds the @names written in a comment.
// "Thanks @Sara, can @omar check? cc @sara" -> ['sara', 'omar']
// The (?<!\w) part skips e-mail addresses like mona@giu.edu.
const MENTION_PATTERN = /(?<!\w)@([A-Za-z][A-Za-z0-9_]*)/g;

function extractMentions(text) {
  const names = [...text.matchAll(MENTION_PATTERN)].map((match) => match[1].toLowerCase());
  return [...new Set(names)]; // each name only once
}

// The name people type after @: the user's first name, e.g. "Sara Member" -> "sara".
function mentionHandleOf(user) {
  return user.name.trim().split(/\s+/)[0].toLowerCase();
}

module.exports = { extractMentions, mentionHandleOf };
