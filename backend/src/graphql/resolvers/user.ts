import { User } from '@prisma/client';
import { GraphQLError } from 'graphql';
import { CreateUsernameResponse, GraphQLContext } from '../../util/types';

const resolvers = {
  Query: {
    searchUsers: async (
      _: any /* parent */,
      args: { username: string },
      context: GraphQLContext,
    ): Promise<Array<User>> => {
      const { username: searchedUsername } = args;
      const { session, prisma } = context;

      if (!session?.user) {
        throw new GraphQLError('Not Authorized');
      }

      const {
        user: { username: myUsername },
      } = session;

      try {
        const users = await prisma.user.findMany({
          where: {
            /* ищу среди username все совпадения кроме myUsername...insensitive-неточный поиск */
            username: {
              contains: searchedUsername,
              not: myUsername,
              mode: 'insensitive',
            },
          },
        });
        // console.log('eeeeeeeeeeeeeee', users);
        
        return users;
      } catch (error: any) {
        console.log('searchUsers error: ', error);
        throw new GraphQLError(error?.message);
      }
    },
  },
  Mutation: {
    createUsername: async (
      _: any /* parent */,
      args: { username: string },
      context: GraphQLContext,
    ): Promise<CreateUsernameResponse> => {
      const { username } = args;
      const { prisma, session } = context;
      // console.log('aaaaaaaaaaaaaaaaaaaaa', session);

      if (!session?.user) {
        /* проверяю авторизован ли */
        return { error: 'Not authorized' };
      }

      const { id: userId } = session.user;

      try {
        const existingUser = await prisma.user.findUnique({
          /* проверяю нет ли в бд этого юзернейма */
          where: {
            username,
          },
        });

        if (existingUser) {
          return {
            error: 'Username already taken. Try another',
          };
        }
        await prisma.user.update({
          where: {
            id: userId,
          },
          data: {
            username,
          },
        });
        return { success: true };
      } catch (error: any/* факин еррор!всегда эни! */) {
        console.log('createUsername error: ', error);
        return ({ error: error?.message });
      }
    },
  },
  // Subscription: {}
};

export default resolvers;
