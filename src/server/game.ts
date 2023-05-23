import {
  cancel,
  put as putRaw,
  take,
  takeEvery,
  select,
  all,
  delay,
  race,
  call,
} from 'redux-saga/effects';
import invariant from 'ts-invariant';
import shuffleArray from 'shuffle-array';
import { produce } from 'immer';
import { EventType, type Event } from './events';
import {
  Color,
  DecodeMethod,
  DEFAULT_GAME_CONFIG,
  getWinningTeam,
  Lobby,
  Maybe,
  Secret,
  SecretType,
} from '../common';
import Animals from '../../data/Animals.json';
import Entertainment from '../../data/Entertainment.json';
import Misc from '../../data/Misc.json';
import Sports from '../../data/Sports.json';
import Adult from '../../data/Adult.json';

const put = putRaw as (setState: (lobby: Lobby) => Lobby) => void;

export const SECRET_BANK = {
  Animals,
  Entertainment,
  Misc,
  Sports,
  Adult,
};

// @ts-ignore
export function* root() {
  // TODO: implement disband
  yield takeEvery(
    EventType.LeaveLobby,
    function* (leaveLobbyEvent: Event<'LeaveLobby'>) {
      yield put(leaveLobby(leaveLobbyEvent));
    },
  );
  while (true) {
    // @ts-ignore
    const preGameTask = yield all([
      takeEvery(
        EventType.JoinLobby,
        function* (joinLobbyEvent: Event<'JoinLobby'>) {
          yield put(joinLobby(joinLobbyEvent));
        },
      ),
      takeEvery(
        EventType.JoinTeam,
        function* (joinTeamEvent: Event<'JoinTeam'>) {
          yield put(joinTeam(joinTeamEvent));
        },
      ),
      takeEvery(
        EventType.DemoteEncoder,
        function* (demoteEncoderEvent: Event<'DemoteEncoder'>) {
          yield put(demoteEncoder(demoteEncoderEvent));
        },
      ),
      takeEvery(
        EventType.PromoteEncoder,
        function* (promoteEncoderEvent: Event<'PromoteEncoder'>) {
          yield put(promoteEncoder(promoteEncoderEvent));
        },
      ),
    ]);
    const startGameEvent: Event<'StartGame'> = yield take(EventType.StartGame);
    yield put(startGame(startGameEvent));
    yield cancel(preGameTask);
    const encodeTimeLimitMs: ReturnType<typeof getEncodeTimeLimitMs> =
      yield select(getEncodeTimeLimitMs);
    const decodeTimeLimitMs: ReturnType<typeof getDecodeTimeLimitMs> =
      yield select(getDecodeTimeLimitMs);
    // loop teams
    while ((yield select(isGameRunning)) as ReturnType<typeof isGameRunning>) {
      const activeTeamColor: ReturnType<typeof getActiveTeamColor> =
        yield select(getActiveTeamColor);
      const [encodeSecretEvent]: [Maybe<Event<'EncodeSecret'>>] = yield race([
        take(EventType.EncodeSecret),
        delay(encodeTimeLimitMs),
      ]);
      if (!encodeSecretEvent) {
        yield put(endTurn());
        continue;
      }
      yield put(encodeSecret(encodeSecretEvent));
      // @ts-ignore
      const turnTasks = yield all([
        takeEvery(
          EventType.SkipDecoding,
          function* (skipDecodingEvent: Event<'SkipDecoding'>) {
            yield put(skipDecoding(skipDecodingEvent));
          },
        ),
        takeEvery(
          EventType.DecodeSecret,
          function* (decodeSecretEvent: Event<'DecodeSecret'>) {
            yield put(decodeSecret(decodeSecretEvent));
          },
        ),
        takeEvery(
          EventType.CancelDecodeSecret,
          function* (cancelDecodeSecretEvent: Event<'CancelDecodeSecret'>) {
            yield put(cancelDecodeSecret(cancelDecodeSecretEvent));
          },
        ),
      ]);
      yield race([
        delay(decodeTimeLimitMs),
        takeChange(isTeamActive, activeTeamColor),
      ]);
      yield cancel(turnTasks);
    }
    yield delay(2000);
    yield put(endGame());
  }
}

