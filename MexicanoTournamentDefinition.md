# Mexicano Tournament System Definition

> [!NOTE]
> This document defines the complete rules and logic for running a Mexicano-style 2v2 padel/tennis tournament. Use this as a reference for reimplementing in any technology.

## Overview

Mexicano is a dynamic 2v2 tournament format where players are **re-paired each round based on accumulated points**. This creates competitive matches as the tournament progresses, grouping players of similar skill together.

---

## Tournament Setup

### Player Requirements

| Players | Courts | Matches per Round |
|---------|--------|-------------------|
| 8       | 2      | 2                 |
| 12      | 3      | 3                 |
| 16      | 4      | 4                 |

**Rules:**
- Must have exactly **8, 12, or 16 players** (multiples of 4, minimum 8)
- All player names must be **unique and non-empty**
- One tournament per calendar date

### Tournament Creation Data

```
Tournament {
    name: string              // e.g., "Mexicano Feb 05, 2026"
    description: string       // Optional description
    tournamentDate: Date      // Single tournament per date
    players: Player[]         // List of participants
}
```

---

## Scoring System

### Match Scoring

- Each match distributes exactly **25 total points** between the two teams
- Points are split based on game performance (e.g., 15-10, 13-12, 20-5)
- **Both players on a team receive the same points** (team-based scoring)

**Example:** If Team 1 wins 15-10:
- Both Player A and Player B (Team 1) get **15 points each**
- Both Player C and Player D (Team 2) get **10 points each**

### Score Validation

```
Valid if:
    team1Score >= 0
    team2Score >= 0
    team1Score + team2Score == 25
```

### Player Statistics (tracked per player)

| Statistic      | Description                           |
|----------------|---------------------------------------|
| TotalPoints    | Sum of all points earned              |
| GamesPlayed    | Number of matches played              |
| Wins           | Number of matches won                 |
| Losses         | Number of matches lost                |
| PointsPerGame  | TotalPoints / GamesPlayed             |
| WinPercentage  | (Wins / GamesPlayed) × 100            |

---

## Ranking System

Players are ranked using this **priority order**:

1. **Total Points** (descending) - highest first
2. **Wins** (descending) - tiebreaker
3. **Points Per Game** (descending) - secondary tiebreaker
4. **Name** (alphabetical) - final tiebreaker

### Tie Handling

- Players with **identical TotalPoints AND Wins** share the same rank
- The next rank skips by the number of tied players

**Example with ties:**
```
Rank 1: Alice (50 pts, 3 wins)
Rank 2: Bob (45 pts, 2 wins)  
Rank 2: Carol (45 pts, 2 wins)    // Ties with Bob
Rank 4: Dave (40 pts, 1 win)      // Rank skips to 4
```

---

## Pairing Algorithm

### Round 1: Initial Pairing

Players are paired in **entry order** (or can be randomized):

```
For players in groups of 4:
    Player 1 + Player 4  vs  Player 2 + Player 3
    Player 5 + Player 8  vs  Player 6 + Player 7
    ... and so on
```

### Subsequent Rounds: Mexicano Pairing

After Round 1, players are **sorted by ranking** and paired within groups of 4:

```
Algorithm: CreateMexicanoMatches(rankedPlayers)
    Sort players by ranking (TotalPoints, Wins, PointsPerGame)
    
    For each group of 4 consecutive ranked players:
        #1 + #4  vs  #2 + #3
        
    This pairs:
        - Top player with bottom player of the group
        - Middle two players together
```

**Example with 8 players after Round 1:**
```
Rankings:       1st  2nd  3rd  4th  5th  6th  7th  8th
                ↓    ↓    ↓    ↓    ↓    ↓    ↓    ↓
Group 1 Match:  1st+4th  vs  2nd+3rd
Group 2 Match:  5th+8th  vs  6th+7th
```

This creates **balanced matches** where:
- The best player compensates for a weaker partner
- Middle-ranked players are paired together
- Different skill levels interact throughout the tournament

---

## Round Progression

### Round State

```
Round {
    roundNumber: int
    matches: Match[]
    isCompleted: boolean    // All matches have scores
}
```

### Progression Rules

1. **Cannot start next round** until all matches in current round are completed
2. When starting a new round:
   - Recalculate all player statistics
   - Sort players by ranking
   - Generate new pairings using Mexicano algorithm
3. Tournament can have **unlimited rounds** until manually stopped

### Round Completion Detection

```
Round.isCompleted = ALL matches have (team1Score + team2Score == 25)
```

---

## Match Structure

```
Match {
    id: int
    roundNumber: int
    
    // Team 1
    player1: Player
    player2: Player
    team1Score: int
    
    // Team 2
    player3: Player
    player4: Player
    team2Score: int
    
    isCompleted: boolean    // team1Score + team2Score == 25
}
```

