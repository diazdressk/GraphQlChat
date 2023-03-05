import { GraphQLContext } from '../../util/types';

const resolvers = {
  // Query:{},
  Mutation: {
    createConversation: async (
      _: any,
      args: { participantIds: Array<string>; context: GraphQLContext },
    ) => {
      console.log('ggggggggggggg', args);

    },
  },
};

export default resolvers;
