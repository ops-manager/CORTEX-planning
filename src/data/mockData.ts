import { Agent, Shift } from '../types';

/**
 * Exact dataset imported from:
 * curl -X GET https://dispatch-ops.ai.studio/api/agents
 */
export const API_IMPORTED_AGENTS: Agent[] = [
  {
    id: "48Y6YQBfczVLqA9qsDq5",
    name: "Ahmed",
    station: "ABN",
    team: "Paris",
    order: 0,
    defaultMissionId: "",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "8FQF9jq4AfFGFWskIKvh",
    name: "Coline",
    station: "CC",
    team: "Paris",
    order: 1,
    defaultMissionId: "",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "o3GnbvINA3CqIZe6OisA",
    name: "Adam",
    station: "AME",
    team: "Paris",
    order: 2,
    defaultMissionId: "",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "9pSZsdqh08NeZ9UQ0chJ",
    name: "Amira",
    station: "AD",
    team: "Paris",
    order: 3,
    defaultMissionId: "",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "AbYxB1oNTwBblIaYhHes",
    name: "Amin",
    station: "AO",
    team: "Paris",
    order: 4,
    defaultMissionId: "",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "EWe8yuLNVkN4ROfP1baK",
    name: "Océane",
    station: "OT",
    team: "Paris",
    order: 6,
    defaultMissionId: "",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "IUFiHbVPLh7pvtQzwTlO",
    name: "Éléonore",
    station: "EL",
    team: "Paris",
    order: 7,
    defaultMissionId: "ey7PzbgV54Y4fJhBXrEq",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "KIrV9VL5v2NoEpGhLK7Z",
    name: "Romain",
    station: "RC",
    team: "Paris",
    order: 8,
    defaultMissionId: "",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "NeCWYNEIvNOoUJ9TbG54",
    name: "Richard",
    station: "RD",
    team: "Paris",
    order: 9,
    defaultMissionId: "HDaUU0HGhOzZdwuJMQG4",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "NppxcVp4SND3oCyqdZPI",
    name: "Élodie",
    station: "EV",
    team: "Paris",
    order: 10,
    defaultMissionId: "cUH8UM9ZSfBidoZt5dxc",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "Pj8hTxkguVRWHyy22LTM",
    name: "Jessy",
    station: "JS",
    team: "Paris",
    order: 11,
    defaultMissionId: "",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "UwjPL3HiQ3DEvKZU8YIa",
    name: "Yosra",
    station: "YD",
    team: "Paris",
    order: 12,
    defaultMissionId: "cUH8UM9ZSfBidoZt5dxc",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "ywT65mctUCOFgcFmeHYM",
    name: "Youssef",
    station: "YE",
    team: "Paris",
    order: 13,
    defaultMissionId: "p4PPae3hEluY3kNpMmK8",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "yFA7e0oEA5nqe6uHUZPB",
    name: "Roshan",
    station: "RCH",
    team: "Paris",
    order: 14,
    defaultMissionId: "p4PPae3hEluY3kNpMmK8",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "Pv8pSXN1d4jypx2yuvtH",
    name: "Coralie",
    station: "COH",
    team: "Paris",
    order: 17,
    defaultMissionId: "",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "baeo0POVhkdaEih8oFuR",
    name: "Nizar",
    station: "NF",
    team: "Paris",
    order: 18,
    defaultMissionId: "",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "AxKOCN4fhlJrhCynZ4QS",
    name: "Yasmine",
    station: "YL",
    team: "Paris",
    order: 19,
    defaultMissionId: "",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "KE6OfnvCkT70RzKg2iYE",
    name: "Chakib",
    station: "CHB",
    team: "Paris",
    order: 26,
    defaultMissionId: "p4PPae3hEluY3kNpMmK8",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "OsTOooSX9x6aKJB9XY3o",
    name: "Nicolas",
    station: "NME",
    team: "Paris",
    order: 27,
    defaultMissionId: "",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "C6aluUe2tlhlKh8fYKy6",
    name: "Samantha",
    station: "SSA",
    team: "Paris",
    order: 28,
    defaultMissionId: "p4PPae3hEluY3kNpMmK8",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "8saImrVI56R5HggPVEGq",
    name: "Nairie",
    station: "NB",
    team: "Nice",
    order: 20,
    defaultMissionId: "cUH8UM9ZSfBidoZt5dxc",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "b70RZpSk5LjEZfVxoIZf",
    name: "Emilien",
    station: "EO",
    team: "Nice",
    order: 21,
    defaultMissionId: "p4PPae3hEluY3kNpMmK8",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "6wr3vJfFb0ZHIJjPPt1l",
    name: "Naim",
    station: "NBH",
    team: "Nice",
    order: 22,
    defaultMissionId: "p4PPae3hEluY3kNpMmK8",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "ik8eGfzpSYf4iJGIHELR",
    name: "Vasile",
    station: "VST",
    team: "Nice",
    order: 23,
    defaultMissionId: "p4PPae3hEluY3kNpMmK8",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "IuePAkwySTnMJrcm45Oc",
    name: "Chloé",
    station: "CH",
    team: "Nice",
    order: 24,
    defaultMissionId: "p4PPae3hEluY3kNpMmK8",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "VQwpxlcqeyaLkQlmRRwZ",
    name: "Christian",
    station: "CZ",
    team: "Nice",
    order: 25,
    defaultMissionId: "p4PPae3hEluY3kNpMmK8",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  }
];

