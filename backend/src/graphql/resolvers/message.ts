import { Prisma } from '@prisma/client';
import { GraphQLError } from 'graphql';
import { withFilter } from 'graphql-subscriptions';
import { userIdConversationParticipant } from '../../util/functions';
import {
  GraphQLContext,
  MessagePopulated,
  MessageSentSubscriptionPayload,
  SendMessageArguments,
} from '../../util/types';
import { conversationPopulated } from './conversation';

const resolvers = {
  Query: {
    messages: async function (
      _: any,
      args: { conversationId: string },
      context: GraphQLContext,
    ): Promise<Array<MessagePopulated>> {
      const { session, prisma } = context;
      const { conversationId } = args;

      if (!session?.user) {
        throw new GraphQLError('Not authorized');
      }

      const { id: userId } = session.user;

      /**определяю Участник ли беседы данный пользователь */

      /* сначала проверяю Есть ли вообще такая беседа */
      const conversation = await prisma.conversation.findUnique({
        where: {
          id: conversationId,
        },
        include: conversationPopulated /* добавлю сюда participants */,
      });
      if (!conversation) {
        throw new GraphQLError('Conversation not found');
      }

      const allowedToView = userIdConversationParticipant(
        conversation.participants,
        userId,
      ); /*есть ли участник в конверсатионе*/

      if (!allowedToView) {
        throw new GraphQLError('Not Authorized');
      }

      try {
        const messages = await prisma.message.findMany({
          where: {
            /* нахожу все сообщения беседы по айдишнику */ conversationId,
          },
          include:
            messagePopulated /* добавляю туда данные о партисипентах,которые участвуют в этой беседе */,
          orderBy: {
            /* фильтрую от Страрого к Новому */ createdAt: 'desc',
          },
        });
        return messages;
        // return [{ body: 'aaaaaaaaaaaaaaaaaaaaaaaaaa' } as MessagePopulated]
      } catch (error: any) {
        console.log('messages error: ', error);
        throw new GraphQLError(error?.message);
      }
    },
  },
  Mutation: {
    sendMessage: async (
      _: any,
      args: SendMessageArguments,
      context: GraphQLContext,
    ): Promise<boolean> => {
      const { prisma, pubsub, session } = context;
      const { body, conversationId, id: messageId, senderId } = args;

      if (!session?.user) {
        throw new GraphQLError('Not authorized');
      }

      const { id: userId } = session.user;

      if (userId !== senderId) {
        throw new GraphQLError('Not authorized');
      }

      try {
        const newMessage = await prisma.message.create({
          data: {
            id: messageId,
            senderId,
            conversationId,
            body,
          },
          include: messagePopulated,
        });

        const participant = await prisma.conversationParticipant.findFirst({
          where: {
            userId,
            conversationId,
          }
        })

        if (!participant) {
          throw new GraphQLError('Participant does not exist')
        }

        const { id: participantId } = participant;

        const conversation = await prisma.conversation.update({
          where: {
            /* выбираю беседу,в которую отправил сообщение */ id: conversationId,
          },
          data: {
            latestMessageId: newMessage.id,
            participants: {
              update: {
                where: {
                  /* беру отправителя */ id: participantId,
                },
                data: {
                  /* тк для отправителя сообщения не нужно делать сообщение Непрочитанным,тут делаю тру */
                  hasSeenLatestMessage: true,
                },
              },
              updateMany: {
                where: {
                  NOT: {
                    /* все участники беседы,у которых айди не равен айдишнику отрпавителя сообщения */
                    userId,
                  },
                },
                data: {
                  hasSeenLatestMessage:
                    false /* для них делаю Непрочитано для последнего сообщения */,
                },
              },
            },
          },
          include: conversationPopulated
        });

        pubsub.publish('MESSAGE_SENT', {
          messageSent: newMessage,
        }); /* отправляю новое сообщение через сабскрипшн,на фронте подпишусь на это и при появлении нового сообщения,покажу значок - "не прочитано"*/

        // pubsub.publish('CONVERSATION_UPDATED', {/* обновляю само сообщение */
        //   conversationUpdated: {
        //     conversation
        //   }
        // })
      } catch (error) {
        console.log('sendMessage error:', error);
        throw new GraphQLError('Error sending message');
      }

      return true;
    },
  },
  Subscription: {
    messageSent: {
      /* отправляю на фронт сообщения с withFilter фильтрую и отправляю только в беседу,в которую отправили */
      subscribe: withFilter(
        (_: any, __: any, context: GraphQLContext) => {
          const { pubsub } = context;
          return pubsub.asyncIterator(['MESSAGE_SENT']);
        },
        (
          payload: MessageSentSubscriptionPayload,
          args: { conversationId: string },
          context: GraphQLContext,
        ) /* тут фильтрую беседы и нахожу нужную */ => {
          return payload.messageSent.conversationId === args.conversationId;
        },
      ),
    },
  },
};

export const messagePopulated = Prisma.validator<Prisma.MessageInclude>()({
  sender: {
    select: {
      /* эти данные беру для messagePopulated */ id: true,
      username: true,
      image: true
    },
  },
});
export default resolvers;
