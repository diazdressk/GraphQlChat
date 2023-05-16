import { Prisma, PrismaClient } from '@prisma/client';
import { PubSub } from 'graphql-subscriptions';
import { Context } from 'graphql-ws/lib/server';
import { ISODateString } from 'next-auth';
import { conversationPopulated, participantPopulated } from '../graphql/resolvers/conversation';
import { messagePopulated } from '../graphql/resolvers/message';

/**
 * 
 * Seever Configurations
 */
export interface GraphQLContext {
  session: Session | null;
  prisma: PrismaClient;
  pubsub: PubSub/*  */
}

export interface Session {
  user: User;
  expires: ISODateString;
}

export interface SubscriptionContext extends Context {
  connectionParams: {
    session?: Session
  }
}

/** 
 * User
 * */
export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  emailVerified?: boolean;
}

export interface CreateUsernameResponse {
  success?: boolean;
  error?: string;
}

export type ConversationPopulated = Prisma.ConversationGetPayload<{/* генерирую типы призмой,его укажу во фронте */
  include: typeof conversationPopulated;
}>;

export type ParticipantPopulated = Prisma.ConversationParticipantGetPayload<{
  include: typeof participantPopulated
}>

export interface ConversationUpdatedSubscriptionPayload {
  conversationUpdated: {
    conversation: ConversationPopulated
  }
}
/**  
 * Messages
*/
export interface SendMessageArguments {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
}

export interface MessageSentSubscriptionPayload {
  messageSent: MessagePopulated
}
/* пейлоад(тип сообщения) генерируется призмой */
export type MessagePopulated = Prisma.MessageGetPayload<{
  include: typeof messagePopulated
}>