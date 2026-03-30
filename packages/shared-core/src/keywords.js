export function computeKeywordCoverage(notes, keywords) {
    return keywords.map((keyword) => {
        const matches = notes.filter(({ markdown }) => markdown.toLowerCase().includes(keyword.toLowerCase()));
        return {
            keyword,
            hits: matches.length,
            coveredPaths: matches.map(({ note }) => note.path)
        };
    });
}
//# sourceMappingURL=keywords.js.map