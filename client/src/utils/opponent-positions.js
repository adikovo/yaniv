export function getOpponentPositions(players, localPlayerId) {
    const localIdx = players.findIndex(p => p.id === localPlayerId);
    if (localIdx === -1) return {};

    const count = players.length;
    const result = {};

    if (count === 2) {
        const otherId = players[(localIdx + 1) % 2].id;
        result[otherId] = 'top';
    } else if (count === 3) {
        result[players[(localIdx + 1) % 3].id] = 'right';
        result[players[(localIdx + 2) % 3].id] = 'left';
    } else if (count === 4) {
        result[players[(localIdx + 1) % 4].id] = 'right';
        result[players[(localIdx + 2) % 4].id] = 'top';
        result[players[(localIdx + 3) % 4].id] = 'left';
    }

    return result;
}
