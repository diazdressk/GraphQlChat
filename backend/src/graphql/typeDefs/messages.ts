import gql from 'graphql-tag';

const typeDefs = gql`
  type Message {
    id: String
    sender: User
    body: String
    createdAt: Date
  }

  type Query {
    """
    получение сообщений
    """
    messages(conversationId: String): [Message]
  }

  type Mutation {
    """
    создание сообщения
    """
    sendMessage(id: String, conversationId: String, senderId: String, body: String): Boolean
  }

  type Subscription {
    """
    подписка на новые сообщения
    """
    messageSent(conversationId: String): Message
  }
`;
export default typeDefs;
