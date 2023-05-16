import { useMutation } from '@apollo/client';
import { Box, Input } from '@chakra-ui/react';
import { ObjectID } from 'bson';
import { Session } from 'next-auth';
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { SendMessageArguments } from '../../../../../../backend/src/util/types';
import MessageOperations from '../../../../graphql/operations/message';
import { MessagesData } from '../../../../utill/types';
interface MessageInputProps {
  session: Session;
  conversationId: string;
}

const MessageInput: React.FC<MessageInputProps> = ({ session, conversationId }) => {
  const [message, setMessage] = useState('');
  const [sendMessage] = useMutation<
    { sendMessage: boolean /* то,что придёт в ответ после отправки сообщения */ },
    SendMessageArguments /* тело при отправлении сообщения */
  >(
    MessageOperations.Mutation.sendMessage /* , {
    onError: ({message}) => {
      throw new Error(message);
    }
  } ---могу так обрабатывать ошибки, либо 
    if (!data?.sendMessage || errors) {
        throw new Error('Failed to send message')
    }
  */,
  );

  const onSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { id: senderId, image } = session.user;
      const messageId = new ObjectID().toString();
      const newMessage: SendMessageArguments = {
        id: messageId,
        senderId,
        conversationId,
        body: message,
      };
      setMessage('');
      const { data, errors } = await sendMessage({
        variables: {
          ...newMessage,
        },
        optimisticResponse: {
          /* рендерю до ответа от сервера,не дожидаясь */ sendMessage: true,
        },
        /* отправляю новое сообщение на сервер,а тут обновляю кэш */ update: (cache) => {
          const existing = cache.readQuery<MessagesData>({
            query: MessageOperations.Query.messages,
            variables: { conversationId },
          }) as MessagesData;

          /* обновляю кэш */ cache.writeQuery<MessagesData, { conversationId: string }>({
            query: MessageOperations.Query.messages,
            variables: { conversationId },
            data: {
              ...existing,
              messages: [
                {
                  id: messageId,
                  body: message,
                  senderId: session.user.id,
                  conversationId,
                  sender: {
                    id: session.user.id,
                    username: session.user.username,
                  },
                  createdAt: new Date(Date.now()),
                  updatedAt: new Date(Date.now()),
                },
                ...existing.messages,
              ],
            },
          });
        },
      });
      if (!data?.sendMessage || errors) {
        throw new Error('Failed to send message');
      }
    } catch (error: any) {
      console.log('onSendMessage error: ', error);
      toast.error(error?.message);
    }
  };

  return (
    <Box px={4} py={6} width="100%">
      <form onSubmit={onSendMessage}>
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="New message"
          size="md"
          resize="none"
          _focus={{
            boxShadow: 'none',
            border: '1px solid',
            borderColor: 'whiteAlpha.300',
          }}
        />
      </form>
    </Box>
  );
};

export default MessageInput;
