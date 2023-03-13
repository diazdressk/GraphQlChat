import { useQuery } from '@apollo/client';
import { Box } from '@chakra-ui/react';
import { Session } from 'next-auth';
import ConversationList from './ConversationList';
import ConversationOperations from '../../../graphql/operations/conversation'
import { ConversationsData } from '../../../util/types';
interface ConversationsWrapperProps {
  session: Session;
}

const ConversationsWrapper: React.FC<ConversationsWrapperProps> = ({ session }) => {
  const { data: conversationsData, error: conversationsError, loading: conversationsLoading } = useQuery<ConversationsData, null/* ничего не передаю,просто зову */>(ConversationOperations.Queries.conversations)


  return (
    <Box
      width={{
        base: '100%',
        md: '400px',
      }}
      bg="whiteAlpha.50"
      py={6}
      px={3}>
      <ConversationList session={session} conversations={conversationsData?.conversations || []} />
    </Box>
  );
};
export default ConversationsWrapper;
