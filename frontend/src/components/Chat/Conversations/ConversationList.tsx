import { Box, Text } from '@chakra-ui/react';
import { Session } from 'next-auth';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { ConversationPopulated } from '../../../../../backend/src/util/types';
import ConversationItem from './ConversationItem';
import ConversationModal from './Modal/Modal';

interface ConversationListProps {
  session: Session;
  conversations: Array<ConversationPopulated>;
  onViewConversation: (conversationId: string, hasSeenLatestMessage: boolean | undefined) => void;
}

const ConversationList: React.FC<ConversationListProps> = ({
  session,
  conversations,
  onViewConversation,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);
  const router = useRouter();
  const {
    user: { id: userId },
  } = session;

  /* если пришло новое сообщзение,поднимаю вверх */
  const sortedConversations = [...conversations].sort((a, b) => b.updatedAt.valueOf() - a.updatedAt.valueOf())

  return (
    <Box width="100%">
      <Box
        py={2}
        px={4}
        mb={4}
        bg="blackAlpha.300"
        borderRadius={4}
        cursor="pointer"
        onClick={onOpen}>
        {/* @ts-ignore */} {/* ошибка с версией тс,решить позже! */}
        <Text textAlign="center" color="whiteAlpha.800" fontWeight={500}>
          Find or start a conversation
        </Text>
      </Box>
      <ConversationModal isOpen={isOpen} onClose={onClose} session={session} />
      {sortedConversations.map((conversation) => {
        const participant = conversation.participants.find((p: any) => p.user.id === userId);
        return (
          <ConversationItem
            key={conversation.id}
            userId={userId}
            conversation={conversation}
            onClick={() => onViewConversation(conversation.id, participant?.hasSeenLatestMessage)}
            hasSeenLatestMessage={participant?.hasSeenLatestMessage}
            isSelected={conversation.id === router.query.conversationId}
          />
        );
      })}
    </Box>
  );
  21.0;
};
export default ConversationList;