/**
 * Exact dataset imported from:
 * curl -X GET https://dispatch-ops.ai.studio/api/shifts
 */
export const API_IMPORTED_SHIFTS: Shift[] = [
  {
    id: "BqyY66YgVtPQPGGsUmX3",
    code: "M1a",
    hours: "04:30 - 14:00",
    order: 0,
    defaultMissionId: "",
    defaultPause: "",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "GEpJXxHhQqcMz1F48Djn",
    code: "M1",
    hours: "05:00 - 14:30",
    order: 1,
    defaultMissionId: "",
    defaultPause: "09:00",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "KSxdHzdODj58vEdxbOEY",
    code: "M2",
    hours: "06:00 - 15:30",
    order: 2,
    defaultMissionId: "",
    defaultPause: "10:00",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "WsFQUrR8nq9O8b7pz8ph",
    code: "M3",
    hours: "07:00 - 16:30",
    order: 3,
    defaultMissionId: "",
    defaultPause: "11:00",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "EjoDQeiPBmiwkKNav7EO",
    code: "M",
    hours: "08:00 - 16:00",
    order: 4,
    defaultMissionId: "",
    defaultPause: "",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "X87zBEuRF5JZy0Bl8BFp",
    code: "M3h",
    hours: "08:00 - 16:30",
    order: 5,
    defaultMissionId: "",
    defaultPause: "13:30",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "xvey29FtMXxKxDokQRS7",
    code: "M4",
    hours: "08:00 - 17:30",
    order: 6,
    defaultMissionId: "",
    defaultPause: "",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "oEpuZ3tgiuzxXvvLnfXc",
    code: "J",
    hours: "09:00 - 17:00",
    order: 7,
    defaultMissionId: "",
    defaultPause: "12:00",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "fJq5rj715ioTplzZQMfl",
    code: "J1h",
    hours: "09:00 - 17:30",
    order: 8,
    defaultMissionId: "",
    defaultPause: "",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "40oSGJ7zXP7xcFMa34rq",
    code: "J1",
    hours: "09:00 - 18:30",
    order: 9,
    defaultMissionId: "",
    defaultPause: "12:30",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "CKBXf36Rf3Ne3z2HwS5j",
    code: "J2",
    hours: "07:00 - 18:30",
    order: 10,
    defaultMissionId: "",
    defaultPause: "11:30",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "2zu2Jyn1qlSJAB7SSJyZ",
    code: "S2h",
    hours: "11:00 - 19:30",
    order: 11,
    defaultMissionId: "",
    defaultPause: "",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "L86LlyzlK7kR4XOrxy9D",
    code: "S2b",
    hours: "11:00 - 20:30",
    order: 12,
    defaultMissionId: "",
    defaultPause: "",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "t7gRsZ6CgyHacgGvMRbt",
    code: "S",
    hours: "12:00 - 20:00",
    order: 13,
    defaultMissionId: "",
    defaultPause: "17:30",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "NgHcfkmnqjtOyrC5UgDN",
    code: "S2",
    hours: "12:00 - 21:30",
    order: 14,
    defaultMissionId: "",
    defaultPause: "18:00",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "D4v2LI7jZegXF0dbhen4",
    code: "S4",
    hours: "13:00 - 22:30",
    order: 15,
    defaultMissionId: "",
    defaultPause: "",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "J0LylrCesbXJX3DGoX6k",
    code: "S1",
    hours: "14:00 - 23:30",
    order: 16,
    defaultMissionId: "",
    defaultPause: "20:00",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "glcvJIYK6IbSulxE0yTt",
    code: "S3a",
    hours: "15:00 - 00:00",
    order: 17,
    defaultMissionId: "",
    defaultPause: "",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "cWc8Ax89pIv7kGtfes8k",
    code: "S3",
    hours: "16:00 - 01:00",
    order: 18,
    defaultMissionId: "",
    defaultPause: "21:00",
    ownerId: "nJxGjmZvHxZNnaIV5BXiRjiq0Cv2"
  },
  {
    id: "shift-repos-rh",
    code: "RH",
    hours: "00:00 - 00:00",
    order: 19
  },
  {
    id: "shift-conge-ca",
    code: "CA",
    hours: "00:00 - 00:00",
    order: 20
  }
];

export const MOCK_AGENTS = API_IMPORTED_AGENTS;
export const MOCK_SHIFTS = API_IMPORTED_SHIFTS;

/**
 * Generate initial operational schedule for given agents and dates
 */
export function generateInitialSchedule(agents: Agent[], dateStrings: string[]): Record<string, string> {
  const planning: Record<string, string> = {};
  
  const rotationCycles = [
    ["M1", "M1", "M2", "S1", "S1", "RH", "RH"],
    ["M2", "M3", "S2", "S1", "RH", "RH", "M1"],
    ["J1", "J1", "S", "S2", "S3", "RH", "RH"],
    ["S1", "S1", "S3", "RH", "RH", "M1a", "M1"],
    ["M1a", "M1", "J", "S4", "RH", "RH", "M2"],
    ["S2h", "S2b", "S1", "RH", "RH", "J1h", "J1"]
  ];

  agents.forEach((agent, agentIdx) => {
    const pattern = rotationCycles[agentIdx % rotationCycles.length];
    
    dateStrings.forEach((dateStr, dateIdx) => {
      const shiftCode = pattern[(dateIdx + agentIdx * 2) % pattern.length];
      const key = `${agent.id}_${dateStr}`;
      planning[key] = shiftCode;
    });
  });

  return planning;
}
