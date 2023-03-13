import { useLazyQuery, useMutation } from '@apollo/client';
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import UserOperations from '../../../../graphql/operations/user';
import ConversationsOperations from '../../../../graphql/operations/conversation';
import {
  CreateConversationData,
  CreateConversationInput,
  SearchedUser,
  SearchUsersData,
  SearchUsersInput,
} from '../../../../util/types';
import Participants from './Participants';
import UserSearchList from './UserSearchList';
import { Session } from 'next-auth';
import { useRouter } from 'next/router';
interface ModalProps {
  session: Session;
  isOpen: boolean;
  onClose: () => void;
}

const ConversationModal: React.FC<ModalProps> = ({ isOpen, onClose, session }) => {
  const router = useRouter();
  const {
    user: { id: userId },
  } = session;
  const [username, setUsername] = useState('');
  const [participants, setParticipants] = useState<Array<SearchedUser>>([]);
  const [searchUsers, { data, loading, error }] = useLazyQuery<SearchUsersData, SearchUsersInput>(
    UserOperations.Queries.searchUsers,
  );
  const [createConversations, { loading: createConversationLoading }] = useMutation<
    CreateConversationData,
    CreateConversationInput
  >(ConversationsOperations.Mutations.createConversation);
  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    searchUsers({ variables: { username } });
  };

  const addParticipant = (user: SearchedUser) => {
    setParticipants((prev) => [...prev, user]);
  };

  const removeParticipant = (userId: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== userId));
  };
  // console.log('aaaaaaaaaaaaaaaaaa', data);

  const onCreateConversation = async () => {
    const participantIds = [userId, ...participants.map((p) => p.id)];
    try {
      const { data } = await createConversations({
        variables: {
          participantIds,
        },
      });
      // console.log('dddddddddddddddddd', data);

      if (!data?.createConversation) {
        throw new Error('Failed to create conversation');
      }

      const {
        createConversation: { conversationId },
      } = data;
      router.push({ query: { conversationId } });/* /?conversaionId:тутАйдишник */
      setParticipants([]);
      setUsername('');
      onClose();
    } catch (error: any) {
      console.log('onCreateConversation error: ', error);
      toast.error(error?.message);
    }
  };
  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent bg="#2d2d2d" pb={4}>
          <ModalHeader>Create a conversation</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <form onSubmit={onSearch}>
              <Stack spacing={4}>
                {/* column div */}
                <Input
                  placeholder="Enter a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <Button type="submit" disabled={!username} isLoading={loading}>
                  Search
                </Button>
              </Stack>
            </form>
            {data?.searchUsers && (
              <UserSearchList addParticipant={addParticipant} users={data.searchUsers} />
            )}
            {participants.length !== 0 && (
              <>
                <Participants participants={participants} removeParticipant={removeParticipant} />
                <Button
                  isLoading={createConversationLoading}
                  bg="brand.100"
                  width="100%"
                  mt={6}
                  _hover={{ bg: 'brand.100' }}
                  onClick={onCreateConversation}>
                  Create Conversation
                </Button>
              </>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};
export default ConversationModal;
