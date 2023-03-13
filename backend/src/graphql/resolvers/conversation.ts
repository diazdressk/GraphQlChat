import { Prisma } from '@prisma/client';
import { GraphQLError } from 'graphql';
import { ConversationPopulated, GraphQLContext } from '../../util/types';

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
      const { prisma, session } = context;
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

        return {
          conversationId: conversation.id,
        };
      } catch (error: any) {
        console.log('createConversationError ', error);
        throw new GraphQLError('Error creating conversation');
      }
    },
  },
};

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