function takeChange(...args: Parameters<typeof select>) {
  return call(function* () {
    const prev = yield select(...args);
    while (true) {
      const curr: ReturnType<(typeof args)[0]> = yield select(...args);
      if (curr !== prev) {
        return curr;
      }
      yield take('*');
    }
  });
}

function getActiveTeamColor(lobby: Lobby) {
  const game = lobby.activeGame;
  invariant(game, 'no game running');
  return game.activeTeam;
}

function isTeamActive(lobby: Lobby, teamColor: Color) {
  const game = lobby.activeGame;
  invariant(game, 'no game running');
  return game.activeTeam === teamColor;
}

function isGameRunning(lobby: Lobby) {
  return !Boolean(getWinningTeam(lobby));
}

function getEncodeTimeLimitMs(lobby: Lobby) {
  const game = lobby.activeGame;
  invariant(game, 'no game running');
  return game.config.encodeTimeLimit * 1000;
}

function getDecodeTimeLimitMs(lobby: Lobby) {
  const game = lobby.activeGame;
  invariant(game, 'no game running');
  return game.config.decodeTimeLimit * 1000;
}

function joinLobby({ payload: { playerName } }: Event<'JoinLobby'>) {
  return produce((lobby: Lobby) => {
    const isPresent = lobby.teams.some(team =>
      team.players.includes(playerName),
    );
    if (isPresent) {
      return;
    }
    lobby.teams
      .slice()
      .sort((a, b) => (a.players.length > b.players.length ? -1 : 1))[1]
      ?.players.push(playerName);
  });
}

// TODO: optimize
function leaveLobby({ payload: { playerName } }: Event<'LeaveLobby'>) {
  return produce((lobby: Lobby) => {
    const nonEmptyTeams = lobby.teams.filter(team => team.players.length >= 2);
    const teamIndex = nonEmptyTeams.findIndex(team =>
      team.players.includes(playerName),
    );
    if (teamIndex < 0) {
      return;
    }
    const team = nonEmptyTeams[teamIndex]!;
    team.players = team.players.filter(player => player !== playerName);
    if (team.players.length === 0) {
      const game = lobby.activeGame;
      if (game) {
        game.secrets = game.secrets.filter(
          secret =>
            secret.type !== SecretType.Secret ||
            secret.teamColor === team.color,
        );
        const isTeamActive = game.activeTeam === team.color;
        if (isTeamActive) {
          game.activeTeam =
            nonEmptyTeams[
              teamIndex + 1 >= nonEmptyTeams.length ? 0 : teamIndex + 1
            ]?.color ?? lobby.teams[0]!.color;
          game.encodeStartTime = Math.floor(Date.now() / 1000);
        }
      }
    }
    if (playerName === lobby.leader) {
      const newLeader = [team, ...nonEmptyTeams]
        .flatMap(team => team.players)
        .find(player => player !== playerName);
      if (newLeader) {
        lobby.leader;
      }
    }
  });
}

function joinTeam({ payload: { playerName, teamColor } }: Event<'JoinTeam'>) {
  return produce((lobby: Lobby) => {
    const currTeam = lobby.teams.find(team =>
      team.players.includes(playerName),
    );
    if (currTeam == null) {
      return;
    }
    currTeam.players = currTeam.players.filter(player => player !== playerName);
    const newTeam = lobby.teams.find(team => team.color === teamColor);
    newTeam?.players.push(playerName);
  });
}

function demoteEncoder({ payload: { playerName } }: Event<'DemoteEncoder'>) {
  return produce((lobby: Lobby) => {
    const team = lobby.teams.find(team => team.players.includes(playerName));
    if (team == null || team.players.length === 1) {
      return;
    }
    team.players = team.players.slice(1).concat(team.players[0]!);
  });
}

