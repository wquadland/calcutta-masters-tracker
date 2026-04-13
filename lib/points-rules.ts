export const POINTS_RULES = {
  eagle: {
    description: "Any eagle — earn a bonus point, assign to any member of your choice",
    appliesAllDays: true,
  },
  birdieHoles: [
    { day: "Thursday",  round: 1, holes: [2] },
    { day: "Friday",    round: 2, holes: [11] },
    { day: "Saturday",  round: 3, holes: [12] },
    { day: "Sunday",    round: 4, holes: [13] },
  ],
};

export const ALL_MEMBERS = [
  "Quinn", "Parker", "Blake",
  "Casey", "Riley", "Taylor",
  "Dallas", "Hayden",
  "Finley", "Harper", "Elliott",
  "Reese", "Sage", "River",
  "Brooks", "Lane", "Piper",
  "Jamie", "Drew", "Avery",
  "Alex", "Morgan", "Jordan",
];

export interface PointEvent {
  id: string;
  golfer: string;
  reason: string;
  round: number;
  hole: number;
  earnedByTeam: string;
  assignedByMember: string;
  assignedTo: string;
  timestamp: string;
  isComplete: boolean;
}
