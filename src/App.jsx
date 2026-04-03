import React from "react";

const STORAGE_KEY = "golf-league-site-data-v5";
const ADMIN_PASSWORD = "golfadmin123";
const SCORE_ENTRY_PASSWORD = "scoreentry123";
const ANNOUNCEMENT_PASSWORD = "announce123";
const COURSE_HOLE_PARS = {
  "C-Way": [5, 4, 4, 4, 3, 5, 4, 4, 3],
  "Clayton Country Club": [4, 4, 4, 3, 3, 4, 5, 3, 4],
};
const LEAGUE_WEATHER = {
  label: "League Night Weather",
  latitude: 43.4556,
  longitude: -76.5105,
};
const TEAM_COLOR_STYLES = [
  { accent: "border-l-emerald-500", pill: "bg-emerald-100 text-emerald-800", soft: "bg-emerald-50" },
  { accent: "border-l-sky-500", pill: "bg-sky-100 text-sky-800", soft: "bg-sky-50" },
  { accent: "border-l-amber-500", pill: "bg-amber-100 text-amber-800", soft: "bg-amber-50" },
  { accent: "border-l-violet-500", pill: "bg-violet-100 text-violet-800", soft: "bg-violet-50" },
  { accent: "border-l-rose-500", pill: "bg-rose-100 text-rose-800", soft: "bg-rose-50" },
  { accent: "border-l-cyan-500", pill: "bg-cyan-100 text-cyan-800", soft: "bg-cyan-50" },
];