function promoteEncoder({ payload: { playerName } }: Event<'PromoteEncoder'>) {
  return produce((lobby: Lobby) => {
    const team = lobby.teams.find(team => team.players.includes(playerName));
    if (team == null) {
      return;
    }
    const isEncoder = team.players.indexOf(playerName) === 0;
    if (isEncoder) {
      return;
    }
    team.players = [
      playerName,
      ...team.players.filter(player => player !== playerName),
    ];
  });
}

function startGame({ payload: { config } }: Event<'StartGame'>) {
  return produce((lobby: Lobby) => {
    const gameConfig = {
      ...DEFAULT_GAME_CONFIG,
      ...config,
    };
    const fullTeams = lobby.teams.filter(team => team.players.length >= 2);
    const totalTeamSecrets = gameConfig.secretCount * fullTeams.length + 1;
    const totalNulls = gameConfig.secretCount;
    const totalViruses = gameConfig.virusCount;
    const totalSecrets = totalTeamSecrets + totalNulls + totalViruses;
    const secretBank = shuffleArray(
      Object.entries(SECRET_BANK)
        .filter(([category]) => gameConfig.categories.includes(category))
        .map(([, secrets]) => secrets)
        .flat(),
    ).slice(0, totalSecrets);
    const activeTeam = fullTeams[0]?.color;
    if (activeTeam == null) {
      return;
    }
    lobby.teams = shuffleArray(lobby.teams);
    lobby.activeGame = {
      config: gameConfig,
      activeTeam,
      encodeStartTime: Math.floor(Date.now() / 1000),
      secrets: shuffleArray([
        // team secrets
        ...fullTeams.flatMap((team, index) => {
          return (
            secretBank
              // first team gets extra secret
              .splice(0, gameConfig.secretCount + (index === 0 ? 1 : 0))
              .map(
                (secret): Secret => ({
                  type: SecretType.Secret,
                  value: secret,
                  teamColor: team.color,
                }),
              )
          );
        }),
        // nulls
        ...secretBank.splice(0, totalNulls).map(
          (secret): Secret => ({
            type: SecretType.Null,
            value: secret,
          }),
        ),
        // viruses
        ...secretBank.splice(0, totalViruses).map(
          (secret): Secret => ({
            type: SecretType.Virus,
            value: secret,
          }),
        ),
      ]),
    };
  });
}

function endGame() {
  return produce((lobby: Lobby) => {
    lobby.activeGame = null;
  });
}

function encodeSecret({
  payload: { signal, secretCount },
}: Event<'EncodeSecret'>) {
  return produce((lobby: Lobby) => {
    const activeGame = lobby.activeGame;
    if (activeGame == null) {
      return;
    }
    activeGame.signal = signal;
    activeGame.secretCount = secretCount;
    delete activeGame.encodeStartTime;
    activeGame.decodeStartTime = Math.floor(Date.now() / 1000);
  });
}