### Match Display Format

```
"Player1 & Player2 vs Player3 & Player4"
"Score: 15 - 10"
```

---

## Score Editing Rules

### Editable Period

- Tournament is **only editable for 1 day** after the tournament date
- After that, it becomes read-only

### Previous Round Editing

When editing a score from a **previous round**:

1. Update the match score
2. **Recalculate all player statistics** from scratch
3. **Delete all subsequent rounds**
4. **Regenerate the next round** using updated rankings

> [!WARNING]
> Editing a previous round changes the pairings for subsequent rounds because player rankings change.

### Current Round Editing

- Can freely edit scores in the current round
- Only affects that specific match
- No round regeneration needed

---

## User Interface Flows

### Tournament Creation (Desktop/Mobile)

1. Select player count (4, 8, 12, or 16)
2. Select tournament date
3. Enter unique names for each player
4. Click "Start Tournament"
5. First round is automatically generated

### Running Tournament (Mobile View - /prototype-a)

```
┌─────────────────────────────────┐
│  Round 3         ◀  ▶ navigation
│  2/3 matches completed          
├─────────────────────────────────┤
│  ┌──────────────────────────┐   │
│  │ Court #1 🔶              │   │
│  │ #1 Alice   15 - 10  Bob #3│   │
│  │ #4 Carol        Dave #2  │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌──────────────────────────┐   │
│  │ Court #2                 │   │
│  │ Eve       - - -    Frank │   │ ← Tap to enter score
│  │ Grace          Henry     │   │
│  └──────────────────────────┘   │
│                                 │
│              [🏆] [🔒] [➡️]     │ ← FAB buttons
└─────────────────────────────────┘
```

**FAB Actions:**
- 🏆 **Leaderboard**: View player rankings panel
- 🔒 **Lock/Unlock**: Prevent accidental "Next Round" clicks
- ➡️ **Next Round**: Start next round (visible when current is complete)

### Score Entry (Bottom Sheet)

```
┌─────────────────────────────────┐
│         Court 1                 │
│                                 │
│  Alice   [15] - [10]   Bob      │
│  Carol              Dave        │
│                                 │
│  Quick: [15-10] [13-12] [12-13] │
│                                 │
│  [─────────●───────────────] ←  slider
│   0 (Team 1)        25 (Team 2) │
│                                 │
│  [ Confirm Score ] [ Cancel ]   │
└─────────────────────────────────┘
```

**Score Input:**
- Slider distributes 25 points between teams
- Quick preset buttons for common scores
- Team 2 score auto-calculates as (25 - Team 1 score)

---

## Data Persistence

### Match Entity (for storage)

```
MatchEntity {
    partitionKey: "match"
    rowKey: "{date}_{matchId}"      // e.g., "2026-02-05_1"
    
    team1Player1Name: string
    team1Player2Name: string
    team2Player1Name: string
    team2Player2Name: string
    
    team1Score: int
    team2Score: int
    roundNumber: int
}
```

### Loading Tournament from Storage

1. Group matches by tournament date
2. Extract unique player names from all matches
3. Create Round objects from match RoundNumber
4. Recalculate player statistics from completed matches
5. Determine current round number

---

## Business Rules Summary

| Rule | Description |
|------|-------------|
| Player count | Must be 8, 12, or 16 |
| Unique names | All players must have unique names |
| Score total | Team1Score + Team2Score = 25 |
| First round pairing | Players 1+4 vs 2+3, 5+8 vs 6+7, etc. |
| Subsequent pairing | Rank-based: #1+#4 vs #2+#3 within each group of 4 |
| Ranking priority | TotalPoints → Wins → PointsPerGame → Name |
| Edit window | 1 day after tournament date |
| Previous round edit | Triggers recalculation and regeneration of subsequent rounds |
| Round progression | All matches must be complete before starting next round |

---

## Implementation Checklist

For reimplementing this system:

- [ ] **Models**: Player, Match, Round, Tournament entities
- [ ] **Validation**: Player count (8/12/16), unique names, score totals
- [ ] **Ranking**: Sort by points, wins, average, then name
- [ ] **Pairing Algorithm**: Entry order for R1, Mexicano pairing for R2+
- [ ] **Statistics**: Track points, wins, losses, games for each player
- [ ] **Round Management**: Completion detection, next round generation
- [ ] **Score Editing**: Recalculate stats and regenerate rounds when editing past
- [ ] **UI**: Tournament creation, match cards, score input, leaderboard
- [ ] **Persistence**: Save/load tournament state between sessions

---

*Document generated from analysis of Mexicano Tournament Manager codebase.*