function readStorage(fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function sumScores(scores) {
  return scores.reduce((sum, value) => sum + Number(value || 0), 0);
}

function compareHoles(playerAHoles, playerBHoles) {
  let playerAHolesWon = 0;
  let playerBHolesWon = 0;

  for (let i = 0; i < 9; i += 1) {
    const a = Number(playerAHoles[i] || 0);
    const b = Number(playerBHoles[i] || 0);
    if (!a || !b) continue;
    if (a < b) playerAHolesWon += 1;
    if (b < a) playerBHolesWon += 1;
  }

  return { playerAHolesWon, playerBHolesWon };
}

function sortByNumber(a, b) {
  return Number(a.number) - Number(b.number);
}

function getLineupPeriodStart(week) {
  return Math.floor((Number(week) - 1) / 3) * 3 + 1;
}

function formatWeekDate(startDate, weekOffset) {
  const date = new Date(startDate);
  date.setDate(date.getDate() + weekOffset * 7);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function generateRoundRobinPairs(teamNumbers) {
  const teams = [...teamNumbers];
  if (teams.length % 2 !== 0) teams.push(null);
  const rounds = [];
  const working = [...teams];

  for (let round = 0; round < working.length - 1; round += 1) {
    const pairs = [];
    for (let i = 0; i < working.length / 2; i += 1) {
      const a = working[i];
      const b = working[working.length - 1 - i];
      if (a !== null && b !== null) {
        pairs.push({ teamANumber: a, teamBNumber: b });
      }
    }
    rounds.push(pairs);

    const fixed = working[0];
    const rotated = [fixed, working[working.length - 1], ...working.slice(1, working.length - 1)];
    for (let i = 0; i < working.length; i += 1) {
      working[i] = rotated[i];
    }
  }

  return rounds;
}

function chooseBalancedMatchCourse(teamA, teamB, courseCounts, remainingSlots) {
  const courses = ["C-Way", "Clayton Country Club"];

  const scoreCourse = (course) => {
    if (remainingSlots[course] <= 0) return Number.POSITIVE_INFINITY;

    const nextA = { ...courseCounts[teamA] };
    const nextB = { ...courseCounts[teamB] };

    if (course === "C-Way") {
      nextA.cway += 1;
      nextB.cway += 1;
    } else {
      nextA.clayton += 1;
      nextB.clayton += 1;
    }

    const diffA = Math.abs(nextA.cway - nextA.clayton);
    const diffB = Math.abs(nextB.cway - nextB.clayton);
    const overloadPenalty =
      Math.max(0, nextA.cway - 9) +
      Math.max(0, nextA.clayton - 9) +
      Math.max(0, nextB.cway - 9) +
      Math.max(0, nextB.clayton - 9);

    return diffA + diffB + overloadPenalty * 100;
  };

  const cwayScore = scoreCourse("C-Way");
  const claytonScore = scoreCourse("Clayton Country Club");

  if (cwayScore === claytonScore) {
    return remainingSlots["C-Way"] >= remainingSlots["Clayton Country Club"]
      ? "C-Way"
      : "Clayton Country Club";
  }

  return cwayScore < claytonScore ? "C-Way" : "Clayton Country Club";
}

function generateBalancedSeasonSchedule(teamNumbers, startDate = "2026-04-05", time = "5:30 PM") {
  const rounds = generateRoundRobinPairs(teamNumbers);
  const courseCounts = Object.fromEntries(
    teamNumbers.map((teamNumber) => [Number(teamNumber), { cway: 0, clayton: 0 }])
  );

  return rounds.flatMap((pairs, roundIndex) => {
    const remainingSlots = {
      "C-Way": roundIndex % 2 === 0 ? 5 : 4,
      "Clayton Country Club": roundIndex % 2 === 0 ? 4 : 5,
    };

    const orderedPairs = [...pairs].sort((a, b) => {
      const aTeamA = courseCounts[Number(a.teamANumber)];
      const aTeamB = courseCounts[Number(a.teamBNumber)];
      const bTeamA = courseCounts[Number(b.teamANumber)];
      const bTeamB = courseCounts[Number(b.teamBNumber)];
      const aImbalance = Math.abs(aTeamA.cway - aTeamA.clayton) + Math.abs(aTeamB.cway - aTeamB.clayton);
      const bImbalance = Math.abs(bTeamA.cway - bTeamA.clayton) + Math.abs(bTeamB.cway - bTeamB.clayton);
      return bImbalance - aImbalance;
    });

    const scheduledPairs = orderedPairs.map((pair) => {
      const teamA = Number(pair.teamANumber);
      const teamB = Number(pair.teamBNumber);
      const course = chooseBalancedMatchCourse(teamA, teamB, courseCounts, remainingSlots);

      if (course === "C-Way") {
        courseCounts[teamA].cway += 1;
        courseCounts[teamB].cway += 1;
      } else {
        courseCounts[teamA].clayton += 1;
        courseCounts[teamB].clayton += 1;
      }
      remainingSlots[course] -= 1;

      return {
        week: roundIndex + 1,
        date: formatWeekDate(startDate, roundIndex),
        time,
        course,
        format: "9-Hole Stroke + Match Play",
        teamANumber: teamA,
        teamBNumber: teamB,
      };
    });

    return scheduledPairs.sort((a, b) => a.teamANumber - b.teamANumber);
  });
}

function getWeeklyFoursomePattern(week) {
  const patterns = ["1-2   3-4", "1-3   2-4", "1-4   2-3"];
  return patterns[(Number(week) - 1) % patterns.length];
}

function getWeeklyFoursomeGroups(week) {
  const patterns = [
    [[1, 2], [3, 4]],
    [[1, 3], [2, 4]],
    [[1, 4], [2, 3]],
  ];
  return patterns[(Number(week) - 1) % patterns.length];
}

function runInternalChecks() {
  console.assert(sumScores([4, 4, 4]) === 12, "sumScores should total strokes");
  const holeResult = compareHoles([4, 5, 3], [5, 4, 3]);
  console.assert(holeResult.playerAHolesWon === 1 && holeResult.playerBHolesWon === 1, "compareHoles should count wins correctly");
  const pairs = generateRoundRobinPairs([1, 2, 3, 4]);
  console.assert(pairs.length === 3, "4 teams should create 3 rounds");
}

runInternalChecks();

export default function GolfLeagueStarterWebsite() {
  const [newAnnouncement, setNewAnnouncement] = React.useState("");
  const [announcementDelivery, setAnnouncementDelivery] = React.useState({
    subject: "Wednesday Night League Update",
    message: "",
  });
  const [newDirectoryEntry, setNewDirectoryEntry] = React.useState({ name: "", teamNumber: "", lineupSlot: "1", phone: "", email: "" });
  const [directoryTabEntry, setDirectoryTabEntry] = React.useState({ name: "", teamNumber: "", lineupSlot: "1", phone: "", email: "" });
  const [newSubstitute, setNewSubstitute] = React.useState({ slot: "1", name: "", phone: "", email: "" });
  const [editingDirectoryEntryId, setEditingDirectoryEntryId] = React.useState(null);
  const [editingDirectoryEntry, setEditingDirectoryEntry] = React.useState({ name: "", teamNumber: "", lineupSlot: "1", phone: "", email: "" });

  const initialTeams = Array.from({ length: 18 }, (_, index) => ({
    id: index + 1,
    number: index + 1,
    name: "Team " + String(index + 1),
  }));

  const initialPlayers = [
    { id: 1, name: "Tom Carter", teamNumber: 1, lineupSlot: 1 },
    { id: 2, name: "Mike Wilson", teamNumber: 1, lineupSlot: 2 },
    { id: 3, name: "John Smith", teamNumber: 1, lineupSlot: 3 },
    { id: 4, name: "Dave Lee", teamNumber: 1, lineupSlot: 4 },
    { id: 5, name: "Sam Miller", teamNumber: 2, lineupSlot: 1 },
    { id: 6, name: "Chris Stone", teamNumber: 2, lineupSlot: 2 },
    { id: 7, name: "Brian Hall", teamNumber: 2, lineupSlot: 3 },
    { id: 8, name: "Luke Adams", teamNumber: 2, lineupSlot: 4 },
  ];

  const initialSchedule = generateBalancedSeasonSchedule(
    initialTeams.map((team) => Number(team.number)),
    "2026-04-05",
    "5:30 PM"
  );

  const initialRounds = [
    { id: 1, week: 1, playerId: 1, holes: [5, 4, 4, 5, 4, 3, 5, 4, 4] },
    { id: 2, week: 1, playerId: 5, holes: [5, 5, 4, 6, 4, 4, 5, 4, 5] },
    { id: 3, week: 1, playerId: 2, holes: [4, 4, 5, 5, 5, 3, 4, 4, 4] },
    { id: 4, week: 1, playerId: 6, holes: [5, 4, 5, 5, 5, 4, 5, 4, 4] },
    { id: 5, week: 1, playerId: 3, holes: [5, 5, 4, 5, 5, 4, 5, 5, 4] },
    { id: 6, week: 1, playerId: 7, holes: [5, 4, 4, 5, 5, 4, 6, 4, 4] },
    { id: 7, week: 1, playerId: 4, holes: [4, 5, 5, 5, 4, 4, 5, 4, 5] },
    { id: 8, week: 1, playerId: 8, holes: [4, 5, 4, 5, 5, 4, 5, 5, 5] },
    { id: 9, week: 2, playerId: 1, holes: [4, 4, 4, 5, 4, 4, 5, 4, 4] },
    { id: 10, week: 2, playerId: 5, holes: [5, 4, 4, 5, 5, 4, 5, 4, 5] },
    { id: 11, week: 2, playerId: 2, holes: [4, 5, 4, 5, 5, 4, 4, 4, 4] },
    { id: 12, week: 2, playerId: 6, holes: [5, 5, 4, 5, 5, 4, 5, 4, 4] },
    { id: 13, week: 2, playerId: 3, holes: [5, 5, 5, 5, 4, 4, 5, 5, 4] },
    { id: 14, week: 2, playerId: 7, holes: [5, 4, 5, 5, 5, 4, 5, 4, 4] },
    { id: 15, week: 2, playerId: 4, holes: [4, 4, 5, 5, 4, 4, 4, 4, 4] },
    { id: 16, week: 2, playerId: 8, holes: [5, 4, 5, 5, 5, 4, 5, 4, 5] },
  ].map((round) => ({ ...round, gross: sumScores(round.holes) }));

  const initialData = readStorage({
    teams: initialTeams,
    players: initialPlayers,
    schedule: initialSchedule,
    rounds: initialRounds,
    announcements: [],
    leagueAlert: "",
    directoryEntries: [],
    substitutes: { 1: [], 2: [], 3: [], 4: [] },
    manualPointAdjustments: {},
    lockedWeeks: [],
    bylawsDocumentName: "league-bylaws.pdf",
    bylawsDocumentUrl: "/league-bylaws.pdf",
  });

  const [teams, setTeams] = React.useState(initialData.teams);
  const [players, setPlayers] = React.useState(initialData.players);
  const [schedule, setSchedule] = React.useState(initialData.schedule);
  const [rounds, setRounds] = React.useState(initialData.rounds);
  const [announcements, setAnnouncements] = React.useState(initialData.announcements ?? []);
  const [leagueAlert, setLeagueAlert] = React.useState(initialData.leagueAlert ?? "");
  const [leagueAlertInput, setLeagueAlertInput] = React.useState(initialData.leagueAlert ?? "");
  const [directoryEntries, setDirectoryEntries] = React.useState(initialData.directoryEntries ?? []);
  const [substitutes, setSubstitutes] = React.useState(initialData.substitutes ?? { 1: [], 2: [], 3: [], 4: [] });
  const [manualPointAdjustments, setManualPointAdjustments] = React.useState(initialData.manualPointAdjustments ?? {});
  const [lockedWeeks, setLockedWeeks] = React.useState(initialData.lockedWeeks ?? []);
  const [bylawsDocumentName, setBylawsDocumentName] = React.useState(initialData.bylawsDocumentName ?? "league-bylaws.pdf");
  const [bylawsDocumentUrl, setBylawsDocumentUrl] = React.useState(initialData.bylawsDocumentUrl ?? "/league-bylaws.pdf");
  const [adminOpen, setAdminOpen] = React.useState(false);
  const [scoreEntryAuthenticated, setScoreEntryAuthenticated] = React.useState(false);
  const [scoreEntryPasswordInput, setScoreEntryPasswordInput] = React.useState("");
  const [scoreEntryMessage, setScoreEntryMessage] = React.useState("");
  const [adminAuthenticated, setAdminAuthenticated] = React.useState(false);
  const [announcementAuthenticated, setAnnouncementAuthenticated] = React.useState(false);
  const [announcementPasswordInput, setAnnouncementPasswordInput] = React.useState("");
  const [adminPasswordInput, setAdminPasswordInput] = React.useState("");
  const [adminMessage, setAdminMessage] = React.useState("");
  const [lastUpdated, setLastUpdated] = React.useState(() => new Date().toLocaleString());
  const [activeTab, setActiveTab] = React.useState("standings");
  const [leagueLogoMode, setLeagueLogoMode] = React.useState(() => {
    if (typeof window === "undefined") return "icon";
    return window.localStorage.getItem("league-logo-mode") || "icon";
  });
  const [favoriteTeamNumber, setFavoriteTeamNumber] = React.useState(() => {
    if (typeof window === "undefined") return "1";
    return window.localStorage.getItem("favorite-team-number") || "1";
  });
  const [expandedScheduleWeeks, setExpandedScheduleWeeks] = React.useState(() => {
    if (typeof window === "undefined") return { 1: true };
    try {
      return JSON.parse(window.localStorage.getItem("expanded-schedule-weeks") || "{\"1\":true}");
    } catch {
      return { 1: true };
    }
  });
  const [selectedResultsMatchupKey, setSelectedResultsMatchupKey] = React.useState("");
  const [selectedPlayerProfileId, setSelectedPlayerProfileId] = React.useState(null);
  const [weatherState, setWeatherState] = React.useState({ loading: true, data: null, error: "" });

  const [formData, setFormData] = React.useState({
    playerId: String(initialData.players[0]?.id ?? 1),
    week: String(initialData.schedule[0]?.week ?? 1),
    holes: Array(9).fill(""),
  });

  const [newTeam, setNewTeam] = React.useState({ number: "", name: "" });
  const [newPlayer, setNewPlayer] = React.useState({ name: "", teamNumber: "", lineupSlot: "1" });
  const [newScheduleWeek, setNewScheduleWeek] = React.useState({
    week: String(((initialData.schedule[initialData.schedule.length - 1]?.week) ?? 0) + 1),
    date: "",
    time: "5:30 PM",
    course: "C-Way",
    format: "9-Hole Stroke + Match Play",
    teamANumber: "1",
    teamBNumber: "2",
  });
  const [manualAdjustmentForm, setManualAdjustmentForm] = React.useState({ teamNumber: "1", points: "0" });
  const [deleteRoundForm, setDeleteRoundForm] = React.useState({ week: "1", playerId: String(initialData.players[0]?.id ?? 1) });
  const [scoreEntryMatchupKey, setScoreEntryMatchupKey] = React.useState("");

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("favorite-team-number", favoriteTeamNumber);
  }, [favoriteTeamNumber]);

  React.useEffect(() => {
    const firstFavoritePlayer = players.find((player) => Number(player.teamNumber) === Number(favoriteTeamNumber))?.id ?? null;
    setSelectedPlayerProfileId((current) => {
      if (current && players.some((player) => player.id === current && Number(player.teamNumber) === Number(favoriteTeamNumber))) {
        return current;
      }
      return firstFavoritePlayer;
    });
  }, [favoriteTeamNumber, players]);

  React.useEffect(() => {
    let isCancelled = false;
    const nextWednesday = new Date();
    const dayDiff = (3 - nextWednesday.getDay() + 7) % 7;
    nextWednesday.setDate(nextWednesday.getDate() + dayDiff);
    const forecastDate = nextWednesday.toISOString().slice(0, 10);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LEAGUE_WEATHER.latitude}&longitude=${LEAGUE_WEATHER.longitude}&hourly=temperature_2m,precipitation_probability,wind_speed_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&start_date=${forecastDate}&end_date=${forecastDate}`;

    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        if (isCancelled) return;
        const times = data?.hourly?.time ?? [];
        const index = Math.max(times.findIndex((time) => String(time).includes("18:00")), 0);
        setWeatherState({
          loading: false,
          error: "",
          data: {
            date: forecastDate,
            temperature: data?.hourly?.temperature_2m?.[index] ?? null,
            precipitation: data?.hourly?.precipitation_probability?.[index] ?? null,
            wind: data?.hourly?.wind_speed_10m?.[index] ?? null,
            code: data?.hourly?.weather_code?.[index] ?? null,
          },
        });
      })
      .catch(() => {
        if (isCancelled) return;
        setWeatherState({ loading: false, data: null, error: "Weather could not be loaded." });
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("league-logo-mode", leagueLogoMode);
  }, [leagueLogoMode]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("expanded-schedule-weeks", JSON.stringify(expandedScheduleWeeks));
  }, [expandedScheduleWeeks]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        teams,
        players,
        schedule,
        rounds,
        announcements,
        leagueAlert,
        directoryEntries,
        substitutes,
        manualPointAdjustments,
        lockedWeeks,
        bylawsDocumentName,
        bylawsDocumentUrl,
      })
    );
    setLastUpdated(new Date().toLocaleString());
  }, [teams, players, schedule, rounds, announcements, leagueAlert, directoryEntries, substitutes, manualPointAdjustments, lockedWeeks, bylawsDocumentName, bylawsDocumentUrl]);

  const teamMap = React.useMemo(() => {
    return Object.fromEntries(teams.map((team) => [Number(team.number), team]));
  }, [teams]);

  const roundsByWeekAndPlayer = React.useMemo(() => {
    const map = {};
    rounds.forEach((round) => {
      if (!map[round.week]) map[round.week] = {};
      map[round.week][round.playerId] = round;
    });
    return map;
  }, [rounds]);

  const playersByEffectiveSlotForWeek = React.useMemo(() => {
    const map = {};
    const sortedWeeks = [...new Set(schedule.map((item) => Number(item.week)))].sort((a, b) => a - b);

    sortedWeeks.forEach((week) => {
      const periodStart = getLineupPeriodStart(week);
      const priorWeeks = sortedWeeks.filter((value) => value < periodStart);
      map[week] = {};

      teams.forEach((team) => {
        const teamNumber = Number(team.number);
        const teamPlayers = players
          .filter((player) => Number(player.teamNumber) === teamNumber)
          .map((player) => {
            const priorRounds = priorWeeks
              .map((priorWeek) => roundsByWeekAndPlayer[priorWeek]?.[player.id])
              .filter(Boolean);
            const average = priorRounds.length
              ? priorRounds.reduce((sum, round) => sum + Number(round.gross || 0), 0) / priorRounds.length
              : null;
            return {
              ...player,
              seasonAverage: average,
            };
          })
          .sort((a, b) => {
            const aAvg = a.seasonAverage;
            const bAvg = b.seasonAverage;
            if (aAvg === null && bAvg === null) return Number(a.lineupSlot) - Number(b.lineupSlot);
            if (aAvg === null) return 1;
            if (bAvg === null) return -1;
            if (aAvg !== bAvg) return aAvg - bAvg;
            return Number(a.lineupSlot) - Number(b.lineupSlot);
          });

        map[week][teamNumber] = {};
        teamPlayers.forEach((player, index) => {
          map[week][teamNumber][index + 1] = player;
        });
      });
    });

    return map;
  }, [schedule, teams, players, roundsByWeekAndPlayer]);

  const weeklyResultsList = React.useMemo(() => {
    return [...schedule]
      .sort((a, b) => a.week - b.week)
      .map((weekSchedule) => {
        const teamANumber = Number(weekSchedule.teamANumber);
        const teamBNumber = Number(weekSchedule.teamBNumber);
        const matches = [];
        let teamATotal = 0;
        let teamBTotal = 0;
        let teamAStrokeTotal = 0;
        let teamBStrokeTotal = 0;

        for (let slot = 1; slot <= 4; slot += 1) {
          const playerA = playersByEffectiveSlotForWeek[weekSchedule.week]?.[teamANumber]?.[slot] ?? null;
          const playerB = playersByEffectiveSlotForWeek[weekSchedule.week]?.[teamBNumber]?.[slot] ?? null;
          const roundA = playerA ? roundsByWeekAndPlayer[weekSchedule.week]?.[playerA.id] ?? null : null;
          const roundB = playerB ? roundsByWeekAndPlayer[weekSchedule.week]?.[playerB.id] ?? null : null;

          let strokePointsA = 0;
          let strokePointsB = 0;
          let matchPointsA = 0;
          let matchPointsB = 0;
          let holesWonA = 0;
          let holesWonB = 0;
          let status = "Pending";

          if (roundA && roundB) {
            status = "Complete";
            teamAStrokeTotal += roundA.gross;
            teamBStrokeTotal += roundB.gross;

            if (roundA.gross < roundB.gross) {
              strokePointsA = 1;
            } else if (roundB.gross < roundA.gross) {
              strokePointsB = 1;
            } else {
              strokePointsA = 0.5;
              strokePointsB = 0.5;
            }

            const holeResult = compareHoles(roundA.holes || [], roundB.holes || []);
            holesWonA = holeResult.playerAHolesWon;
            holesWonB = holeResult.playerBHolesWon;

            if (holesWonA > holesWonB) {
              matchPointsA = 1;
            } else if (holesWonB > holesWonA) {
              matchPointsB = 1;
            } else {
              matchPointsA = 0.5;
              matchPointsB = 0.5;
            }
          }

          const totalPointsA = strokePointsA + matchPointsA;
          const totalPointsB = strokePointsB + matchPointsB;
          teamATotal += totalPointsA;
          teamBTotal += totalPointsB;

          matches.push({
            matchupId: String(weekSchedule.week) + "-" + String(slot),
            lineupSlot: slot,
            status,
            playerA: {
              player: playerA,
              gross: roundA?.gross ?? null,
              holes: roundA?.holes ?? [],
              holesWon: holesWonA,
              strokePoints: strokePointsA,
              matchPoints: matchPointsA,
              totalPoints: totalPointsA,
            },
            playerB: {
              player: playerB,
              gross: roundB?.gross ?? null,
              holes: roundB?.holes ?? [],
              holesWon: holesWonB,
              strokePoints: strokePointsB,
              matchPoints: matchPointsB,
              totalPoints: totalPointsB,
            },
          });
        }

        let teamABonus = 0;
        let teamBBonus = 0;
        const completeMatchCount = matches.filter((match) => match.status === "Complete").length;

        if (completeMatchCount === 4) {
          if (teamAStrokeTotal < teamBStrokeTotal) {
            teamABonus = 1;
          } else if (teamBStrokeTotal < teamAStrokeTotal) {
            teamBBonus = 1;
          } else {
            teamABonus = 0.5;
            teamBBonus = 0.5;
          }
        }

        return {
          week: weekSchedule.week,
          date: weekSchedule.date,
          time: weekSchedule.time,
          course: weekSchedule.course,
          format: weekSchedule.format,
          lineupPeriodStart: getLineupPeriodStart(weekSchedule.week),
          teamA: teamMap[teamANumber] ?? { number: teamANumber, name: "Team " + String(teamANumber) },
          teamB: teamMap[teamBNumber] ?? { number: teamBNumber, name: "Team " + String(teamBNumber) },
          matches,
          teamATotal,
          teamBTotal,
          teamAStrokeTotal,
          teamBStrokeTotal,
          teamABonus,
          teamBBonus,
          teamAFinal: teamATotal + teamABonus,
          teamBFinal: teamBTotal + teamBBonus,
        };
      });
  }, [schedule, playersByEffectiveSlotForWeek, roundsByWeekAndPlayer, teamMap]);

  const teamStandings = React.useMemo(() => {
    const standingsByWeek = [];
    const standingsMap = Object.fromEntries(
      teams.map((team) => [Number(team.number), { team, weeksPlayed: 0, totalPoints: 0, bonusPoints: 0 }])
    );

    weeklyResultsList.forEach((week) => {
      const teamANumber = Number(week.teamA.number);
      const teamBNumber = Number(week.teamB.number);

      if (!standingsMap[teamANumber]) standingsMap[teamANumber] = { team: week.teamA, weeksPlayed: 0, totalPoints: 0, bonusPoints: 0 };
      if (!standingsMap[teamBNumber]) standingsMap[teamBNumber] = { team: week.teamB, weeksPlayed: 0, totalPoints: 0, bonusPoints: 0 };

      standingsMap[teamANumber].weeksPlayed += 1;
      standingsMap[teamBNumber].weeksPlayed += 1;
      standingsMap[teamANumber].totalPoints += week.teamAFinal;
      standingsMap[teamBNumber].totalPoints += week.teamBFinal;
      standingsMap[teamANumber].bonusPoints += week.teamABonus;
      standingsMap[teamBNumber].bonusPoints += week.teamBBonus;

      const snapshot = Object.values(standingsMap)
        .map((row) => ({ ...row }))
        .sort((a, b) => {
          if (b.adjustedTotalPoints !== a.adjustedTotalPoints) return b.adjustedTotalPoints - a.adjustedTotalPoints;
          if (b.bonusPoints !== a.bonusPoints) return b.bonusPoints - a.bonusPoints;
          return Number(a.team.number) - Number(b.team.number);
        })
        .map((row, index) => ({ ...row, rank: index + 1 }));
      standingsByWeek.push({ week: week.week, rows: snapshot });
    });

    const sorted = Object.values(standingsMap)
      .map((row) => {
        const adjustment = Number(manualPointAdjustments[row.team.number] ?? 0);
        const adjustedTotalPoints = row.totalPoints + adjustment;
        return {
          ...row,
          adjustment,
          adjustedTotalPoints,
          averagePoints: row.weeksPlayed ? (adjustedTotalPoints / row.weeksPlayed).toFixed(2) : "0.00",
        };
      })
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.bonusPoints !== a.bonusPoints) return b.bonusPoints - a.bonusPoints;
        return Number(a.team.number) - Number(b.team.number);
      })
      .map((row, index) => {
        const previousSnapshot = standingsByWeek.length > 1 ? standingsByWeek[standingsByWeek.length - 2].rows : [];
        const previousRank = previousSnapshot.find((item) => Number(item.team.number) === Number(row.team.number))?.rank ?? index + 1;
        const movement = previousRank > index + 1 ? "up" : previousRank < index + 1 ? "down" : "same";
        const colorStyle = TEAM_COLOR_STYLES[(Number(row.team.number) - 1) % TEAM_COLOR_STYLES.length];
        return { ...row, rank: index + 1, previousRank, movement, colorStyle };
      });

    const maxPoints = Math.max(...sorted.map((row) => row.adjustedTotalPoints), 1);
    return sorted.map((row) => ({
      ...row,
      barPercent: Math.max(8, (row.adjustedTotalPoints / maxPoints) * 100),
    }));
  }, [teams, weeklyResultsList, manualPointAdjustments]);

  const scoreEntryMatchupOptions = React.useMemo(() => {
    return weeklyResultsList
      .slice()
      .sort((a, b) => a.week - b.week || Number(a.teamA.number) - Number(b.teamA.number))
      .map((week) => ({
        key: `${week.week}-${week.teamA.number}-${week.teamB.number}`,
        label: `Week ${week.week} • Team ${week.teamA.number} vs Team ${week.teamB.number} • ${week.course}`,
      }));
  }, [weeklyResultsList]);

  const selectedWeekResult = React.useMemo(() => {
    if (!weeklyResultsList.length) return null;
    return (
      weeklyResultsList.find((week) => `${week.week}-${week.teamA.number}-${week.teamB.number}` === scoreEntryMatchupKey) ??
      weeklyResultsList.find((week) => Number(week.week) === Number(formData.week)) ??
      weeklyResultsList[0]
    );
  }, [weeklyResultsList, scoreEntryMatchupKey, formData.week]);

  const scoreEntryEligiblePlayers = React.useMemo(() => {
    if (!selectedWeekResult) return [];
    const eligibleTeams = [Number(selectedWeekResult.teamA.number), Number(selectedWeekResult.teamB.number)];
    return players
      .filter((player) => eligibleTeams.includes(Number(player.teamNumber)))
      .slice()
      .sort((a, b) => Number(a.teamNumber) - Number(b.teamNumber) || Number(a.lineupSlot) - Number(b.lineupSlot));
  }, [players, selectedWeekResult]);

  const selectedPlayer = React.useMemo(() => {
    return players.find((player) => player.id === Number(formData.playerId)) ?? null;
  }, [players, formData.playerId]);

  const selectedWeekLineups = React.useMemo(() => {
    if (!selectedWeekResult) return null;
    return {
      teamA: [1, 2, 3, 4].map((slot) => ({
        slot,
        player:
          playersByEffectiveSlotForWeek[selectedWeekResult.week]?.[
            Number(selectedWeekResult.teamA.number)
          ]?.[slot] ?? null,
      })),
      teamB: [1, 2, 3, 4].map((slot) => ({
        slot,
        player:
          playersByEffectiveSlotForWeek[selectedWeekResult.week]?.[
            Number(selectedWeekResult.teamB.number)
          ]?.[slot] ?? null,
      })),
    };
  }, [selectedWeekResult, playersByEffectiveSlotForWeek]);

  const latestWeek = weeklyResultsList[weeklyResultsList.length - 1] ?? null;

  const selectedResultsMatchup = React.useMemo(() => {
    if (!weeklyResultsList.length) return null;
    return weeklyResultsList.find((week) => `${week.week}-${week.teamA.number}-${week.teamB.number}` === selectedResultsMatchupKey) ?? latestWeek;
  }, [weeklyResultsList, selectedResultsMatchupKey, latestWeek]);

  const resultsMatchupOptions = React.useMemo(() => {
    return weeklyResultsList
      .slice()
      .sort((a, b) => a.week - b.week || Number(a.teamA.number) - Number(b.teamA.number))
      .map((week) => ({
        key: `${week.week}-${week.teamA.number}-${week.teamB.number}`,
        label: `Week ${week.week} • Team ${week.teamA.number} vs Team ${week.teamB.number} • ${week.course}`,
      }));
  }, [weeklyResultsList]);

  React.useEffect(() => {
    if (!latestWeek) return;
    const latestKey = `${latestWeek.week}-${latestWeek.teamA.number}-${latestWeek.teamB.number}`;
    setSelectedResultsMatchupKey((current) => current || latestKey);
  }, [latestWeek]);

  React.useEffect(() => {
    if (!scoreEntryMatchupOptions.length) return;
    const currentIsValid = scoreEntryMatchupOptions.some((option) => option.key === scoreEntryMatchupKey);
    if (currentIsValid) return;
    const preferredOption =
      scoreEntryMatchupOptions.find((option) => option.key.startsWith(`${formData.week}-`)) ?? scoreEntryMatchupOptions[0];
    setScoreEntryMatchupKey(preferredOption.key);
  }, [scoreEntryMatchupOptions, scoreEntryMatchupKey, formData.week]);

  React.useEffect(() => {
    if (!selectedWeekResult) return;
    setFormData((current) => {
      const nextWeek = String(selectedWeekResult.week);
      const playerStillValid = scoreEntryEligiblePlayers.some((player) => String(player.id) === String(current.playerId));
      const nextPlayerId = playerStillValid ? String(current.playerId) : String(scoreEntryEligiblePlayers[0]?.id ?? current.playerId);
      if (current.week === nextWeek && String(current.playerId) === nextPlayerId) return current;
      return {
        ...current,
        week: nextWeek,
        playerId: nextPlayerId,
        holes: Array(9).fill(""),
      };
    });
  }, [selectedWeekResult, scoreEntryEligiblePlayers]);

  const playerStats = React.useMemo(() => {
    return players
      .map((player) => {
        const playerRounds = rounds.filter((round) => round.playerId === player.id);
        const average = playerRounds.length
          ? playerRounds.reduce((sum, round) => sum + Number(round.gross || 0), 0) / playerRounds.length
          : null;
        let pointsWon = 0;
        let matchWins = 0;
        let matchLosses = 0;
        let matchTies = 0;

        weeklyResultsList.forEach((week) => {
          week.matches.forEach((match) => {
            const entry = match.playerA.player?.id === player.id ? match.playerA : match.playerB.player?.id === player.id ? match.playerB : null;
            const opponent = match.playerA.player?.id === player.id ? match.playerB : match.playerB.player?.id === player.id ? match.playerA : null;
            if (!entry || !opponent || entry.gross === null || opponent.gross === null) return;
            pointsWon += entry.totalPoints;
            if (entry.totalPoints > opponent.totalPoints) matchWins += 1;
            else if (entry.totalPoints < opponent.totalPoints) matchLosses += 1;
            else matchTies += 1;
          });
        });

        return {
          ...player,
          teamName: teamMap[Number(player.teamNumber)]?.name || `Team ${player.teamNumber}`,
          average,
          roundsPlayed: playerRounds.length,
          pointsWon,
          record: `${matchWins}-${matchLosses}-${matchTies}`,
        };
      })
      .sort((a, b) => {
        if ((a.average ?? Number.POSITIVE_INFINITY) !== (b.average ?? Number.POSITIVE_INFINITY)) {
          return (a.average ?? Number.POSITIVE_INFINITY) - (b.average ?? Number.POSITIVE_INFINITY);
        }
        return Number(a.teamNumber) - Number(b.teamNumber) || Number(a.lineupSlot) - Number(b.lineupSlot);
      });
  }, [players, rounds, weeklyResultsList, teamMap]);

  const lowScoresByPosition = React.useMemo(() => {
    return [1, 2, 3, 4].map((slot) => {
      const slotPlayers = playerStats
        .filter((player) => Number(player.lineupSlot) === slot && player.average !== null)
        .slice()
        .sort((a, b) => a.average - b.average || a.roundsPlayed - b.roundsPlayed)
        .slice(0, 5);
      return { slot, players: slotPlayers };
    });
  }, [playerStats]);

  const holeStatistics = React.useMemo(() => {
    return Object.entries(COURSE_HOLE_PARS).map(([courseName, pars]) => {
      const courseWeeks = schedule
        .filter((item) => item.course === courseName)
        .map((item) => Number(item.week));
      const courseWeekSet = new Set(courseWeeks);
      const courseRounds = rounds.filter((round) => courseWeekSet.has(Number(round.week)));

      const holes = pars.map((par, index) => {
        const holeNumber = index + 1;
        const scores = courseRounds
          .map((round) => Number(round.holes?.[index] || 0))
          .filter((score) => score > 0);
        const average = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;

        return {
          holeNumber,
          par,
          average,
          birdies: scores.filter((score) => score === par - 1).length,
          pars: scores.filter((score) => score === par).length,
          bogeys: scores.filter((score) => score === par + 1).length,
          doubleBogeysOrWorse: scores.filter((score) => score >= par + 2).length,
        };
      });

      const scoredHoles = holes.filter((hole) => hole.average !== null);
      const hardestHole = scoredHoles.length
        ? scoredHoles.reduce((hardest, hole) => (hardest.average > hole.average ? hardest : hole))
        : null;
      const easiestHole = scoredHoles.length
        ? scoredHoles.reduce((easiest, hole) => (easiest.average < hole.average ? easiest : hole))
        : null;

      return {
        courseName,
        holes,
        hardestHole,
        easiestHole,
      };
    });
  }, [rounds, schedule]);

  const leagueDirectory = React.useMemo(() => {
    return directoryEntries
      .slice()
      .sort((a, b) => Number(a.teamNumber) - Number(b.teamNumber) || Number(a.lineupSlot) - Number(b.lineupSlot) || a.name.localeCompare(b.name));
  }, [directoryEntries]);

  const announcementContacts = React.useMemo(() => {
    const directoryContacts = leagueDirectory.map((entry) => ({
      name: entry.name,
      phone: entry.phone,
      email: entry.email,
      source: `Team ${entry.teamNumber} • ${entry.lineupSlot} Man`,
    }));

    const substituteContacts = [1, 2, 3, 4].flatMap((slot) =>
      (substitutes[slot] ?? []).map((entry) => ({
        name: entry.name,
        phone: entry.phone,
        email: entry.email,
        source: `Substitute • ${slot} Man`,
      }))
    );

    const deduped = [];
    const seen = new Set();
    [...directoryContacts, ...substituteContacts].forEach((contact) => {
      const key = `${contact.email}|${contact.phone}|${contact.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(contact);
      }
    });
    return deduped;
  }, [leagueDirectory, substitutes]);

  const favoriteTeam = React.useMemo(() => {
    return teamMap[Number(favoriteTeamNumber)] ?? null;
  }, [teamMap, favoriteTeamNumber]);

  const favoriteTeamPlayers = React.useMemo(() => {
    return players
      .filter((player) => Number(player.teamNumber) === Number(favoriteTeamNumber))
      .map((player) => {
        const stats = playerStats.find((entry) => entry.id === player.id);
        return { ...player, average: stats?.average ?? null, pointsWon: stats?.pointsWon ?? 0, roundsPlayed: stats?.roundsPlayed ?? 0 };
      })
      .sort((a, b) => Number(a.lineupSlot) - Number(b.lineupSlot));
  }, [players, favoriteTeamNumber, playerStats]);

  const favoriteTeamLastMatch = React.useMemo(() => {
    return weeklyResultsList
      .filter((week) => Number(week.teamA.number) === Number(favoriteTeamNumber) || Number(week.teamB.number) === Number(favoriteTeamNumber))
      .sort((a, b) => b.week - a.week)[0] ?? null;
  }, [weeklyResultsList, favoriteTeamNumber]);

  const selectedPlayerProfile = React.useMemo(() => {
    if (!selectedPlayerProfileId) return null;
    const player = players.find((entry) => entry.id === selectedPlayerProfileId) ?? null;
    if (!player) return null;
    const stats = playerStats.find((entry) => entry.id === selectedPlayerProfileId) ?? null;
    const roundsList = rounds
      .filter((round) => round.playerId === selectedPlayerProfileId)
      .sort((a, b) => b.week - a.week)
      .slice(0, 5)
      .map((round) => ({
        ...round,
        course: schedule.find((item) => Number(item.week) === Number(round.week))?.course ?? "Course TBD",
      }));
    const bestRound = rounds
      .filter((round) => round.playerId === selectedPlayerProfileId)
      .reduce((best, round) => (!best || round.gross < best.gross ? round : best), null);
    return { player, stats, roundsList, bestRound };
  }, [selectedPlayerProfileId, players, playerStats, rounds, schedule]);

  const favoriteTeamStanding = React.useMemo(() => {
    return teamStandings.find((row) => Number(row.team.number) === Number(favoriteTeamNumber)) ?? null;
  }, [teamStandings, favoriteTeamNumber]);

  const favoriteTeamNextMatch = React.useMemo(() => {
    return schedule
      .slice()
      .sort((a, b) => a.week - b.week)
      .find((item) => Number(item.teamANumber) === Number(favoriteTeamNumber) || Number(item.teamBNumber) === Number(favoriteTeamNumber)) ?? null;
  }, [schedule, favoriteTeamNumber]);

  const nextWeekSchedule = React.useMemo(() => {
    const upcomingWeek = schedule.slice().sort((a, b) => a.week - b.week)[0]?.week ?? null;
    if (upcomingWeek === null) return { week: null, items: [] };
    return {
      week: upcomingWeek,
      items: schedule
        .filter((item) => Number(item.week) === Number(upcomingWeek))
        .sort((a, b) => a.teamANumber - b.teamANumber),
    };
  }, [schedule]);

  const weeklyLeaderboard = React.useMemo(() => {
    const week = latestWeek?.week ?? null;
    if (!week) return { week: null, groups: [] };
    return {
      week,
      groups: [1, 2, 3, 4].map((slot) => ({
        slot,
        entries: players
          .filter((player) => Number(player.lineupSlot) === slot)
          .map((player) => {
            const round = roundsByWeekAndPlayer[week]?.[player.id];
            const course = schedule.find((item) => Number(item.week) === Number(week))?.course ?? "League Night";
            return round ? { player, round: { ...round, course } } : null;
          })
          .filter(Boolean)
          .sort((a, b) => a.round.gross - b.round.gross || Number(a.player.teamNumber) - Number(b.player.teamNumber))
          .slice(0, 5),
      })),
    };
  }, [latestWeek, players, roundsByWeekAndPlayer]);

  const recentAnnouncement = announcements[announcements.length - 1] ?? null;

  const seasonLeaders = React.useMemo(() => {
    const lowestRound = rounds.length
      ? rounds.reduce((best, round) => (round.gross < best.gross ? round : best), rounds[0])
      : null;
    const mostPoints = playerStats.length
      ? playerStats.reduce((best, player) => (player.pointsWon > best.pointsWon ? player : best), playerStats[0])
      : null;
    const bestAverageList = playerStats.filter((player) => player.average !== null);
    const bestAverage = bestAverageList.length
      ? bestAverageList.reduce((best, player) => (player.average < best.average ? player : best), bestAverageList[0])
      : null;
    return { lowestRound, mostPoints, bestAverage };
  }, [rounds, playerStats]);

  const toggleScheduleWeek = (week) => {
    setExpandedScheduleWeeks((current) => ({ ...current, [week]: !current[week] }));
  };

  const getCourseBadgeClass = (course) => {
    return course === "C-Way"
      ? "bg-emerald-100 text-emerald-800"
      : "bg-sky-100 text-sky-800";
  };

  const getRankBadgeClass = (rank) => {
    if (rank === 1) return "bg-amber-100 text-amber-800 border-amber-200";
    if (rank === 2) return "bg-slate-100 text-slate-700 border-slate-200";
    if (rank === 3) return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-stone-100 text-stone-700 border-stone-200";
  };

  const getStandingBarClass = (rank) => {
    if (rank === 1) return "bg-gradient-to-r from-amber-400 to-amber-500";
    if (rank === 2) return "bg-gradient-to-r from-slate-400 to-slate-500";
    if (rank === 3) return "bg-gradient-to-r from-orange-400 to-orange-500";
    return "bg-gradient-to-r from-emerald-500 to-emerald-600";
  };

  const getMovementIndicator = (movement) => {
    if (movement === "up") return { symbol: "↑", label: "Up", className: "bg-emerald-100 text-emerald-800" };
    if (movement === "down") return { symbol: "↓", label: "Down", className: "bg-rose-100 text-rose-800" };
    return { symbol: "→", label: "Same", className: "bg-stone-100 text-stone-700" };
  };

  const getWeatherLabel = (code) => {
    if (code === 0) return "Clear";
    if ([1, 2, 3].includes(code)) return "Partly cloudy";
    if ([45, 48].includes(code)) return "Fog";
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "Rain";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
    if ([95, 96, 99].includes(code)) return "Storms";
    return "Forecast pending";
  };

  const handleDownloadLeagueBackup = () => {
    if (typeof window === "undefined") return;
    const backupPayload = {
      exportedAt: new Date().toISOString(),
      teams,
      players,
      schedule,
      rounds,
      announcements,
      directoryEntries,
      substitutes,
      bylawsDocumentName,
      bylawsDocumentUrl,
      favoriteTeamNumber,
    };
    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `wednesday-night-league-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    setAdminMessage("League backup downloaded.");
  };

  const buildWeeklyMatchSheetHtml = (week) => {
    const weekItems = schedule.filter((item) => Number(item.week) === Number(week)).sort((a, b) => a.teamANumber - b.teamANumber);
    return `<!DOCTYPE html>
      <html>
        <head>
          <title>Week ${week} Match Sheet</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #222; }
            h1,h2,h3,p { margin: 0; }
            .sheet { margin-top: 20px; }
            .card { border: 1px solid #bbb; border-radius: 12px; padding: 14px; margin-top: 14px; page-break-inside: avoid; }
            .meta { margin-top: 6px; color: #555; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #999; padding: 8px; font-size: 12px; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Wednesday Night League Weekly Match Sheet</h1>
          <p class="meta">Week ${week} • Pairings ${getWeeklyFoursomePattern(week)}</p>
          <div class="sheet">
            ${weekItems.map((item) => {
              const teamALineup = playersByEffectiveSlotForWeek[week]?.[Number(item.teamANumber)] ?? {};
              const teamBLineup = playersByEffectiveSlotForWeek[week]?.[Number(item.teamBNumber)] ?? {};
              return `<div class="card">
                <h3>Team ${item.teamANumber} vs Team ${item.teamBNumber}</h3>
                <p class="meta">${item.date} • ${item.time} • ${item.course}</p>
                <table>
                  <thead><tr><th>Slot</th><th>Team ${item.teamANumber}</th><th>Team ${item.teamBNumber}</th></tr></thead>
                  <tbody>
                    ${[1,2,3,4].map((slot) => `<tr><td>${slot}</td><td>${teamALineup[slot]?.name || "Open"}</td><td>${teamBLineup[slot]?.name || "Open"}</td></tr>`).join("")}
                  </tbody>
                </table>
              </div>`;
            }).join("")}
          </div>
        </body>
      </html>`;
  };

  const handlePrintWeeklyMatchSheet = (week) => {
    const printWindow = window.open("", "_blank", "width=1100,height=850");
    if (!printWindow) {
      setAdminMessage("Allow pop-ups to print match sheets.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(buildWeeklyMatchSheetHtml(week));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  const buildScorecardHtml = (matchup) => {
    const week = Number(matchup.week);
    const groups = getWeeklyFoursomeGroups(week);
    const teamAPlayers = playersByEffectiveSlotForWeek[week]?.[Number(matchup.teamANumber)] ?? {};
    const teamBPlayers = playersByEffectiveSlotForWeek[week]?.[Number(matchup.teamBNumber)] ?? {};

    const buildFoursomePage = (group, index) => {
      const rows = group.flatMap((slot) => {
        const teamAPlayer = teamAPlayers[slot];
        const teamBPlayer = teamBPlayers[slot];
        return [
          { label: `Team ${matchup.teamANumber} - ${teamAPlayer?.name || `Slot ${slot}`}` },
          { label: `Team ${matchup.teamBNumber} - ${teamBPlayer?.name || `Slot ${slot}`}` },
        ];
      });

      return `
        <section class="page ${index < groups.length - 1 ? "page-break" : ""}">
          <div class="header">
            <div class="logoRow">
              <div>
                <h1>Wednesday Night League</h1>
                <h2 style="margin-top: 6px;">Foursome Scorecard</h2>
                <p class="sub">Week ${week} - Foursome ${index + 1}</p>
                <p class="sub">Team ${matchup.teamANumber} vs Team ${matchup.teamBNumber}</p>
                <p class="sub">${matchup.date} • ${matchup.time} • ${matchup.course}</p>
                <p class="sub">Pairing Group: ${group.join("-")}</p>
              </div>
              <div class="logoBadge">WNL<br/>Golf</div>
            </div>
            <div class="metaGrid">
              <div class="metaCard"><div class="label">Course</div><div class="value">${matchup.course}</div></div>
              <div class="metaCard"><div class="label">Date</div><div class="value">${matchup.date}</div></div>
              <div class="metaCard"><div class="label">Time</div><div class="value">${matchup.time}</div></div>
              <div class="metaCard"><div class="label">Matchup</div><div class="value">${group[0]} vs ${group[0]} & ${group[1]} vs ${group[1]}</div></div>
            </div>
          </div>

          <div class="group">
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th><th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${rows
                  .map(
                    (row) => `
                      <tr>
                        <td class="player">${row.label}</td>
                        <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                      </tr>
                    `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>

          <div class="summaryGrid">
            <div class="summaryCard">
              <h3>Match Points</h3>
              <table class="summaryTable">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Stroke Pt</th>
                    <th>Match Pt</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows
                    .map(
                      (row) => `
                        <tr>
                          <td>${row.label}</td>
                          <td></td>
                          <td></td>
                          <td></td>
                        </tr>
                      `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
            <div class="summaryCard">
              <h3>Notes</h3>
              <table class="summaryTable">
                <tbody>
                  <tr><td>Winning Team in Foursome</td><td></td></tr>
                  <tr><td>Hole-by-hole notes</td><td style="height: 52px;"></td></tr>
                  <tr><td>Scorekeeper initials</td><td></td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="signatureGrid">
            <div class="signatureCard">
              <h3>Team ${matchup.teamANumber} Signature</h3>
              <div class="signatureLine">Player / Scorekeeper Signature</div>
            </div>
            <div class="signatureCard">
              <h3>Team ${matchup.teamBNumber} Signature</h3>
              <div class="signatureLine">Player / Scorekeeper Signature</div>
            </div>
          </div>
        </section>
      `;
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Week ${week} Foursome Scorecards</title>
          <style>
            body { font-family: Arial, sans-serif; color: #222; margin: 24px; }
            h1, h2, h3, p { margin: 0; }
            .page { page-break-inside: avoid; }
            .page-break { page-break-after: always; margin-bottom: 24px; }
            .header { margin-bottom: 18px; }
            .logoRow { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; border-bottom: 2px solid #1f6f54; padding-bottom: 14px; }
            .logoBadge { min-width: 92px; min-height: 92px; border-radius: 999px; border: 3px solid #1f6f54; display: flex; align-items: center; justify-content: center; color: #1f6f54; font-weight: 700; font-size: 12px; text-align: center; padding: 10px; }
            .sub { margin-top: 6px; color: #555; }
            .metaGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px; }
            .metaCard, .summaryCard, .signatureCard { border: 1px solid #a9b2ac; border-radius: 10px; padding: 10px 12px; }
            .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #666; }
            .value { margin-top: 4px; font-weight: 700; }
            .group { margin-top: 22px; page-break-inside: avoid; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #999; padding: 8px; text-align: center; font-size: 12px; }
            th:first-child, td.player { text-align: left; min-width: 220px; }
            .summaryGrid { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 14px; margin-top: 22px; page-break-inside: avoid; }
            .summaryTable td, .summaryTable th { padding: 10px; }
            .signatureGrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-top: 20px; page-break-inside: avoid; }
            .signatureLine { margin-top: 28px; border-top: 1px solid #666; padding-top: 6px; font-size: 12px; color: #555; }
            @media print { body { margin: 12px; } }
          </style>
        </head>
        <body>
          ${groups.map((group, index) => buildFoursomePage(group, index)).join("")}
        </body>
      </html>
    `;
  };

  const handlePrintScorecard = (matchup) => {
    if (typeof window === "undefined") return;
    const printWindow = window.open("", "_blank", "width=1100,height=850");
    if (!printWindow) {
      setAdminMessage("Allow pop-ups to print scorecards.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(buildScorecardHtml(matchup));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handlePrintWeekScorecards = (week) => {
    const weekMatchups = schedule
      .filter((item) => Number(item.week) === Number(week))
      .sort((a, b) => a.teamANumber - b.teamANumber);
    if (weekMatchups.length === 0) return;
    weekMatchups.forEach((matchup, index) => {
      setTimeout(() => handlePrintScorecard(matchup), index * 300);
    });
  };

  const scorePreview = React.useMemo(() => {
    const complete = formData.holes.every((value) => value !== "");
    const grossScore = complete ? sumScores(formData.holes) : 0;
    return { grossScore, complete };
  }, [formData]);

  const handlePlayerChange = (event) => {
    setFormData((current) => ({ ...current, playerId: event.target.value, holes: Array(9).fill("") }));
  };

  const handleHoleChange = (index, value) => {
    setFormData((current) => {
      const holes = [...current.holes];
      holes[index] = value;
      return { ...current, holes };
    });
  };

  const handleSubmitScore = () => {
    if (lockedWeeks.includes(Number(formData.week))) {
      setAdminMessage("This week is locked. Unlock it in the admin panel before saving scores.");
      return;
    }
    if (!scorePreview.complete) {
      setAdminMessage("Enter all 9 hole scores before saving.");
      return;
    }

    const playerId = Number(formData.playerId);
    const week = Number(formData.week);
    const holes = formData.holes.map((value) => Number(value || 0));
    const gross = sumScores(holes);

    setRounds((current) => {
      const filtered = current.filter((round) => !(round.playerId === playerId && round.week === week));
      return [...filtered, { id: Date.now(), week, playerId, holes, gross }].sort(
        (a, b) => a.week - b.week || a.playerId - b.playerId
      );
    });

    setFormData((current) => ({ ...current, holes: Array(9).fill("") }));
    setAdminMessage("9-hole score saved.");
  };

  const handleAddTeam = () => {
    const number = Number(newTeam.number);
    const name = newTeam.name.trim() || "Team " + String(number);
    if (!number) {
      setAdminMessage("Enter a team number.");
      return;
    }
    if (teams.some((team) => Number(team.number) === number)) {
      setAdminMessage("That team number already exists.");
      return;
    }
    setTeams((current) => [...current, { id: Date.now(), number, name }].sort(sortByNumber));
    setNewTeam({ number: "", name: "" });
    setAdminMessage("Team added.");
  };

  const handleAddPlayer = () => {
    const name = newPlayer.name.trim();
    const teamNumber = Number(newPlayer.teamNumber);
    const lineupSlot = Number(newPlayer.lineupSlot);

    if (!name || !teamNumber || !lineupSlot) {
      setAdminMessage("Enter player name, team number, and lineup slot.");
      return;
    }
    if (!teamMap[teamNumber]) {
      setAdminMessage("Add that team number first.");
      return;
    }
    if (
      players.some(
        (player) => Number(player.teamNumber) === teamNumber && Number(player.lineupSlot) === lineupSlot
      )
    ) {
      setAdminMessage("That lineup slot is already used for this team.");
      return;
    }

    setPlayers((current) => [...current, { id: Date.now(), name, teamNumber, lineupSlot }]);
    setNewPlayer({ name: "", teamNumber: "", lineupSlot: "1" });
    setAdminMessage("Player added.");
  };

  const handleAddScheduleWeek = () => {
    const week = Number(newScheduleWeek.week);
    const teamANumber = Number(newScheduleWeek.teamANumber);
    const teamBNumber = Number(newScheduleWeek.teamBNumber);
    const date = newScheduleWeek.date.trim();
    const time = newScheduleWeek.time.trim();
    const course = newScheduleWeek.course.trim();
    const format = newScheduleWeek.format.trim();

    if (!week || !teamANumber || !teamBNumber || !date || !time || !course || !format) {
      setAdminMessage("Fill out all schedule fields.");
      return;
    }
    if (teamANumber === teamBNumber) {
      setAdminMessage("A team cannot play itself.");
      return;
    }
    if (!teamMap[teamANumber] || !teamMap[teamBNumber]) {
      setAdminMessage("Both team numbers must exist first.");
      return;
    }
    if (schedule.some((item) => item.week === week && item.teamANumber === teamANumber && item.teamBNumber === teamBNumber)) {
      setAdminMessage("That team matchup already exists for this week.");
      return;
    }

    setSchedule((current) =>
      [
        ...current,
        { week, date, time, course, format, teamANumber, teamBNumber },
      ].sort((a, b) => a.week - b.week || a.teamANumber - b.teamANumber)
    );

    setNewScheduleWeek({
      week: String(week + 1),
      date: "",
      time: "5:30 PM",
      course: newScheduleWeek.course,
      format: "9-Hole Stroke + Match Play",
      teamANumber: newScheduleWeek.teamANumber,
      teamBNumber: newScheduleWeek.teamBNumber,
    });
    setAdminMessage("Team matchup added to schedule.");
  };

  const handleDeleteWeekResults = (weekToDelete) => {
    const weekNumber = Number(weekToDelete);
    setRounds((current) => current.filter((round) => Number(round.week) !== weekNumber));
    setLockedWeeks((current) => current.filter((week) => Number(week) !== weekNumber));
    setAdminMessage(`Deleted all score entries for Week ${weekNumber}.`);
  };

  const handleDeletePlayerRound = () => {
    const weekNumber = Number(deleteRoundForm.week);
    const playerId = Number(deleteRoundForm.playerId);
    const exists = rounds.some((round) => Number(round.week) === weekNumber && Number(round.playerId) === playerId);
    if (!exists) {
      setAdminMessage("No saved round found for that player and week.");
      return;
    }
    setRounds((current) => current.filter((round) => !(Number(round.week) === weekNumber && Number(round.playerId) === playerId)));
    setAdminMessage("Player round deleted.");
  };

  const handleResetSeasonOnly = () => {
    setRounds([]);
    setManualPointAdjustments({});
    setLockedWeeks([]);
    setAdminMessage("Season scores, standings, and locks were reset. Teams, players, and schedule were kept.");
  };

  const handleApplyManualAdjustment = () => {
    const teamNumber = Number(manualAdjustmentForm.teamNumber);
    const points = Number(manualAdjustmentForm.points);
    if (!teamNumber || Number.isNaN(points)) {
      setAdminMessage("Enter a valid team number and point adjustment.");
      return;
    }
    setManualPointAdjustments((current) => ({ ...current, [teamNumber]: points }));
    setAdminMessage(`Manual point adjustment saved for Team ${teamNumber}.`);
  };

  const handleToggleWeekLock = (weekNumber) => {
    const week = Number(weekNumber);
    const isLocked = lockedWeeks.includes(week);
    setLockedWeeks((current) => isLocked ? current.filter((value) => value !== week) : [...current, week].sort((a, b) => a - b));
    setAdminMessage(`Week ${week} ${isLocked ? "unlocked" : "locked"}.`);
  };

  const handleImportPlayersCsv = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || "").trim();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
        setAdminMessage("CSV must include a header row and at least one player row.");
        return;
      }
      const rows = lines.slice(1).map((line, index) => {
        const [name = "", teamNumber = "", lineupSlot = ""] = line.split(",").map((part) => part.trim());
        return {
          id: Date.now() + index,
          name,
          teamNumber: Number(teamNumber),
          lineupSlot: Number(lineupSlot),
        };
      });
      const validRows = rows.filter((row) => row.name && row.teamNumber && row.lineupSlot);
      if (!validRows.length) {
        setAdminMessage("No valid player rows were found in the CSV.");
        return;
      }
      setPlayers(validRows);
      setAdminMessage(`Imported ${validRows.length} players from CSV.`);
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleResetLeague = () => {
    setTeams(initialTeams);
    setPlayers(initialPlayers);
    setSchedule(initialSchedule);
    setRounds(initialRounds);
    setAnnouncements([]);
    setDirectoryEntries([]);
    setSubstitutes({ 1: [], 2: [], 3: [], 4: [] });
    setManualPointAdjustments({});
    setLockedWeeks([]);
    setBylawsDocumentName("league-bylaws.pdf");
    setBylawsDocumentUrl("/league-bylaws.pdf");
    setAdminAuthenticated(false);
    setAdminPasswordInput("");
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    setAdminMessage("League reset to starter data.");
  };

  const saveDirectoryEntry = (entry, resetEntry) => {
    const name = entry.name.trim();
    const teamNumber = Number(entry.teamNumber);
    const lineupSlot = Number(entry.lineupSlot);
    const phone = entry.phone.trim();
    const email = entry.email.trim();

    if (!name || !teamNumber || !lineupSlot || !phone || !email) {
      setAdminMessage("Enter directory name, team, position, phone number, and e-mail.");
      return;
    }

    setDirectoryEntries((current) => [
      ...current,
      { id: Date.now(), name, teamNumber, lineupSlot, phone, email },
    ]);
    resetEntry({ name: "", teamNumber: "", lineupSlot: "1", phone: "", email: "" });
    setAdminMessage("Directory entry added.");
  };

  const handleAddDirectoryEntry = () => {
    saveDirectoryEntry(newDirectoryEntry, setNewDirectoryEntry);
  };

  const handleAddDirectoryEntryFromDirectoryTab = () => {
    saveDirectoryEntry(directoryTabEntry, setDirectoryTabEntry);
  };

  const handleStartDirectoryEdit = (entry) => {
    setEditingDirectoryEntryId(entry.id);
    setEditingDirectoryEntry({
      name: entry.name,
      teamNumber: String(entry.teamNumber),
      lineupSlot: String(entry.lineupSlot),
      phone: entry.phone,
      email: entry.email,
    });
    setAdminMessage("Editing directory entry.");
  };

  const handleCancelDirectoryEdit = () => {
    setEditingDirectoryEntryId(null);
    setEditingDirectoryEntry({ name: "", teamNumber: "", lineupSlot: "1", phone: "", email: "" });
    setAdminMessage("Directory edit cancelled.");
  };

  const handleSaveDirectoryEdit = () => {
    const name = editingDirectoryEntry.name.trim();
    const teamNumber = Number(editingDirectoryEntry.teamNumber);
    const lineupSlot = Number(editingDirectoryEntry.lineupSlot);
    const phone = editingDirectoryEntry.phone.trim();
    const email = editingDirectoryEntry.email.trim();

    if (!editingDirectoryEntryId) {
      setAdminMessage("No directory entry selected for editing.");
      return;
    }
    if (!name || !teamNumber || !lineupSlot || !phone || !email) {
      setAdminMessage("Enter directory name, team, position, phone number, and e-mail.");
      return;
    }

    setDirectoryEntries((current) =>
      current.map((entry) =>
        entry.id === editingDirectoryEntryId
          ? { ...entry, name, teamNumber, lineupSlot, phone, email }
          : entry
      )
    );
    setEditingDirectoryEntryId(null);
    setEditingDirectoryEntry({ name: "", teamNumber: "", lineupSlot: "1", phone: "", email: "" });
    setAdminMessage("Directory entry updated.");
  };

  const handleDeleteDirectoryEntry = (entryId) => {
    setDirectoryEntries((current) => current.filter((entry) => entry.id !== entryId));
    if (editingDirectoryEntryId === entryId) {
      setEditingDirectoryEntryId(null);
      setEditingDirectoryEntry({ name: "", teamNumber: "", lineupSlot: "1", phone: "", email: "" });
    }
    setAdminMessage("Directory entry removed.");
  };

  const handleAddAnnouncement = () => {
    const text = newAnnouncement.trim();
    if (!text) {
      setAdminMessage("Enter announcement text first.");
      return;
    }
    setAnnouncements((current) => [...current, text]);
    setNewAnnouncement("");
    setAdminMessage("Announcement added.");
  };

  const handleDeleteAnnouncement = (indexToDelete) => {
    setAnnouncements((current) => current.filter((_, index) => index !== indexToDelete));
    setAdminMessage("Announcement deleted.");
  };

  const copyToClipboard = async (text, successMessage) => {
    try {
      await navigator.clipboard.writeText(text);
      setAdminMessage(successMessage);
    } catch {
      setAdminMessage("Clipboard copy failed. Copy the text manually.");
    }
  };

  const handleOpenAnnouncementEmail = () => {
    const emails = announcementContacts.map((contact) => contact.email).filter(Boolean);
    if (emails.length === 0) {
      setAdminMessage("No e-mail addresses found in the directory or substitutes list.");
      return;
    }
    const subject = encodeURIComponent(announcementDelivery.subject || "Wednesday Night League Update");
    const body = encodeURIComponent(announcementDelivery.message || "");
    window.location.href = `mailto:?bcc=${encodeURIComponent(emails.join(","))}&subject=${subject}&body=${body}`;
    setAdminMessage("Opened your e-mail app with a league announcement draft.");
  };

  const handleCopyAnnouncementEmails = () => {
    const emails = announcementContacts.map((contact) => contact.email).filter(Boolean).join(", ");
    if (!emails) {
      setAdminMessage("No e-mail addresses found in the directory or substitutes list.");
      return;
    }
    copyToClipboard(emails, "Copied announcement e-mail list.");
  };

  const handleCopyAnnouncementPhones = () => {
    const phones = announcementContacts.map((contact) => contact.phone).filter(Boolean).join(", ");
    if (!phones) {
      setAdminMessage("No phone numbers found in the directory or substitutes list.");
      return;
    }
    copyToClipboard(phones, "Copied announcement phone list.");
  };

  const handleCopyAnnouncementMessage = () => {
    if (!announcementDelivery.message.trim()) {
      setAdminMessage("Enter an announcement message first.");
      return;
    }
    copyToClipboard(announcementDelivery.message, "Copied text announcement message.");
  };

  const handleAddSubstitute = () => {
    const slot = Number(newSubstitute.slot);
    const name = newSubstitute.name.trim();
    const phone = newSubstitute.phone.trim();
    const email = newSubstitute.email.trim();

    if (!slot || !name || !phone || !email) {
      setAdminMessage("Enter substitute name, phone number, email, and position.");
      return;
    }

    setSubstitutes((current) => ({
      ...current,
      [slot]: [...(current[slot] ?? []), { id: Date.now(), name, phone, email }],
    }));
    setNewSubstitute({ slot: String(slot), name: "", phone: "", email: "" });
    setAdminMessage("Substitute added.");
  };

  const handleDeleteSubstitute = (slot, substituteId) => {
    setSubstitutes((current) => ({
      ...current,
      [slot]: (current[slot] ?? []).filter((substitute) => substitute.id !== substituteId),
    }));
    setAdminMessage("Substitute removed.");
  };

  const handleBylawsUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setAdminMessage("Please upload a PDF file for the bylaws.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setBylawsDocumentUrl(reader.result);
        setBylawsDocumentName(file.name);
        setAdminMessage("Bylaws document uploaded.");
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleRemoveBylawsUpload = () => {
    setBylawsDocumentName("league-bylaws.pdf");
    setBylawsDocumentUrl("/league-bylaws.pdf");
    setAdminMessage("Bylaws document reset to default file path.");
  };

  const handleGenerate18TeamSchedule = () => {
    const teamNumbers = teams
      .map((team) => Number(team.number))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);

    if (teamNumbers.length !== 18) {
      setAdminMessage("You need exactly 18 teams to generate the full round-robin template.");
      return;
    }

    const generatedSchedule = generateBalancedSeasonSchedule(teamNumbers, "2026-04-05", "5:30 PM");
    setSchedule(generatedSchedule);
    setAdminMessage(
      "18-team round-robin schedule generated. Each team plays every other team once, both teams in a matchup stay together on the same course, and each team's season course counts are balanced within plus or minus 1."
    );
  };

  const handleAdminLogin = () => {
    if (adminPasswordInput === ADMIN_PASSWORD) {
      setAdminAuthenticated(true);
      setAdminMessage("Admin access granted.");
      setAdminPasswordInput("");
      return;
    }
    setAdminAuthenticated(false);
    setAdminMessage("Incorrect admin password.");
  };

  const handleAnnouncementLogin = () => {
    if (announcementPasswordInput === ANNOUNCEMENT_PASSWORD) {
      setAnnouncementAuthenticated(true);
      setAdminMessage("Announcement manager access granted.");
      setAnnouncementPasswordInput("");
      return;
    }
    setAnnouncementAuthenticated(false);
    setAdminMessage("Incorrect announcement password.");
  };

  const handleAnnouncementLogout = () => {
    setAnnouncementAuthenticated(false);
    setAnnouncementPasswordInput("");
    setAdminMessage("Announcement manager access removed.");
  };

  const handleSaveLeagueAlert = () => {
    setLeagueAlert(leagueAlertInput.trim());
    setAdminMessage(leagueAlertInput.trim() ? "League alert updated." : "League alert cleared.");
  };

  const handleAdminLogout = () => {
    setAdminAuthenticated(false);
    setAdminOpen(false);
    setAdminPasswordInput("");
    setAdminMessage("Admin access removed.");
  };

  const handleScoreEntryLogin = () => {
    if (scoreEntryPasswordInput === SCORE_ENTRY_PASSWORD) {
      setScoreEntryAuthenticated(true);
      setScoreEntryMessage("Score entry unlocked.");
      setScoreEntryPasswordInput("");
      return;
    }
    setScoreEntryAuthenticated(false);
    setScoreEntryMessage("Incorrect score entry password.");
  };

  const handleScoreEntryLogout = () => {
    setScoreEntryAuthenticated(false);
    setScoreEntryPasswordInput("");
    setScoreEntryMessage("Score entry locked.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-stone-50 to-white text-stone-900">
      <header className="sticky top-0 z-30 border-b border-emerald-100 bg-white/90 shadow-sm backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-emerald-700 bg-emerald-50 text-center text-xs font-bold text-emerald-800 shadow-sm">
                {leagueLogoMode === "icon" ? <span>WNL<br />Golf</span> : <span className="text-2xl">⛳</span>}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">Golf League</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Wednesday Night League</h1>
                <div className="mt-3 flex flex-col items-center">
                  <p className="text-center text-xl font-semibold tracking-wide text-emerald-200">
                    League standings, schedule, results, score entry, and bylaws in one place.
                  </p>
                  <p className="mt-2 text-sm text-stone-500 text-center">
                    Last updated: {lastUpdated}
                  </p>
                  <div className="mt-4 w-96 border-t border-dashed border-emerald-400/40"></div>
                </div>
              </div>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              {[
                ["standings", "Standings"],
                ["schedule", "Schedule"],
                ["results", "Results"],
                ["score-entry", "Score Entry"],
                ["rules", "Bylaws"],
                ["teams", "Teams"],
                ["stats", "Player Stats"],
                ["directory", "Directory"],
                ["substitutes", "Substitutes"],
                ["admin", "Admin"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={
                    "rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all " +
                    (activeTab === key
                      ? "bg-emerald-700 text-white shadow-sm"
                      : "border border-white/10 bg-white text-stone-700 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main>
        {leagueAlert ? (
          <div className="border-b border-amber-400/30 bg-amber-500/15">
            <div className="mx-auto max-w-7xl px-4 py-3 text-center text-sm font-semibold text-amber-100 sm:px-6 lg:px-8">
              ⚠️ {leagueAlert}
            </div>
          </div>
        ) : null}
        {activeTab === "standings" ? (
          <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 border-b border-stone-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Standings</p>
                    <h3 className="mt-1 text-2xl font-bold">Team Leaderboard</h3>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
                    {teamStandings.length} teams tracked
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {teamStandings.map((row) => {
                    const movement = getMovementIndicator(row.movement);
                    return (
                    <div key={row.team.number} className={`rounded-3xl border border-white/10 border-l-8 ${row.colorStyle.accent} ${row.colorStyle.soft} p-4 shadow-sm`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-sm font-bold ${getRankBadgeClass(row.rank)}`}>
                            #{row.rank}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${row.colorStyle.pill}`}>
                                Team {row.team.number}
                              </span>
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${movement.className}`}>
                                {movement.symbol} {movement.label}
                              </span>
                              {row.rank <= 3 ? (
                                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
                                  {row.rank === 1 ? "League Leader" : row.rank === 2 ? "2nd Place" : "3rd Place"}
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-2 text-lg font-semibold text-stone-900">{row.team.name}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-sm sm:min-w-[280px]">
                          <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                            <div className="text-xs uppercase tracking-[0.15em] text-stone-500">Points</div>
                            <div className="mt-1 font-bold text-emerald-800">{row.adjustedTotalPoints.toFixed(1)}</div>
                          </div>
                          <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                            <div className="text-xs uppercase tracking-[0.15em] text-stone-500">Bonus</div>
                            <div className="mt-1 font-bold text-stone-900">{row.bonusPoints.toFixed(1)}</div>
                          </div>
                          <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                            <div className="text-xs uppercase tracking-[0.15em] text-stone-500">Adj</div>
                            <div className="mt-1 font-bold text-stone-900">{row.adjustment.toFixed(1)}</div>
                          </div>
                          <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                            <div className="text-xs uppercase tracking-[0.15em] text-stone-500">Avg / Week</div>
                            <div className="mt-1 font-bold text-stone-900">{row.averagePoints}</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs font-medium text-stone-500">
                          <span>Ranking Bar</span>
                          <span>{row.adjustedTotalPoints.toFixed(1)} pts</span>
                        </div>
                        <div className="mt-2 h-3 overflow-hidden rounded-full bg-white">
                          <div
                            className={`h-full rounded-full ${getStandingBarClass(row.rank)}`}
                            style={{ width: `${row.barPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )})}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-700 to-emerald-800 p-6 text-white shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100">My Team</p>
                      <h3 className="mt-1 text-2xl font-bold">{favoriteTeam ? favoriteTeam.name : "Choose a Team"}</h3>
                    </div>
                    <select
                      value={favoriteTeamNumber}
                      onChange={(event) => setFavoriteTeamNumber(event.target.value)}
                      className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
                    >
                      {teams.slice().sort(sortByNumber).map((team) => (
                        <option key={team.number} value={team.number} className="text-stone-900">{`Team ${team.number}`}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white/10 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-emerald-100">Standing</div>
                      <div className="mt-1 font-semibold">{favoriteTeamStanding ? `#${favoriteTeamStanding.rank} • ${favoriteTeamStanding.totalPoints.toFixed(1)} pts` : "TBD"}</div>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-emerald-100">Next Match</div>
                      <div className="mt-1 font-semibold">
                        {favoriteTeamNextMatch
                          ? `Week ${favoriteTeamNextMatch.week} • Team ${favoriteTeamNextMatch.teamANumber} vs Team ${favoriteTeamNextMatch.teamBNumber}`
                          : "No scheduled match"}
                      </div>
                      <div className="mt-1 text-sm text-emerald-100">{favoriteTeamNextMatch ? `${favoriteTeamNextMatch.course} • ${favoriteTeamNextMatch.date}` : ""}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Announcements</p>
                      <h3 className="mt-1 text-xl font-bold">League Updates</h3>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Latest</span>
                  </div>
                  <div className="mt-5 space-y-3">
                    {announcements.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-500">
                        No announcements posted.
                      </div>
                    ) : announcements.map((announcement, index) => (
                      <div key={announcement + index} className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-700 shadow-sm">
                        {announcement}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Next Week Matches</p>
                      <h3 className="mt-1 text-xl font-bold">Upcoming Matchups</h3>
                    </div>
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
                      {nextWeekSchedule.week ? `Week ${nextWeekSchedule.week}` : "No Week"}
                    </span>
                  </div>
                  <div className="mt-5 space-y-3">
                    {nextWeekSchedule.items.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-500">
                        No upcoming matchups loaded.
                      </div>
                    ) : nextWeekSchedule.items.slice(0, 6).map((item, index) => (
                      <div key={`${item.week}-${item.teamANumber}-${item.teamBNumber}-${index}`} className="rounded-2xl bg-stone-50 p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-semibold text-stone-900">{`Team ${item.teamANumber} vs Team ${item.teamBNumber}`}</div>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getCourseBadgeClass(item.course)}`}>{item.course}</span>
                        </div>
                        <div className="mt-2 text-sm text-stone-500">{`${item.date} • ${item.time} • Pairings ${getWeeklyFoursomePattern(item.week)}`}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Season Leaders</p>
                      <h3 className="mt-1 text-xl font-bold">Player Highlights</h3>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Auto Updated</span>
                  </div>
                  <div className="mt-5 grid gap-3">
                    <div className="rounded-2xl bg-stone-50 p-4">
                      <div className="text-xs uppercase tracking-[0.15em] text-stone-500">Lowest Round</div>
                      <div className="mt-1 font-semibold text-stone-900">{seasonLeaders.lowestRound ? `${players.find((player) => player.id === seasonLeaders.lowestRound.playerId)?.name || "Player"} • ${seasonLeaders.lowestRound.gross}` : "No scores yet"}</div>
                    </div>
                    <div className="rounded-2xl bg-stone-50 p-4">
                      <div className="text-xs uppercase tracking-[0.15em] text-stone-500">Most Points Won</div>
                      <div className="mt-1 font-semibold text-stone-900">{seasonLeaders.mostPoints ? `${seasonLeaders.mostPoints.name} • ${seasonLeaders.mostPoints.pointsWon.toFixed(1)} pts` : "No scores yet"}</div>
                    </div>
                    <div className="rounded-2xl bg-stone-50 p-4">
                      <div className="text-xs uppercase tracking-[0.15em] text-stone-500">Best Average</div>
                      <div className="mt-1 font-semibold text-stone-900">{seasonLeaders.bestAverage ? `${seasonLeaders.bestAverage.name} • ${seasonLeaders.bestAverage.average.toFixed(2)}` : "No scores yet"}</div>
                    </div>
                    <div className="rounded-2xl bg-stone-50 p-4">
                      <div className="text-xs uppercase tracking-[0.15em] text-stone-500">Latest Announcement</div>
                      <div className="mt-1 text-sm text-stone-700">{recentAnnouncement || "No announcement posted yet."}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">League Night Weather</p>
                      <h3 className="mt-1 text-xl font-bold">Wednesday Forecast</h3>
                    </div>
                    <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">Open-Meteo</span>
                  </div>
                  <div className="mt-5 rounded-2xl bg-stone-50 p-4 text-sm text-stone-700">
                    {weatherState.loading ? (
                      <div>Loading weather...</div>
                    ) : weatherState.error ? (
                      <div>{weatherState.error}</div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <div className="text-xs uppercase tracking-[0.15em] text-stone-500">Forecast</div>
                          <div className="mt-1 font-semibold text-stone-900">{getWeatherLabel(weatherState.data?.code)}</div>
                          <div className="text-stone-500">{weatherState.data?.date}</div>
                        </div>
                        <div className="grid gap-2 text-sm">
                          <div>{`Temp: ${weatherState.data?.temperature ?? "--"}°F`}</div>
                          <div>{`Wind: ${weatherState.data?.wind ?? "--"} mph`}</div>
                          <div>{`Rain Chance: ${weatherState.data?.precipitation ?? "--"}%`}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "score-entry" ? (
          <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Score entry</p>
                    <h3 className="mt-1 text-2xl font-bold">Submit 9-hole score</h3>
                  </div>
                  {scoreEntryAuthenticated ? (
                    <button
                      type="button"
                      onClick={handleScoreEntryLogout}
                      className="rounded-2xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700"
                    >
                      Lock Score Entry
                    </button>
                  ) : null}
                </div>

                {!scoreEntryAuthenticated ? (
                  <div className="mt-6 max-w-md rounded-3xl border border-white/10 bg-stone-50 p-5">
                    <label className="text-sm font-medium text-stone-700">
                      Score entry password
                      <input
                        type="password"
                        value={scoreEntryPasswordInput}
                        onChange={(event) => setScoreEntryPasswordInput(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-white/15 px-4 py-3"
                        placeholder="Enter score entry password"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleScoreEntryLogin}
                      className="mt-3 w-full rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white"
                    >
                      Unlock Score Entry
                    </button>
                    <p className="mt-3 text-xs text-stone-500">
                      Current demo password: <span className="font-semibold">scoreentry123</span>
                    </p>
                  </div>
                ) : null}

                {scoreEntryMessage ? (
                  <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
                    {scoreEntryMessage}
                  </div>
                ) : null}

                {scoreEntryAuthenticated ? (
                  <form className="mt-5 space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-sm font-medium text-stone-700">
                        Player
                        <select
                          value={formData.playerId}
                          onChange={handlePlayerChange}
                          className="mt-2 w-full rounded-2xl border border-white/15 px-4 py-3"
                        >
                          {scoreEntryEligiblePlayers.map((player) => (
                              <option key={player.id} value={player.id}>
                                {player.name + " | Team " + String(player.teamNumber) + " | Slot " + String(player.lineupSlot)}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label className="text-sm font-medium text-stone-700">
                        Matchup
                        <select
                          value={scoreEntryMatchupKey}
                          onChange={(event) => setScoreEntryMatchupKey(event.target.value)}
                          className="mt-2 w-full rounded-2xl border border-white/15 px-4 py-3"
                        >
                          {scoreEntryMatchupOptions.map((option) => (
                            <option key={option.key} value={option.key}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="rounded-3xl bg-stone-50 p-5 text-sm text-stone-700">
                      {selectedWeekResult ? (
                        <div>
                          <p className="font-semibold text-stone-900">
                            {"Week " + String(selectedWeekResult.week) + " | Team " + String(selectedWeekResult.teamA.number) + " vs Team " + String(selectedWeekResult.teamB.number)}
                          </p>
                          <p className="mt-1 text-stone-500">{selectedWeekResult.course + " | " + selectedWeekResult.date + " | " + selectedWeekResult.time}</p>
                          <p className="mt-1 text-stone-500">
                            {"Lineup block starts Week " + String(selectedWeekResult.lineupPeriodStart) + ". Slots auto-update every 3 weeks using season average up to that point."}
                          </p>
                          {selectedPlayer ? (
                            <p className="mt-2 text-stone-500">
                              {"Selected player: Team " + String(selectedPlayer.teamNumber) + ", seed slot " + String(selectedPlayer.lineupSlot)}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p>No schedule entry found for this week.</p>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {formData.holes.map((value, index) => (
                        <label key={index + 1} className="text-sm font-medium text-stone-700">
                          {"Hole " + String(index + 1)}
                          <input
                            type="number"
                            value={value}
                            onChange={(event) => handleHoleChange(index, event.target.value)}
                            className="mt-2 w-full rounded-2xl border border-white/15 px-4 py-3"
                          />
                        </label>
                      ))}
                    </div>

                    <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
                      Calculated 9-hole stroke score: <span className="font-semibold">{scorePreview.grossScore}</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleSubmitScore}
                      className="w-full rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white"
                    >
                      Save 9-Hole Scorecard
                    </button>
                  </form>
                ) : null}
              </div>

              <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Active lineup</p>
                <h3 className="mt-1 text-2xl font-bold">This week’s slots</h3>
                {selectedWeekLineups ? (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-3xl bg-stone-50 p-4">
                      <p className="font-semibold text-stone-900">{"Team " + String(selectedWeekResult?.teamA.number) + " lineup"}</p>
                      <div className="mt-3 space-y-2 text-sm text-stone-600">
                        {selectedWeekLineups.teamA.map((entry) => (
                          <div key={entry.slot} className="flex items-center justify-between rounded-2xl bg-white px-3 py-2">
                            <span>{"Slot " + String(entry.slot)}</span>
                            <span className="font-medium text-stone-900">{entry.player?.name || "Open"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-3xl bg-stone-50 p-4">
                      <p className="font-semibold text-stone-900">{"Team " + String(selectedWeekResult?.teamB.number) + " lineup"}</p>
                      <div className="mt-3 space-y-2 text-sm text-stone-600">
                        {selectedWeekLineups.teamB.map((entry) => (
                          <div key={entry.slot} className="flex items-center justify-between rounded-2xl bg-white px-3 py-2">
                            <span>{"Slot " + String(entry.slot)}</span>
                            <span className="font-medium text-stone-900">{entry.player?.name || "Open"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl bg-stone-50 p-4 text-sm text-stone-500">Choose a week to view active lineups.</div>
                )}
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "schedule" ? (
          <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Schedule</p>
                  <h3 className="mt-1 text-2xl font-bold">League Schedule</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="rounded-2xl bg-stone-50 px-4 py-2 text-sm text-stone-600">
                    Weekly foursome rotation shown in Pairings
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const firstWeek = [...new Set(schedule.map((item) => item.week))].sort((a, b) => a - b)[0];
                      handlePrintWeekScorecards(firstWeek);
                    }}
                    className="rounded-2xl border border-white/15 bg-white px-4 py-2 text-sm font-semibold text-stone-700"
                  >
                    Print First Week Scorecards
                  </button>
                </div>
              </div>
              <div className="mt-6 space-y-5">
                {[...new Set(schedule.map((item) => item.week))]
                  .sort((a, b) => a - b)
                  .map((week) => {
                    const weekItems = schedule
                      .filter((item) => item.week === week)
                      .sort((a, b) => a.teamANumber - b.teamANumber);
                    const first = weekItems[0];
                    const isExpanded = !!expandedScheduleWeeks[week];
                    return (
                      <div key={week} className="rounded-3xl border border-stone-200 p-5">
                        <button
                          type="button"
                          onClick={() => toggleScheduleWeek(week)}
                          className="flex w-full flex-col gap-2 border-b border-stone-100 pb-4 text-left sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="text-lg font-bold text-stone-900">{`Week ${week}`}</p>
                            <p className="text-sm text-stone-500">{first?.date}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handlePrintWeekScorecards(week);
                              }}
                              className="rounded-full border border-white/15 bg-white px-3 py-1 text-xs font-semibold text-stone-700"
                            >
                              Print Scorecards
                            </button>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getCourseBadgeClass(first?.course)}`}>
                              {first?.course}
                            </span>
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                              Pairings {getWeeklyFoursomePattern(week)}
                            </span>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handlePrintWeeklyMatchSheet(week);
                              }}
                              className="rounded-full border border-white/15 bg-white px-3 py-1 text-xs font-semibold text-stone-700"
                            >
                              Match Sheet
                            </button>
                            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
                              {isExpanded ? "Hide" : "Show"}
                            </span>
                          </div>
                        </button>
                        {isExpanded ? (
                          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {weekItems.map((item, index) => (
                              <div key={`${item.week}-${item.teamANumber}-${item.teamBNumber}-${index}`} className="rounded-2xl bg-stone-50 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <span className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${getCourseBadgeClass(item.course)}`}>{item.course}</span>
                                  <span className="text-xs text-stone-500">{item.time}</span>
                                </div>
                                <p className="mt-3 font-semibold text-stone-900">{`Team ${item.teamANumber} vs Team ${item.teamBNumber}`}</p>
                                <p className="mt-2 text-sm text-stone-500">{`Pairings: ${getWeeklyFoursomePattern(item.week)}`}</p>
                                <button
                                  type="button"
                                  onClick={() => handlePrintScorecard(item)}
                                  className="mt-3 rounded-2xl border border-white/15 bg-white px-3 py-2 text-xs font-semibold text-stone-700"
                                >
                                  Print Scorecard
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "teams" ? (
          <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="space-y-6">
              <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Team Pages</p>
                    <h3 className="mt-1 text-2xl font-bold">Team Rosters & Stats</h3>
                  </div>
                  <select
                    value={favoriteTeamNumber}
                    onChange={(event) => setFavoriteTeamNumber(event.target.value)}
                    className="rounded-2xl border border-white/15 px-4 py-2 text-sm text-stone-700"
                  >
                    {teams.slice().sort(sortByNumber).map((team) => (
                      <option key={team.number} value={team.number}>{`${team.name} (${team.number})`}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-6">
                  <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Selected team</p>
                    <h3 className="mt-1 text-2xl font-bold">{favoriteTeam?.name || `Team ${favoriteTeamNumber}`}</h3>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-stone-50 p-4">
                        <div className="text-xs uppercase tracking-[0.15em] text-stone-500">Standing</div>
                        <div className="mt-1 font-semibold text-stone-900">{favoriteTeamStanding ? `#${favoriteTeamStanding.rank}` : "-"}</div>
                      </div>
                      <div className="rounded-2xl bg-stone-50 p-4">
                        <div className="text-xs uppercase tracking-[0.15em] text-stone-500">Season Points</div>
                        <div className="mt-1 font-semibold text-stone-900">{favoriteTeamStanding ? favoriteTeamStanding.adjustedTotalPoints.toFixed(1) : "0.0"}</div>
                      </div>
                      <div className="rounded-2xl bg-stone-50 p-4">
                        <div className="text-xs uppercase tracking-[0.15em] text-stone-500">Upcoming Match</div>
                        <div className="mt-1 font-semibold text-stone-900">{favoriteTeamNextMatch ? `Week ${favoriteTeamNextMatch.week} vs Team ${Number(favoriteTeamNextMatch.teamANumber) === Number(favoriteTeamNumber) ? favoriteTeamNextMatch.teamBNumber : favoriteTeamNextMatch.teamANumber}` : "No scheduled match"}</div>
                        <div className="text-sm text-stone-500">{favoriteTeamNextMatch ? `${favoriteTeamNextMatch.course} • ${favoriteTeamNextMatch.date}` : ""}</div>
                      </div>
                      <div className="rounded-2xl bg-stone-50 p-4">
                        <div className="text-xs uppercase tracking-[0.15em] text-stone-500">Last Match</div>
                        <div className="mt-1 font-semibold text-stone-900">{favoriteTeamLastMatch ? `Week ${favoriteTeamLastMatch.week} • ${Number(favoriteTeamLastMatch.teamA.number) === Number(favoriteTeamNumber) ? favoriteTeamLastMatch.teamAFinal.toFixed(1) : favoriteTeamLastMatch.teamBFinal.toFixed(1)} pts` : "No results yet"}</div>
                        <div className="text-sm text-stone-500">{favoriteTeamLastMatch ? `${favoriteTeamLastMatch.course} • ${favoriteTeamLastMatch.date}` : ""}</div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Roster</p>
                    <h3 className="mt-1 text-2xl font-bold">Players</h3>
                    <div className="mt-5 space-y-3">
                      {favoriteTeamPlayers.length === 0 ? (
                        <div className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-500">No players added for this team yet.</div>
                      ) : favoriteTeamPlayers.map((player) => (
                        <button key={player.id} type="button" onClick={() => setSelectedPlayerProfileId(player.id)} className={`flex w-full items-center justify-between rounded-2xl p-4 text-left ${selectedPlayerProfileId === player.id ? "bg-emerald-50 ring-2 ring-emerald-200" : "bg-stone-50"}`}>
                          <div>
                            <div className="font-semibold text-stone-900">{player.name}</div>
                            <div className="text-sm text-stone-500">{`Seed slot ${player.lineupSlot}`}</div>
                          </div>
                          <div className="text-right text-sm">
                            <div className="font-semibold text-emerald-800">{player.average !== null ? player.average.toFixed(2) : "—"}</div>
                            <div className="text-stone-500">Average</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Player Profile</p>
                  <h3 className="mt-1 text-2xl font-bold">{selectedPlayerProfile?.player.name || "Select a Player"}</h3>
                  {selectedPlayerProfile ? (
                    <div className="mt-5 space-y-5">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-stone-50 p-4">
                          <div className="text-xs uppercase tracking-[0.15em] text-stone-500">Season Average</div>
                          <div className="mt-1 font-semibold text-stone-900">{selectedPlayerProfile.stats?.average !== null ? selectedPlayerProfile.stats?.average.toFixed(2) : "—"}</div>
                        </div>
                        <div className="rounded-2xl bg-stone-50 p-4">
                          <div className="text-xs uppercase tracking-[0.15em] text-stone-500">Points Won</div>
                          <div className="mt-1 font-semibold text-stone-900">{selectedPlayerProfile.stats?.pointsWon?.toFixed(1) ?? "0.0"}</div>
                        </div>
                        <div className="rounded-2xl bg-stone-50 p-4">
                          <div className="text-xs uppercase tracking-[0.15em] text-stone-500">Matches Played</div>
                          <div className="mt-1 font-semibold text-stone-900">{selectedPlayerProfile.stats?.roundsPlayed ?? 0}</div>
                        </div>
                        <div className="rounded-2xl bg-stone-50 p-4">
                          <div className="text-xs uppercase tracking-[0.15em] text-stone-500">Best Round</div>
                          <div className="mt-1 font-semibold text-stone-900">{selectedPlayerProfile.bestRound ? selectedPlayerProfile.bestRound.gross : "—"}</div>
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold text-stone-900">Recent Rounds</p>
                        <div className="mt-3 overflow-hidden rounded-3xl border border-white/10">
                          <table className="min-w-full text-left text-sm">
                            <thead className="bg-stone-100 text-stone-600">
                              <tr>
                                <th className="px-4 py-3 font-semibold">Week</th>
                                <th className="px-4 py-3 font-semibold">Course</th>
                                <th className="px-4 py-3 font-semibold">Score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedPlayerProfile.roundsList.length === 0 ? (
                                <tr><td colSpan={3} className="px-4 py-4 text-stone-500">No rounds yet.</td></tr>
                              ) : selectedPlayerProfile.roundsList.map((round) => (
                                <tr key={round.id} className="border-t border-stone-200">
                                  <td className="px-4 py-3">{round.week}</td>
                                  <td className="px-4 py-3">{round.course}</td>
                                  <td className="px-4 py-3 font-semibold text-emerald-800">{round.gross}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl bg-stone-50 p-4 text-sm text-stone-500">Choose a player from the roster to view their season profile.</div>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "stats" ? (
          <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">
            <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Player Stats</p>
                  <h3 className="mt-1 text-2xl font-bold">Season Averages & Records</h3>
                </div>
                <div className="rounded-2xl bg-stone-50 px-4 py-2 text-sm text-stone-600">
                  Lower average ranks higher
                </div>
              </div>
              <div className="mt-5 overflow-hidden rounded-3xl border border-white/10">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-stone-100 text-stone-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Player</th>
                      <th className="px-4 py-3 font-semibold">Team</th>
                      <th className="px-4 py-3 font-semibold">Avg</th>
                      <th className="px-4 py-3 font-semibold">Rounds</th>
                      <th className="px-4 py-3 font-semibold">Points Won</th>
                      <th className="px-4 py-3 font-semibold">Record</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerStats.map((player) => (
                      <tr key={player.id} className="border-t border-stone-200">
                        <td className="px-4 py-3 font-medium text-stone-900">{player.name}</td>
                        <td className="px-4 py-3">{`Team ${player.teamNumber}`}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-800">{player.average !== null ? player.average.toFixed(2) : "—"}</td>
                        <td className="px-4 py-3">{player.roundsPlayed}</td>
                        <td className="px-4 py-3">{player.pointsWon.toFixed(1)}</td>
                        <td className="px-4 py-3">{player.record}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Weekly Leaderboard</p>
                <h3 className="mt-1 text-2xl font-bold">Low Scores by Position</h3>
                <div className="mt-2 text-sm text-stone-500">{weeklyLeaderboard.week ? `Week ${weeklyLeaderboard.week}` : "No scores yet"}</div>
                <div className="mt-5 space-y-4">
                  {weeklyLeaderboard.groups.map((group) => (
                    <div key={group.slot} className="rounded-3xl bg-stone-50 p-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-stone-900">{`${group.slot} Men`}</h4>
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Top 5</span>
                      </div>
                      <div className="mt-3 space-y-2 text-sm">
                        {group.entries.length === 0 ? (
                          <div className="rounded-2xl bg-white p-3 text-stone-500">No scores available yet.</div>
                        ) : group.entries.map((entry, index) => (
                          <div key={entry.player.id} className="flex items-center justify-between rounded-2xl bg-white p-3">
                            <div>
                              <div className="font-medium text-stone-900">{`${index + 1}. ${entry.player.name}`}</div>
                              <div className="text-stone-500">{`Team ${entry.player.teamNumber} • ${entry.round.course || "League Night"}`}</div>
                            </div>
                            <div className="font-semibold text-emerald-800">{entry.round.gross}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Hole Stats</p>
                <h3 className="mt-1 text-2xl font-bold">Hole-by-Hole Statistics by Course</h3>
                <div className="mt-5 space-y-6">
                  {holeStatistics.map((courseStats) => (
                    <div key={courseStats.courseName} className="rounded-3xl border border-stone-200 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h4 className="text-lg font-semibold text-stone-900">{courseStats.courseName}</h4>
                          <p className="text-sm text-stone-500">Actual par values are used for birdies, pars, bogeys, and doubles.</p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-rose-100 px-3 py-1 font-semibold text-rose-800">
                            {courseStats.hardestHole ? `Hardest: Hole ${courseStats.hardestHole.holeNumber} (${courseStats.hardestHole.average.toFixed(2)})` : "Hardest: N/A"}
                          </span>
                          <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-800">
                            {courseStats.easiestHole ? `Easiest: Hole ${courseStats.easiestHole.holeNumber} (${courseStats.easiestHole.average.toFixed(2)})` : "Easiest: N/A"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 overflow-hidden rounded-3xl border border-white/10">
                        <table className="min-w-full text-left text-sm">
                          <thead className="bg-stone-100 text-stone-600">
                            <tr>
                              <th className="px-4 py-3 font-semibold">Hole</th>
                              <th className="px-4 py-3 font-semibold">Par</th>
                              <th className="px-4 py-3 font-semibold">Avg</th>
                              <th className="px-4 py-3 font-semibold">Birdies</th>
                              <th className="px-4 py-3 font-semibold">Pars</th>
                              <th className="px-4 py-3 font-semibold">Bogeys</th>
                              <th className="px-4 py-3 font-semibold">Double+</th>
                            </tr>
                          </thead>
                          <tbody>
                            {courseStats.holes.map((hole) => (
                              <tr key={`${courseStats.courseName}-${hole.holeNumber}`} className="border-t border-stone-200">
                                <td className="px-4 py-3 font-medium text-stone-900">{hole.holeNumber}</td>
                                <td className="px-4 py-3">{hole.par}</td>
                                <td className="px-4 py-3 font-semibold text-emerald-800">{hole.average !== null ? hole.average.toFixed(2) : "—"}</td>
                                <td className="px-4 py-3">{hole.birdies}</td>
                                <td className="px-4 py-3">{hole.pars}</td>
                                <td className="px-4 py-3">{hole.bogeys}</td>
                                <td className="px-4 py-3">{hole.doubleBogeysOrWorse}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "directory" ? (
          <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="space-y-6">
              <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">League Directory</p>
                    <h3 className="mt-1 text-2xl font-bold">Player Contact Directory</h3>
                  </div>
                  <div className="rounded-2xl bg-stone-50 px-4 py-2 text-sm text-stone-600">
                    Team, position, phone, and e-mail
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Directory Entry</p>
                    <h3 className="mt-1 text-xl font-bold">Add or update contacts</h3>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                    {adminAuthenticated ? "Admin unlocked" : "View only"}
                  </span>
                </div>

                {adminAuthenticated ? (
                  <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-3 text-sm text-stone-700">
                      <input
                        type="text"
                        placeholder="Name"
                        value={directoryTabEntry.name}
                        onChange={(event) => setDirectoryTabEntry((current) => ({ ...current, name: event.target.value }))}
                        className="w-full rounded-2xl border border-white/15 px-4 py-3"
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <select
                          value={directoryTabEntry.teamNumber}
                          onChange={(event) => setDirectoryTabEntry((current) => ({ ...current, teamNumber: event.target.value }))}
                          className="w-full rounded-2xl border border-white/15 px-4 py-3"
                        >
                          <option value="">Select team</option>
                          {teams.slice().sort(sortByNumber).map((team) => (
                            <option key={team.number} value={team.number}>{`Team ${team.number}`}</option>
                          ))}
                        </select>
                        <select
                          value={directoryTabEntry.lineupSlot}
                          onChange={(event) => setDirectoryTabEntry((current) => ({ ...current, lineupSlot: event.target.value }))}
                          className="w-full rounded-2xl border border-white/15 px-4 py-3"
                        >
                          {[1, 2, 3, 4].map((slot) => (
                            <option key={slot} value={slot}>{`${slot} Man`}</option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="text"
                        placeholder="Phone number"
                        value={directoryTabEntry.phone}
                        onChange={(event) => setDirectoryTabEntry((current) => ({ ...current, phone: event.target.value }))}
                        className="w-full rounded-2xl border border-white/15 px-4 py-3"
                      />
                      <input
                        type="email"
                        placeholder="E-mail"
                        value={directoryTabEntry.email}
                        onChange={(event) => setDirectoryTabEntry((current) => ({ ...current, email: event.target.value }))}
                        className="w-full rounded-2xl border border-white/15 px-4 py-3"
                      />
                      <button type="button" onClick={handleAddDirectoryEntryFromDirectoryTab} className="w-full rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white">
                        Add Directory Entry
                      </button>
                    </div>
                    <div className="rounded-3xl bg-stone-50 p-4 text-sm text-stone-600">
                      <p className="font-semibold text-stone-900">How this works</p>
                      <div className="mt-3 space-y-2">
                        <p>Use this form to add contacts directly from the Directory tab.</p>
                        <p>All five fields must be filled in before the entry will save.</p>
                        <p>Entries added here appear immediately in the table below and in the Admin preview.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-3xl bg-stone-50 p-4 text-sm text-stone-600">
                    The Directory tab is view-only unless the Admin panel is unlocked. To add contacts, unlock Admin first, then return here.
                  </div>
                )}

                {adminMessage ? (
                  <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
                    {adminMessage}
                  </div>
                ) : null}
              </div>

              <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
                <div className="mt-5 overflow-hidden rounded-3xl border border-white/10">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-stone-100 text-stone-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Team</th>
                      <th className="px-4 py-3 font-semibold">Position</th>
                      <th className="px-4 py-3 font-semibold">Phone</th>
                      <th className="px-4 py-3 font-semibold">E-mail</th>
                      <th className="px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leagueDirectory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 text-stone-500">No directory entries yet.</td>
                      </tr>
                    ) : leagueDirectory.map((entry) => (
                      <tr key={entry.id} className="border-t border-stone-200 align-top">
                        {editingDirectoryEntryId === entry.id ? (
                          <>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={editingDirectoryEntry.name}
                                onChange={(event) => setEditingDirectoryEntry((current) => ({ ...current, name: event.target.value }))}
                                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={editingDirectoryEntry.teamNumber}
                                onChange={(event) => setEditingDirectoryEntry((current) => ({ ...current, teamNumber: event.target.value }))}
                                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                              >
                                <option value="">Select team</option>
                                {teams.slice().sort(sortByNumber).map((team) => (
                                  <option key={team.number} value={team.number}>{`Team ${team.number}`}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={editingDirectoryEntry.lineupSlot}
                                onChange={(event) => setEditingDirectoryEntry((current) => ({ ...current, lineupSlot: event.target.value }))}
                                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                              >
                                {[1, 2, 3, 4].map((slot) => (
                                  <option key={slot} value={slot}>{`${slot} Man`}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={editingDirectoryEntry.phone}
                                onChange={(event) => setEditingDirectoryEntry((current) => ({ ...current, phone: event.target.value }))}
                                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="email"
                                value={editingDirectoryEntry.email}
                                onChange={(event) => setEditingDirectoryEntry((current) => ({ ...current, email: event.target.value }))}
                                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-2 sm:flex-row">
                                <button
                                  type="button"
                                  onClick={handleSaveDirectoryEdit}
                                  className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelDirectoryEdit}
                                  className="rounded-xl border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 font-medium text-stone-900">{entry.name}</td>
                            <td className="px-4 py-3">{`Team ${entry.teamNumber}`}</td>
                            <td className="px-4 py-3">{`${entry.lineupSlot} Man`}</td>
                            <td className="px-4 py-3">{entry.phone}</td>
                            <td className="px-4 py-3">{entry.email}</td>
                            <td className="px-4 py-3">
                              {adminAuthenticated ? (
                                <div className="flex flex-col gap-2 sm:flex-row">
                                  <button
                                    type="button"
                                    onClick={() => handleStartDirectoryEdit(entry)}
                                    className="rounded-xl border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-700"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDirectoryEntry(entry.id)}
                                    className="rounded-xl border border-red-300 px-3 py-2 text-xs font-semibold text-red-700"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-stone-400">Admin only</span>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
            </div>
          </div>
        </section>
        ) : null}

        {activeTab === "substitutes" ? (
          <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Substitutes</p>
                  <h3 className="mt-1 text-2xl font-bold">Substitute List by Position</h3>
                </div>
                <div className="rounded-2xl bg-stone-50 px-4 py-2 text-sm text-stone-600">
                  1 men, 2 men, 3 men, and 4 men
                </div>
              </div>
              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                {[1, 2, 3, 4].map((slot) => (
                  <div key={slot} className="rounded-3xl border border-stone-200 p-5">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                      <h4 className="text-lg font-semibold text-stone-900">{`${slot} Men`}</h4>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">{(substitutes[slot] ?? []).length} listed</span>
                    </div>
                    <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-stone-100 text-stone-600">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Name</th>
                            <th className="px-4 py-3 font-semibold">Phone</th>
                            <th className="px-4 py-3 font-semibold">E-mail</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(substitutes[slot] ?? []).length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-4 py-4 text-stone-500">No substitutes listed.</td>
                            </tr>
                          ) : (
                            (substitutes[slot] ?? []).map((substitute) => (
                              <tr key={substitute.id} className="border-t border-stone-200">
                                <td className="px-4 py-3 font-medium text-stone-900">{substitute.name}</td>
                                <td className="px-4 py-3">{substitute.phone}</td>
                                <td className="px-4 py-3">{substitute.email}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "results" ? (
          <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-700 to-emerald-800 p-6 text-white shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100">Results</p>
                    <h3 className="mt-1 text-2xl font-bold">Team-vs-team results</h3>
                  </div>
                  <div className="w-full max-w-md">
                    <label className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-100">
                      Select Matchup
                    </label>
                    <select
                      value={selectedResultsMatchupKey}
                      onChange={(event) => setSelectedResultsMatchupKey(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white"
                    >
                      {resultsMatchupOptions.map((option) => (
                        <option key={option.key} value={option.key} className="text-stone-900">
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {selectedResultsMatchup ? (
                  <div className="mt-5 space-y-4">
                    <div className="rounded-3xl bg-white/10 p-5">
                      <div className="flex items-center justify-between text-sm text-emerald-100">
                        <span>{selectedResultsMatchup.course}</span>
                        <span>{selectedResultsMatchup.date}</span>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-white/10 p-4">
                          <div className="text-xs uppercase tracking-[0.18em] text-emerald-100">Team {selectedResultsMatchup.teamA.number}</div>
                          <div className="mt-1 text-3xl font-bold">{selectedResultsMatchup.teamAFinal.toFixed(1)}</div>
                        </div>
                        <div className="rounded-2xl bg-white/10 p-4">
                          <div className="text-xs uppercase tracking-[0.18em] text-emerald-100">Team {selectedResultsMatchup.teamB.number}</div>
                          <div className="mt-1 text-3xl font-bold">{selectedResultsMatchup.teamBFinal.toFixed(1)}</div>
                        </div>
                      </div>
                      <p className="mt-4 text-sm text-emerald-100">
                        {"Bonus point: " + String(selectedResultsMatchup.teamABonus.toFixed(1)) + " to Team " + String(selectedResultsMatchup.teamA.number) + ", " + String(selectedResultsMatchup.teamBBonus.toFixed(1)) + " to Team " + String(selectedResultsMatchup.teamB.number)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-emerald-100">No weekly results yet.</p>
                )}
              </div>

              <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Match cards</p>
                <h3 className="mt-1 text-2xl font-bold">Individual results</h3>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {selectedResultsMatchup ? selectedResultsMatchup.matches.map((match) => (
                    <div key={`${selectedResultsMatchup.week}-${match.matchupId}`} className="rounded-3xl bg-stone-50 p-4">
                      <p className="font-semibold text-stone-900">
                        {"Slot " + String(match.lineupSlot) + ": " + (match.playerA.player?.name || "Open") + " vs " + (match.playerB.player?.name || "Open")}
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-white p-3 shadow-sm">
                          <div className="text-xs uppercase tracking-[0.15em] text-stone-500">Team A</div>
                          <div className="mt-1 text-sm text-stone-700">{String(match.playerA.gross ?? "-")} stroke</div>
                          <div className="text-sm text-stone-700">{String(match.playerA.holesWon)} holes won</div>
                          <div className="font-semibold text-emerald-800">{String(match.playerA.totalPoints)} pts</div>
                        </div>
                        <div className="rounded-2xl bg-white p-3 shadow-sm">
                          <div className="text-xs uppercase tracking-[0.15em] text-stone-500">Team B</div>
                          <div className="mt-1 text-sm text-stone-700">{String(match.playerB.gross ?? "-")} stroke</div>
                          <div className="text-sm text-stone-700">{String(match.playerB.holesWon)} holes won</div>
                          <div className="font-semibold text-emerald-800">{String(match.playerB.totalPoints)} pts</div>
                        </div>
                      </div>
                    </div>
                  )) : <div className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-500">No weekly results yet.</div>}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "rules" ? (
          <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Documents</p>
                <h3 className="mt-1 text-2xl font-bold">League Bylaws</h3>
                <p className="mt-3 text-sm text-stone-600">Open or download the latest bylaws document for league members.</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href={bylawsDocumentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block rounded-2xl border border-white/15 bg-white px-4 py-2 text-sm font-semibold text-stone-800"
                  >
                    Preview Bylaws Document
                  </a>
                  <a
                    href={bylawsDocumentUrl}
                    download={bylawsDocumentName}
                    className="inline-block rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Download Bylaws Document
                  </a>
                </div>
              </div>

              <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">League Rules</p>
                <h3 className="mt-1 text-2xl font-bold">League Bylaws</h3>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {[
                    "18 teams can be tracked by team number.",
                    "Each team has 4 lineup spots. Weekly matchups are built from Team A vs Team B, slot 1 through slot 4.",
                    "Starting slots are your seed slots. Beginning with Week 4, then Week 7, Week 10, and so on, slots automatically reorder by season average up to that point.",
                    "Each player can win 1 point for stroke play and 1 point for match play.",
                    "Ties in either part award 0.5 points each.",
                    "The team with the lower 4-player stroke total gets 1 bonus point. Team ties get 0.5 each.",
                    "Maximum weekly team total is 9 points.",
                    "Each matchup is assigned to one course, and all 4 players on each team play that same course together.",
                    "Each week is split across both C-Way and Clayton Country Club. The generator balances each team's total course appearances to within plus or minus 1 for the season.",
                  ].map((rule) => (
                    <div key={rule} className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-700">
                      {rule}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "admin" ? (
          <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Admin panel</p>
                  <h3 className="mt-1 text-2xl font-bold">Build the league by team number</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAdminOpen((value) => !value)}
                    className="rounded-2xl border border-white/15 px-4 py-2 text-sm font-semibold text-stone-800"
                  >
                    {adminOpen ? "Hide Admin" : "Show Admin"}
                  </button>
                  {adminAuthenticated ? (
                    <button
                      type="button"
                      onClick={handleAdminLogout}
                      className="rounded-2xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700"
                    >
                      Log Out
                    </button>
                  ) : null}
                </div>
              </div>

              {!adminAuthenticated ? (
                <div className="mt-6 max-w-md rounded-3xl border border-white/10 bg-stone-50 p-5">
                  <label className="text-sm font-medium text-stone-700">
                    Admin password
                    <input
                      type="password"
                      value={adminPasswordInput}
                      onChange={(event) => setAdminPasswordInput(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-white/15 px-4 py-3"
                      placeholder="Enter admin password"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleAdminLogin}
                    className="mt-3 w-full rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white"
                  >
                    Unlock Admin Panel
                  </button>
                </div>
              ) : null}

              {announcementAuthenticated ? (
                <div className="mt-4 max-w-2xl rounded-3xl border border-amber-400/30 bg-amber-500/10 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">League Alert</p>
                      <h4 className="mt-1 text-lg font-bold text-white">Weather cancellation banner</h4>
                    </div>
                    <button
                      type="button"
                      onClick={handleAnnouncementLogout}
                      className="rounded-2xl border border-amber-300/40 px-4 py-2 text-sm font-semibold text-amber-100"
                    >
                      Log Out Announcement Manager
                    </button>
                  </div>
                  <textarea
                    value={leagueAlertInput}
                    onChange={(event) => setLeagueAlertInput(event.target.value)}
                    placeholder="Example: Play cancelled tonight due to inclement weather."
                    className="mt-4 min-h-[110px] w-full rounded-2xl border border-white/15 px-4 py-3 text-stone-900"
                  />
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleSaveLeagueAlert}
                      className="rounded-2xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white"
                    >
                      Save League Alert
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLeagueAlertInput("");
                        setLeagueAlert("");
                        setAdminMessage("League alert cleared.");
                      }}
                      className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-stone-800"
                    >
                      Clear Alert
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 max-w-md rounded-3xl border border-white/10 bg-stone-50 p-5">
                  <label className="text-sm font-medium text-stone-700">
                    Announcement manager password
                    <input
                      type="password"
                      value={announcementPasswordInput}
                      onChange={(event) => setAnnouncementPasswordInput(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-white/15 px-4 py-3"
                      placeholder="Enter announcement password"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleAnnouncementLogin}
                    className="mt-3 w-full rounded-2xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white"
                  >
                    Unlock Announcement Manager
                  </button>
                </div>
              )}

              {adminMessage ? (
                <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
                  {adminMessage}
                </div>
              ) : null}

              {adminOpen && adminAuthenticated ? (
                <div className="mt-6 grid gap-6 xl:grid-cols-4">
                  <div className="rounded-3xl border border-stone-200 p-4">
                    <h4 className="text-lg font-semibold">Add Team</h4>
                    <div className="mt-4 space-y-3">
                      <input
                        type="number"
                        placeholder="Team number"
                        value={newTeam.number}
                        onChange={(event) => setNewTeam((current) => ({ ...current, number: event.target.value }))}
                        className="w-full rounded-2xl border border-white/15 px-4 py-3"
                      />
                      <input
                        type="text"
                        placeholder="Team name optional"
                        value={newTeam.name}
                        onChange={(event) => setNewTeam((current) => ({ ...current, name: event.target.value }))}
                        className="w-full rounded-2xl border border-white/15 px-4 py-3"
                      />
                      <button type="button" onClick={handleAddTeam} className="w-full rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white">
                        Add Team
                      </button>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-stone-200 p-4">
                    <h4 className="text-lg font-semibold">Add Player</h4>
                    <div className="mt-3 rounded-2xl bg-stone-50 p-3 text-xs text-stone-600">
                      CSV header: <span className="font-semibold">name,teamNumber,lineupSlot</span>
                    </div>
                    <label className="mt-3 block rounded-2xl border border-white/15 px-4 py-3 text-sm font-medium text-stone-700">
                      Import Players CSV
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleImportPlayersCsv}
                        className="mt-2 block w-full text-sm"
                      />
                    </label>
                    <div className="mt-4 space-y-3">
                      <input
                        type="text"
                        placeholder="Player name"
                        value={newPlayer.name}
                        onChange={(event) => setNewPlayer((current) => ({ ...current, name: event.target.value }))}
                        className="w-full rounded-2xl border border-white/15 px-4 py-3"
                      />
                      <select
                        value={newPlayer.teamNumber}
                        onChange={(event) => setNewPlayer((current) => ({ ...current, teamNumber: event.target.value }))}
                        className="w-full rounded-2xl border border-white/15 px-4 py-3"
                      >
                        <option value="">Select team number</option>
                        {teams.slice().sort(sortByNumber).map((team) => (
                          <option key={team.number} value={team.number}>{"Team " + String(team.number)}</option>
                        ))}
                      </select>
                      <select
                        value={newPlayer.lineupSlot}
                        onChange={(event) => setNewPlayer((current) => ({ ...current, lineupSlot: event.target.value }))}
                        className="w-full rounded-2xl border border-white/15 px-4 py-3"
                      >
                        {[1, 2, 3, 4].map((slot) => (
                          <option key={slot} value={slot}>{"Lineup Slot " + String(slot)}</option>
                        ))}
                      </select>
                      <button type="button" onClick={handleAddPlayer} className="w-full rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white">
                        Add Player
                      </button>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-stone-200 p-4">
                    <h4 className="text-lg font-semibold">Add Team Matchup</h4>
                    <div className="mt-4 space-y-3">
                      <input
                        type="number"
                        placeholder="Week"
                        value={newScheduleWeek.week}
                        onChange={(event) => setNewScheduleWeek((current) => ({ ...current, week: event.target.value }))}
                        className="w-full rounded-2xl border border-white/15 px-4 py-3"
                      />
                      <select
                        value={newScheduleWeek.teamANumber}
                        onChange={(event) => setNewScheduleWeek((current) => ({ ...current, teamANumber: event.target.value }))}
                        className="w-full rounded-2xl border border-white/15 px-4 py-3"
                      >
                        {teams.slice().sort(sortByNumber).map((team) => (
                          <option key={team.number} value={team.number}>{"Team " + String(team.number)}</option>
                        ))}
                      </select>
                      <select
                        value={newScheduleWeek.teamBNumber}
                        onChange={(event) => setNewScheduleWeek((current) => ({ ...current, teamBNumber: event.target.value }))}
                        className="w-full rounded-2xl border border-white/15 px-4 py-3"
                      >
                        {teams.slice().sort(sortByNumber).map((team) => (
                          <option key={team.number} value={team.number}>{"Team " + String(team.number)}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Date"
                        value={newScheduleWeek.date}
                        onChange={(event) => setNewScheduleWeek((current) => ({ ...current, date: event.target.value }))}
                        className="w-full rounded-2xl border border-white/15 px-4 py-3"
                      />
                      <input
                        type="text"
                        placeholder="Time"
                        value={newScheduleWeek.time}
                        onChange={(event) => setNewScheduleWeek((current) => ({ ...current, time: event.target.value }))}
                        className="w-full rounded-2xl border border-white/15 px-4 py-3"
                      />
                      <input
                        type="text"
                        placeholder="Course"
                        value={newScheduleWeek.course}
                        onChange={(event) => setNewScheduleWeek((current) => ({ ...current, course: event.target.value }))}
                        className="w-full rounded-2xl border border-white/15 px-4 py-3"
                      />
                      <button type="button" onClick={handleAddScheduleWeek} className="w-full rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white">
                        Add Week by Team Number
                      </button>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-stone-200 p-4">
                    <h4 className="text-lg font-semibold">Substitutes</h4>
                    <div className="mt-4 space-y-3 text-sm text-stone-700">
                      <select
                        value={newSubstitute.slot}
                        onChange={(event) => setNewSubstitute((current) => ({ ...current, slot: event.target.value }))}
                        className="w-full rounded-2xl border border-white/15 px-4 py-3"
                      >
                        {[1, 2, 3, 4].map((slot) => (
                          <option key={slot} value={slot}>{`${slot} Men`}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Name"
                        value={newSubstitute.name}
                        onChange={(event) => setNewSubstitute((current) => ({ ...current, name: event.target.value }))}
                        className="w-full rounded-2xl border border-white/15 px-4 py-3"
                      />
                      <input
                        type="text"
                        placeholder="Phone number"
                        value={newSubstitute.phone}
                        onChange={(event) => setNewSubstitute((current) => ({ ...current, phone: event.target.value }))}
                        className="w-full rounded-2xl border border-white/15 px-4 py-3"
                      />
                      <input
                        type="email"
                        placeholder="E-mail"
                        value={newSubstitute.email}
                        onChange={(event) => setNewSubstitute((current) => ({ ...current, email: event.target.value }))}
                        className="w-full rounded-2xl border border-white/15 px-4 py-3"
                      />
                      <button type="button" onClick={handleAddSubstitute} className="w-full rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white">
                        Add Substitute
                      </button>
                      <div className="space-y-2">
                        {[1, 2, 3, 4].map((slot) => (
                          <div key={slot} className="rounded-2xl bg-stone-50 p-3">
                            <div className="font-semibold text-stone-900">{`${slot} Men`}</div>
                            <div className="mt-2 space-y-2 text-sm text-stone-600">
                              {(substitutes[slot] ?? []).length === 0 ? (
                                <div>No substitutes yet.</div>
                              ) : (
                                (substitutes[slot] ?? []).map((substitute) => (
                                  <div key={substitute.id} className="rounded-xl bg-white p-3 shadow-sm">
                                    <div className="font-medium text-stone-900">{substitute.name}</div>
                                    <div>{substitute.phone}</div>
                                    <div>{substitute.email}</div>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSubstitute(slot, substitute.id)}
                                      className="mt-2 rounded-xl border border-red-300 px-3 py-1 text-xs font-semibold text-red-700"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-stone-200 p-4 xl:col-span-2">
                    <h4 className="text-lg font-semibold">Email / Text Announcement System</h4>
                    <div className="mt-4 text-sm text-stone-700">
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Announcement subject"
                          value={announcementDelivery.subject}
                          onChange={(event) => setAnnouncementDelivery((current) => ({ ...current, subject: event.target.value }))}
                          className="w-full rounded-2xl border border-white/15 px-4 py-3"
                        />
                        <textarea
                          placeholder="Announcement message"
                          value={announcementDelivery.message}
                          onChange={(event) => setAnnouncementDelivery((current) => ({ ...current, message: event.target.value }))}
                          className="min-h-[150px] w-full rounded-2xl border border-white/15 px-4 py-3"
                        />
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                          <button type="button" onClick={handleOpenAnnouncementEmail} className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white">
                            Open Email Draft
                          </button>
                          <button type="button" onClick={handleCopyAnnouncementEmails} className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-stone-800">
                            Copy Emails
                          </button>
                          <button type="button" onClick={handleCopyAnnouncementPhones} className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-stone-800">
                            Copy Phones
                          </button>
                          <button type="button" onClick={handleCopyAnnouncementMessage} className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-stone-800">
                            Copy Text Message
                          </button>
                        </div>
                        <div className="rounded-3xl bg-stone-50 p-4 text-sm text-stone-600">
                          Contacts are pulled automatically from the Directory and Substitutes sections when you use the copy or email tools.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-stone-200 p-4">
                    <h4 className="text-lg font-semibold">Announcements</h4>
                    <div className="mt-4 space-y-3 text-sm text-stone-700">
                      <textarea
                        placeholder="Add announcement"
                        value={newAnnouncement}
                        onChange={(event) => setNewAnnouncement(event.target.value)}
                        className="min-h-[110px] w-full rounded-2xl border border-white/15 px-4 py-3"
                      />
                      <button type="button" onClick={handleAddAnnouncement} className="w-full rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white">
                        Add Announcement
                      </button>
                      <div className="space-y-2">
                        {announcements.length === 0 ? (
                          <div className="rounded-2xl bg-stone-50 p-4 text-stone-500">No announcements yet.</div>
                        ) : (
                          announcements.map((announcement, index) => (
                            <div key={announcement + index} className="rounded-2xl bg-stone-50 p-4">
                              <div>{announcement}</div>
                              <button
                                type="button"
                                onClick={() => handleDeleteAnnouncement(index)}
                                className="mt-3 rounded-xl border border-red-300 px-3 py-1 text-xs font-semibold text-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-stone-200 p-4 xl:col-span-2">
                    <h4 className="text-lg font-semibold">Bylaws Document</h4>
                    <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                      <div className="rounded-2xl bg-stone-50 p-4">
                        <div className="font-semibold">Current file</div>
                        <div className="mt-1 text-stone-500">{bylawsDocumentName}</div>
                        <div className="mt-2 text-xs text-stone-400">
                          Source: {bylawsDocumentUrl?.startsWith("data:") ? "Browser Upload (stored in this browser only)" : "Default File (/public folder)"}
                        </div>
                      </div>
                      <div className="space-y-3 text-sm text-stone-700">
                        <label className="block rounded-2xl border border-white/15 px-4 py-3 text-sm font-medium text-stone-700">
                          Upload PDF
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={handleBylawsUpload}
                            className="mt-2 block w-full text-sm"
                          />
                        </label>
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <a
                            href={bylawsDocumentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full rounded-2xl border border-white/15 px-4 py-3 text-center text-sm font-semibold text-stone-800"
                          >
                            Preview Current Bylaws
                          </a>
                          <button
                            type="button"
                            onClick={handleRemoveBylawsUpload}
                            className="w-full rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-stone-800"
                          >
                            Reset Bylaws File
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-stone-200 p-4">
                    <h4 className="text-lg font-semibold">Branding & Backup</h4>
                    <div className="mt-4 space-y-3 text-sm text-stone-700">
                      <div className="rounded-2xl bg-stone-50 p-4">
                        <div className="font-semibold text-stone-900">League Header Mark</div>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => setLeagueLogoMode("icon")}
                            className={`rounded-2xl px-4 py-2 text-sm font-semibold ${leagueLogoMode === "icon" ? "bg-emerald-700 text-white" : "border border-white/15 text-stone-700"}`}
                          >
                            WNL Badge
                          </button>
                          <button
                            type="button"
                            onClick={() => setLeagueLogoMode("emoji")}
                            className={`rounded-2xl px-4 py-2 text-sm font-semibold ${leagueLogoMode === "emoji" ? "bg-emerald-700 text-white" : "border border-white/15 text-stone-700"}`}
                          >
                            Golf Icon
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownloadLeagueBackup}
                        className="w-full rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-stone-800"
                      >
                        Download League Backup
                      </button>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-stone-200 p-4 xl:col-span-2">
                    <h4 className="text-lg font-semibold">Commissioner Controls</h4>
                    <div className="mt-4 grid gap-4 lg:grid-cols-3 text-sm text-stone-700">
                      <div className="rounded-2xl bg-stone-50 p-4">
                        <div className="font-semibold text-stone-900">Delete Week Results</div>
                        <select
                          value={deleteRoundForm.week}
                          onChange={(event) => setDeleteRoundForm((current) => ({ ...current, week: event.target.value }))}
                          className="mt-3 w-full rounded-2xl border border-white/15 px-4 py-3"
                        >
                          {[...new Set(schedule.map((item) => item.week))].sort((a, b) => a - b).map((week) => (
                            <option key={week} value={week}>{`Week ${week}`}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleDeleteWeekResults(deleteRoundForm.week)}
                          className="mt-3 w-full rounded-2xl border border-red-300 px-4 py-3 text-sm font-semibold text-red-700"
                        >
                          Delete All Scores for Week
                        </button>
                      </div>

                      <div className="rounded-2xl bg-stone-50 p-4">
                        <div className="font-semibold text-stone-900">Delete Player Round</div>
                        <select
                          value={deleteRoundForm.playerId}
                          onChange={(event) => setDeleteRoundForm((current) => ({ ...current, playerId: event.target.value }))}
                          className="mt-3 w-full rounded-2xl border border-white/15 px-4 py-3"
                        >
                          {players.slice().sort((a, b) => Number(a.teamNumber) - Number(b.teamNumber) || Number(a.lineupSlot) - Number(b.lineupSlot)).map((player) => (
                            <option key={player.id} value={player.id}>{`${player.name} • Team ${player.teamNumber} • Slot ${player.lineupSlot}`}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleDeletePlayerRound}
                          className="mt-3 w-full rounded-2xl border border-red-300 px-4 py-3 text-sm font-semibold text-red-700"
                        >
                          Delete Player Score
                        </button>
                      </div>

                      <div className="rounded-2xl bg-stone-50 p-4">
                        <div className="font-semibold text-stone-900">Manual Team Points</div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                          <select
                            value={manualAdjustmentForm.teamNumber}
                            onChange={(event) => setManualAdjustmentForm((current) => ({ ...current, teamNumber: event.target.value }))}
                            className="w-full rounded-2xl border border-white/15 px-4 py-3"
                          >
                            {teams.slice().sort(sortByNumber).map((team) => (
                              <option key={team.number} value={team.number}>{`Team ${team.number}`}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            step="0.5"
                            value={manualAdjustmentForm.points}
                            onChange={(event) => setManualAdjustmentForm((current) => ({ ...current, points: event.target.value }))}
                            className="w-full rounded-2xl border border-white/15 px-4 py-3"
                            placeholder="Adjustment"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleApplyManualAdjustment}
                          className="mt-3 w-full rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white"
                        >
                          Save Adjustment
                        </button>
                      </div>

                      <div className="rounded-2xl bg-stone-50 p-4 lg:col-span-2">
                        <div className="font-semibold text-stone-900">Lock / Unlock Weeks</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {[...new Set(schedule.map((item) => item.week))].sort((a, b) => a - b).map((week) => {
                            const isLocked = lockedWeeks.includes(Number(week));
                            return (
                              <button
                                key={week}
                                type="button"
                                onClick={() => handleToggleWeekLock(week)}
                                className={`rounded-2xl px-4 py-2 text-sm font-semibold ${isLocked ? "bg-red-100 text-red-700" : "border border-white/15 text-stone-700"}`}
                              >
                                {isLocked ? `Week ${week} Locked` : `Week ${week} Open`}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-stone-50 p-4">
                        <div className="font-semibold text-stone-900">Reset Season</div>
                        <p className="mt-2 text-xs text-stone-500">Clears scores, standings, adjustments, and week locks. Keeps teams, players, and schedule.</p>
                        <button
                          type="button"
                          onClick={handleResetSeasonOnly}
                          className="mt-3 w-full rounded-2xl border border-red-300 px-4 py-3 text-sm font-semibold text-red-700"
                        >
                          Reset Season Data Only
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-stone-200 p-4 xl:col-span-2">
                    <h4 className="text-lg font-semibold">Template Notes</h4>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-stone-700">
                      <div className="rounded-2xl bg-stone-50 p-4">Use team numbers 1 through 18 for this year.</div>
                      <div className="rounded-2xl bg-stone-50 p-4">Each future year can reuse the same schedule pattern by entering the new teams with the same team numbers.</div>
                      <div className="rounded-2xl bg-stone-50 p-4">Lineup Slot 1 plays Lineup Slot 1, Slot 2 plays Slot 2, and so on.</div>
                      <div className="rounded-2xl bg-stone-50 p-4">Slots automatically recalculate every 3 weeks using season average through the completed prior weeks.</div>
                      <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-900 md:col-span-2">The generator creates a full 17-week round robin for 18 teams. Each matchup is placed on either C-Way or Clayton Country Club, but both teams in that matchup stay together on the same course. Weekly assignments are split across both courses, and each team finishes with course counts balanced within plus or minus 1.</div>
                      <button type="button" onClick={handleGenerate18TeamSchedule} className="w-full rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white">
                        Generate 18-Team Round Robin
                      </button>
                      <button type="button" onClick={handleResetLeague} className="w-full rounded-2xl border border-red-300 px-4 py-3 text-sm font-semibold text-red-700">
                        Reset Starter Data
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