function decodeSecret({
  payload: { playerName, secret },
}: Event<'DecodeSecret'>) {
  return produce((lobby: Lobby) => {
    const activeGame = lobby.activeGame;
    if (activeGame == null) {
      return;
    }
    const team = lobby.teams.find(team => team.players.includes(playerName));
    if (team == null) {
      return;
    }
    const gameSecret = activeGame.secrets.find(
      gameSecret => gameSecret.value === secret,
    );
    if (gameSecret == null) {
      return;
    }

    const hasPlayerDecoded = Boolean(
      gameSecret.decodeAttempt?.players.includes(playerName),
    );
    let isDecoded = gameSecret.decodeTeamColor != null;
    if (isDecoded || hasPlayerDecoded) {
      return;
    }

    const decodedPlayers = [
      ...(gameSecret.decodeAttempt?.players ?? []),
      playerName,
    ];

    const decodeMethod = activeGame.config.decodeMethod;

    isDecoded =
      decodeMethod === DecodeMethod.All
        ? decodedPlayers.length === team.players.length
        : decodeMethod === DecodeMethod.First
        ? true
        : decodeMethod === DecodeMethod.Majority
        ? decodedPlayers.length >= Math.ceil(team.players.length / 2)
        : false;

    if (!isDecoded) {
      // team is still decoding
      gameSecret.decodeAttempt = {
        teamColor: team.color,
        players: decodedPlayers,
      };
      return;
    }

    delete gameSecret.decodeAttempt;
    delete activeGame.signal;
    delete activeGame.decodeStartTime;
    gameSecret.decodeTeamColor = team.color;

    const isTeamSecret =
      gameSecret.type === SecretType.Secret &&
      gameSecret.teamColor === team.color;
    const isVirus = gameSecret.type === SecretType.Virus;

    if (isTeamSecret) {
      const winningTeam = getWinningTeam(lobby);
      if (winningTeam) {
        activeGame.eliminatedTeams = Array.from(
          new Set([
            ...(activeGame.eliminatedTeams ?? []),
            ...lobby.teams
              .filter(team => team.color !== winningTeam?.color)
              .map(team => team.color),
          ]),
        );
      }
      return;
    }

    // turn is over

    activeGame.encodeStartTime = Math.floor(Date.now() / 1000);

    if (isVirus) {
      activeGame.eliminatedTeams = Array.from(
        new Set([...(activeGame.eliminatedTeams ?? []), team.color]),
      );
    }

    // rotate turn to next team

    const nonEmptyTeams = lobby.teams.filter(team => team.players.length >= 2);
    const teamIndex = nonEmptyTeams.indexOf(team);
    const nextTeamIndex =
      teamIndex + 1 >= nonEmptyTeams.length ? 0 : teamIndex + 1;
    const nextTeam = nonEmptyTeams[nextTeamIndex];
    if (nextTeam) {
      activeGame.activeTeam = nextTeam.color;
    }
  });
}

function cancelDecodeSecret({
  payload: { playerName, secret },
}: Event<'CancelDecodeSecret'>) {
  return produce((lobby: Lobby) => {
    const activeGame = lobby.activeGame;
    if (activeGame == null) {
      return;
    }
    const team = lobby.teams.find(team => team.players.includes(playerName));
    if (team == null) {
      return;
    }
    const gameSecret = activeGame.secrets.find(
      gameSecret => gameSecret.value === secret,
    );
    if (gameSecret == null) {
      return;
    }
    const decodeAttempt = gameSecret.decodeAttempt;
    if (decodeAttempt == null) {
      return;
    }
    const hasPlayerDecoded = Boolean(
      decodeAttempt.players.includes(playerName),
    );
    const isDecoded = gameSecret.decodeTeamColor != null;
    if (isDecoded || !hasPlayerDecoded) {
      return secret;
    }
    decodeAttempt.players = decodeAttempt.players.filter(
      player => player !== playerName,
    );
  });
}

function endTurn() {
  return produce((lobby: Lobby) => {
    const game = lobby.activeGame;
    if (game == null) {
      return;
    }
    const team = lobby.teams.find(team => team.color === game.activeTeam);
    if (team == null) {
      return;
    }
    const nonEmptyTeams = lobby.teams.filter(team => team.players.length >= 2);
    const teamIndex = nonEmptyTeams.indexOf(team);
    const nextTeamIndex =
      teamIndex + 1 >= nonEmptyTeams.length ? 0 : teamIndex + 1;
    const nextTeam = nonEmptyTeams[nextTeamIndex];
    if (nextTeam == null) {
      return;
    }
    game.activeTeam = nextTeam.color;
  });
}

function skipDecoding({ payload: { playerName } }: Event<'SkipDecoding'>) {
  return produce((lobby: Lobby) => {
    const game = lobby.activeGame;
    if (game == null) {
      return;
    }
    const team = lobby.teams.find(team => team.players.includes(playerName));
    if (team == null) {
      return;
    }
    if (game.activeTeam !== team.color) {
      return;
    }
    const nonEmptyTeams = lobby.teams.filter(team => team.players.length >= 2);
    const teamIndex = nonEmptyTeams.indexOf(team);
    const nextTeamIndex =
      teamIndex + 1 >= nonEmptyTeams.length ? 0 : teamIndex + 1;
    const nextTeam = nonEmptyTeams[nextTeamIndex];
    if (nextTeam == null) {
      return;
    }
    game.activeTeam = nextTeam.color;
  });
}
