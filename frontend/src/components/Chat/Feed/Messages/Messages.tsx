import { useQuery } from '@apollo/client';
import { Flex, Stack } from '@chakra-ui/react';
import { useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import MessageOperations from '../../../../graphql/operations/message';
import { MessagesData, MessagesVariables, MessageSubscriptionData } from '../../../../utill/types';
import SkeletonLoader from '../../../common/SkeletonLoader';
import MessageItem from './MessageItem';

interface MessagesProps {
  userId: string;
  conversationId: string;
}

const Messages: React.FC<MessagesProps> = ({ userId, conversationId }) => {
  const { data, loading, error, subscribeToMore } = useQuery<
    MessagesData /* то,что придет */,
    MessagesVariables /* аргументы */
  >(MessageOperations.Query.messages, {
    variables: {
      conversationId,
    },
    onError: ({ message }) => {
      toast.error(message);
    },
  });

  useEffect(() => {
    let unsubscribe = subscribeToMore({
      document: MessageOperations.Subscription.messageSent,
      variables: {
        conversationId,
      },
      updateQuery: (prev, { subscriptionData }: MessageSubscriptionData) => {
        if (!subscriptionData) return prev;

        const newMessage = subscriptionData.data.messageSent;
        return Object.assign({}, prev, {
          // if sender then we have the value in the cache, no need to update with new value
          // if not the sender, need to fetch new message
          messages:
            newMessage.sender.id === userId
              ? prev.messages
              : [newMessage, ...prev.messages],
        });
      },
    });

    return () => unsubscribe();
  }, [conversationId]);

  // const subscribeToMoreMessages = (conversationId: string) => {
  //   /* если появятся новые сообщения,сразу стягиваю их  */
  //   subscribeToMore({
  //     document: MessageOperations.Subscription.messageSent,
  //     variables: {
  //       conversationId,
  //     },
  //     updateQuery: (prev, { subscriptionData }: MessageSubscriptionData) => {
  //       if (!subscriptionData) return prev;

  //       const newMessage = subscriptionData.data.messageSent;

  //       return Object.assign({}, prev, {
  //         messages:
  //           /* если отправитель сообщения,то не добавляю новое сообщение в сообщения, а то будут дублироваться, оставляю все сообщения как есть */ newMessage
  //             .sender.id === userId
  //             ? prev.messages
  //             : [newMessage, ...prev.messages],
  //       });
  //     },
  //   });
  // };
  
  // useEffect(() => {
  //   subscribeToMoreMessages(conversationId);
  // }, [conversationId]);

  // const unsubscribe = useCallback(() => subscribeToMoreMessages(conversationId), []);

  // useEffect(() => {
  //   return () => unsubscribe();
  // }, [conversationId]);

  if (error) return null;

  return (
    <Flex direction="column" justify="flex-end" overflow="hidden">
      {loading && (
        <Stack spacing={4} px={4}>
          <SkeletonLoader count={3} height="60px" />
        </Stack>
      )}
      {data?.messages && (
        <Flex direction="column-reverse" overflowY="scroll" height="100%">
          {data.messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              sentByMe={message.sender.id === userId}
            />
          ))}
        </Flex>
      )}
    </Flex>
  );
};
export default Messages;
