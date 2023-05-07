import { useQuery } from '@apollo/client';
import { Box, SkeletonCircle } from '@chakra-ui/react';
import { Session } from 'next-auth';
import ConversationList from './ConversationList';
import ConversationOperations from '../../../graphql/operations/conversation';
import { ConversationsData } from '../../../utill/types';
import { ConversationPopulated } from '../../../../../backend/src/util/types';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import SkeletonLoader from '../../common/SkeletonLoader';
interface ConversationsWrapperProps {
  session: Session;
}

const ConversationsWrapper: React.FC<ConversationsWrapperProps> = ({ session }) => {
  const {
    data: conversationsData,
    error: conversationsError,
    loading: conversationsLoading,
    subscribeToMore,
  } = useQuery<ConversationsData>(
    ConversationOperations.Queries.conversations,
  );

  const router = useRouter()
  const { query: { conversationId } } = router

  const onViewConversation = async (conversationId: string) => {/* при нажатии на беседу,в квери параметрах айдишник беседы устанавливаю и сообщение прочитано делаю */
    router.push({ query: { conversationId } })
  }

  const subscribeToNewConversations = () => {/* показ новых диалогов...если начал новый диалог,эта функция сработает и подтянет новый диалог */
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
    subscribeToNewConversations()
  }, [])

  return (
    <Box
      display={{ base: conversationId ? 'none' : 'flex', md: 'flex' }}
      width={{
        base: '100%',
        md: '400px',
      }}
      bg="whiteAlpha.50"
      flexDirection='column'
      gap={4}
      py={6}
      px={3}
    >
      {conversationsLoading ? <SkeletonLoader count={6} height='70px' /> : <ConversationList session={session} conversations={conversationsData?.conversations || []} onViewConversation={onViewConversation} />}
    </Box>
  );
};
export default ConversationsWrapper;
