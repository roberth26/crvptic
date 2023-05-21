import { cancel, put, take, takeEvery, select } from 'redux-saga/effects';
import invariant from 'ts-invariant';
import { EventType, type Event } from './events';
import { getEncodingTeam } from './state';

export function* root() {
  // @ts-ignore
  const createLobbyEvent = yield take(EventType.CreateLobby);
  yield put(createLobbyEvent);
  // @ts-ignore
  const preGameTask = yield takeEvery(
    [
      EventType.JoinLobby,
      EventType.JoinTeam,
      EventType.DemoteEncoder,
      EventType.PromoteEncoder,
    ],
    function* (event) {
      yield put(event);
    },
  );
  // @ts-ignore
  const startGame = yield take(EventType.StartGame);
  yield put(startGame);
  yield cancel(preGameTask);
  while (true) {
    // TODO: check for end condition right here

    // @ts-ignore
    const encodingTeam: ReturnType<typeof getEncodingTeam> = yield select(
      getEncodingTeam,
    );
    invariant(encodingTeam, 'encodingTeam nullish');
    const encodeSecretEvent: Event<typeof EventType.EncodeSecret> = yield take(
      EventType.EncodeSecret,
    );

    yield put(encodeSecretEvent);

    // decoding
    while (true) {
      const decodingEvent: Event<
        typeof EventType.DecodeSecret | typeof EventType.CancelDecodeSecret
        // @ts-ignore
      > = yield take([EventType.DecodeSecret, EventType.CancelDecodeSecret]);
      yield put(decodingEvent);
      // this team is done decoding once they get a wrong answer or stop decoding
      // TODO:
    }
  }
}
