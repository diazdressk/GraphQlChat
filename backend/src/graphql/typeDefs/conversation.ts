import gql from "graphql-tag"

const typeDefs = gql`
  scalar Date

  type Mutation {
    createConversation(participantIds: [String]): CreateConversationResponse
  }

  type Mutation {
    markConversationAsRead(userId: String!, conversationId: String!): Boolean
  }

  type CreateConversationResponse {
    conversationId: String
  }

  type Participant {
    id: String
    user: User
    hasSeenLatestMessage: Boolean
  }


  type Conversation {
    id: String
    latestMessage: Message
    participants: [Participant]
    createdAt: Date
    updatedAt: Date
  }

  type ConversationUpdatedSubscriptionPayload {
    conversation: Conversation
  }

  type Query {
    conversations: [Conversation]
  }

  type Subscription {
    conversationCreated: Conversation
  }

  type Subscription {
    conversationUpdated: ConversationUpdatedSubscriptionPayload
  }
`;

export default typeDefs;
