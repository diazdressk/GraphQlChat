import { Prisma } from '@prisma/client';
import { GraphQLError } from 'graphql';
import { withFilter } from 'graphql-subscriptions';
import { ConversationPopulated, ConversationUpdatedSubscriptionPayload, GraphQLContext } from '../../util/types';
import { userIsConversationParticipant } from '../../util/functions';

const resolvers = {
  Query: {
    conversations: async (
      _: any,
      __: any,
      context: GraphQLContext,
    ): Promise<Array<ConversationPopulated>> => {
      const { session, prisma } = context;
      if (!session?.user) {
        throw new GraphQLError('Not authorized');
      }
      const {
        user: { id: userId },
      } = session;
      try {
        const conversations = await prisma.conversation.findMany({
          // where: {
          //   participants: {
          //     some: {
          //       userId: {
          //         equals: userId,
          //       }
          //     }
          //   }
          // }, ----запрос должен был быть таким,но оно не работает, баг в аполло-призма-монгодб,поэтому вместо этого запроса просто получу все сообщения и отфильтрую их

          include: conversationPopulated,
        });
        return conversations.filter((conversation) =>
          conversation.participants.find((p) => p.userId === userId),
        );
      } catch (error: any) {
        console.log('conversation error: ', error);
        throw new GraphQLError(error?.message);
      }
    },
  },
  Mutation: {
    createConversation: async (
      _: any,
      args: { participantIds: Array<string> },
      context: GraphQLContext,
    ): Promise<{ conversationId: string }> => {
      // console.log('ggggggggggggg', args);
      const { prisma, session, pubsub } = context;
      const { participantIds } = args;

      if (!session?.user) {
        throw new GraphQLError('No Authorized');
      }

      const {
        user: { id: userId },
      } = session;

      try {
        const conversation = await prisma.conversation.create({
          data: {
            participants: {
              createMany: {
                data: participantIds.map((id) => ({
                  userId: id,
                  hasSeenLatestMessage: id === userId,
                })),
              },
            },
          },
          include: conversationPopulated,
        });

        /* создаю беседу, 1 параметр Ключ, второй нагрузка-conversation...данные о беседе */
        pubsub.publish('CONVERSATION_CREATED', { conversationCreated: conversation });

        return {
          conversationId: conversation.id,
        };
      } catch (error: any) {
        console.log('createConversationError ', error);
        throw new GraphQLError('Error creating conversation');
      }
    },
    markConversationAsRead: async (
      _: any,
      args: { userId: string; conversationId: string },
      context: GraphQLContext,
    ): Promise<boolean> => {
      const { session, prisma } = context;
      const { userId, conversationId } = args;

      if (!session?.user) {
        throw new GraphQLError('Not authorized');
      }

      try {
        const participant = await prisma.conversationParticipant.findFirst({
          where: {
            userId,
            conversationId,
          },
        });

        await prisma.conversationParticipant.update({
          where: {
            id: participant?.id,
          },
          data: {
            hasSeenLatestMessage: true,
          },
        });
        return true;
      } catch (error: any) {
        console.log('markConversationAsRead erro: ', error);
        throw new GraphQLError(error?.message);
      }
    },
  },
  Subscription: {
    conversationCreated: {
      subscribe: withFilter(
        /* это фильтрация, первый параметр то, что будет отправляться, второй параметр- фильтрация...именно тут, фильтрую  по юзерам, которые участвуют в беседе...если юзер участник беседы, то ему отправляются эти данные с сообщениями */(
        _: any,
        __: any,
        context: GraphQLContext,
      ) => {
          const { pubsub } = context;
          return pubsub.asyncIterator(['CONVERSATION_CREATED']); /* слушаю по этому ключу */
        },
        (payload: ConversationCreatedSubscriptionPayload, _, context: GraphQLContext) => {
          const { session } = context;

          if (!session?.user) {
            throw new GraphQLError('Not authorized');
          }

          const {
            conversationCreated: { participants },
          } = payload;

          // const userIsParticipant = !!participants?.find((p) => p.userId === session?.user?.id);

          const userIsParticipant = userIsConversationParticipant(participants, session.user.id);

          return userIsParticipant;
        },
      ),
    },
    conversationUpdated: {
      subscribe: withFilter(
        (
          _: any,
          __: any,
          context: GraphQLContext,
        ) => {
          const { pubsub } = context;
          return pubsub.asyncIterator(['CONVERSATION_UPDATED']); /* слушаю по этому ключу */
        }, (payload: ConversationUpdatedSubscriptionPayload, _: any, context: GraphQLContext) => {
          const { session } = context;

          if (!session?.user) {
            throw new GraphQLError('Not authorized');
          }

          const { id: userId } = session.user;
          const { conversationUpdated: { conversation: { participants } } } = payload

          const userIsParticipant = userIsConversationParticipant(participants, userId)
          return userIsParticipant
        })
    },
  },
};

export interface ConversationCreatedSubscriptionPayload {
  conversationCreated: ConversationPopulated;
}

export const participantPopulated = Prisma.validator<Prisma.ConversationParticipantInclude>()({
  user: {
    select: {
      id: true,
      username: true,
    },
  },
});

export const conversationPopulated = Prisma.validator<Prisma.ConversationInclude>()({
  participants: {
    include: participantPopulated,
  },
  latestMessage: {
    include: {
      sender: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  },
});
export default resolvers;
