import { ParticipantPopulated } from "../../../backend/src/util/types";
/* из партисипенсов забираю юзернейм и фотку*/
export const formatUsernames = (
  participants: Array<ParticipantPopulated>,
  myUserId: string
) => {
  const usernames = participants
    .filter((participant) => participant.user.id != myUserId)
    .map((participant) => [participant.user.username, participant.user.image]);

  return { usernames: usernames.map(user => user[0]).join(', '), images: usernames.map(user => user[1])[0] };
};