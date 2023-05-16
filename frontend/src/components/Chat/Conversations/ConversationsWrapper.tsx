import { gql, useMutation, useQuery, useSubscription } from '@apollo/client';
import { Box } from '@chakra-ui/react';
import { Session } from 'next-auth';
import ConversationList from './ConversationList';
import ConversationOperations from '../../../graphql/operations/conversation';
import { ConversationUpdatedData, ConversationsData } from '../../../utill/types';
import { ConversationPopulated, ParticipantPopulated } from '../../../../../backend/src/util/types';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import SkeletonLoader from '../../common/SkeletonLoader';
interface ConversationsWrapperProps {
  session: Session;
}

const ConversationsWrapper: React.FC<ConversationsWrapperProps> = ({ session }) => {
  const router = useRouter();
  const {
    query: { conversationId },
  } = router;

  const {
    user: { id: userId },
  } = session;

  const {
    data: conversationsData,
    error: conversationsError,
    loading: conversationsLoading,
    subscribeToMore,
  } = useQuery<ConversationsData>(ConversationOperations.Queries.conversations);

  const [markConversationAsRead] = useMutation<
    { markConversationAsRead: boolean },
    { userId: string; conversationId: string }
  >(ConversationOperations.Mutations.markConversationAsRead);

  useSubscription<ConversationUpdatedData>(
    ConversationOperations.Subscriptions.conversationUpdated,
    {
      onData: ({ client, data }) => {
        const { data: subscriptionData } = data;

        if (!subscriptionData) return;

        const {
          conversationUpdated: { conversation: updatedConversation },
        } = subscriptionData;

        const currentlyViewingConversation =
          updatedConversation.id === conversationId;

        if (currentlyViewingConversation) {
          onViewConversation(conversationId, false);
        }
      },
    }
  );

  const onViewConversation = async (
    conversationId: string,
    hasSeenLatestMessage: boolean | undefined,
  ) => {
    /* при нажатии на беседу,в квери параметрах айдишник беседы устанавливаю и сообщение прочитано делаю */
    router.push({ query: { conversationId } });

    if (hasSeenLatestMessage) return;

    try {
      await markConversationAsRead({
        variables: {
          userId,
          conversationId,
        },
        optimisticResponse: {
          markConversationAsRead: true,
        },
        update: (cache) => {
          /* после того,как отправил на бек о том,что сообщение ПРочитано, в кеше нахожу ту беседу и обновляю там  markConversationsAsRead...как только появится новое сообщение,это поле становится false, при открытии беседы делаю его true*/
          const participantsFragment = cache.readFragment<{
            participants: Array<ParticipantPopulated>;
          }>({
            id: `Conversation:${conversationId}`,
            fragment: gql`
              fragment Participants on Conversation {
                participants {
                  user {
                    id
                    username
                  }
                  hasSeenLatestMessage
                }
              }
            `,
          });

          if (!participantsFragment) return;

          /* копирую этот кеш в отдельный массив,буду его мутировать */
          const participants = [...participantsFragment.participants];

          /* нахожу юзера в беседе по айди */
          const userParticipantIdx = participants.findIndex((p) => p.user.id === userId);

          if (userParticipantIdx === -1) return;

          const userParticipant = participants[userParticipantIdx];

          /**
           * поле Прочитано делаю тру
           */
          participants[userParticipantIdx] = {
            ...userParticipant,
            hasSeenLatestMessage: true,
          };

          /**
           * обновляю кеш
           */
          cache.writeFragment({
            /* нахожу эту беседу по айди */ id: `Conversation:${conversationId}`,
            fragment: gql`
              fragment UpdatedParticipant on Conversation {
                participants
              }
            `,
            data: {
              /* меняю в ней данные */ participants,
            },
          });
        },
      });
    } catch (error) {
      console.log('onViewConversation error: ', error);
    }
  };

  const subscribeToNewConversations = () => {
    /* показ новых диалогов...если начал новый диалог,эта функция сработает и подтянет новый диалог */
    subscribeToMore({
      document: ConversationOperations.Subscriptions.conversationCreated,
      updateQuery: (
        prev,
        {
          subscriptionData,
        }: { subscriptionData: { data: { conversationCreated: ConversationPopulated } } },
      ) => {
        if (!subscriptionData.data)
          return prev; /* если нового диалога нет,то показываю те,которые уже начаты */

        const newConversation = subscriptionData.data.conversationCreated;

        return Object.assign({}, prev, {
          conversations: [newConversation, ...prev.conversations],
        });
      },
    });
  };

  useEffect(() => {
    subscribeToNewConversations();
  }, []);

  return (
    <Box
      display={{ base: conversationId ? 'none' : 'flex', md: 'flex' }}
      width={{
        base: '100%',
        md: '400px',
      }}
      bg="whiteAlpha.50"
      flexDirection="column"
      gap={4}
      py={6}
      px={3}>
      {conversationsLoading ? (
        <SkeletonLoader count={6} height="70px" />
      ) : (
        <ConversationList
          session={session}
          conversations={conversationsData?.conversations || []}
          onViewConversation={onViewConversation}
        />
      )}
    </Box>
  );
};
export default ConversationsWrapper;
