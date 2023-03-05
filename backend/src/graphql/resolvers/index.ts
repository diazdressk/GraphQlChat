import userResolvers from './user';
import conversationResolvers from './conversation';
import merge from 'lodash.merge'

const resolvers = merge({}, userResolvers, conversationResolvers);/* соединяю все резолверы в один объект,лодашевская функция */

export default resolvers;
