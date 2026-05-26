# Yaniv — Fix Tracker

## Branches

| Branch | Area | Items |
|--------|------|-------|
| `001-fix-card-values` | Card rules | J/Q/K value = 10 (not 11/12/13); minimum run length = 3 cards |
| `002-fix-turn-flow` | Turn mechanics | Discard + draw must be atomic; draw button triggers discard simultaneously |
| `003-round-end-asaf` | Round end | Emit `roundEnd` event on Yaniv call; add result screen on client; apply Asaf +30 penalty; send Asaf result to client |
| `004-scoring-system` | Scoring | Per-player score tracking across rounds; halve score if it hits exactly 50 or 100; eliminate player when score exceeds 100 |
| `005-multi-round-loop` | Round loop | Reset game state after round ends; auto-start next round |
| `006-scoreboard-ui` | UI | Scoreboard screen showing all player scores between rounds |
