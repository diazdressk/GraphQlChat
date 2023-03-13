/* тк буду сабскрипшны делать...вебсокеты, использую аполло-сервер-экспресс.. */

/**
 * снала устанавливаю тс npm i --save-dev typescript
 * потом
 * npm i ts-node чтобы запускать тс
 */

import { makeExecutableSchema } from '@graphql-tools/schema';
import {
  ApolloServerPluginDrainHttpServer,
  ApolloServerPluginLandingPageLocalDefault,
} from 'apollo-server-core';
import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import http from 'http';
import { getSession } from 'next-auth/react';
import resolvers from './graphql/resolvers';
import typeDefs from './graphql/typeDefs';
import * as dotenv from 'dotenv'; /* чтобы считывать env */
import { GraphQLContext, Session, SubscriptionContext } from './util/types';
import { PrismaClient } from '@prisma/client';
import { WebSocketServer } from 'ws'; /* ...'ws'---показывало вот так,это значит,что типы для библиотеки не установлены,в подсказке при наведении,показывается что нужно установить */
import { useServer } from 'graphql-ws/lib/use/ws';
import { PubSub } from 'graphql-subscriptions';

async function main() {
  dotenv.config();
  const app = express();
  const httpServer = http.createServer(app);

  const wsServer = new WebSocketServer({
    // This is the `httpServer` we created in a previous step.
    server: httpServer,
    // Pass a different path here if your ApolloServer serves at
    // a different path.
    path: '/graphql/subscriptions',
  });

  /* собираю схему */
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  const prisma = new PrismaClient();
  const pubsub = new PubSub()/* подписка на сабскрипшны,под капотом ВЕбСокет обычный */

  const serverCleanup = useServer(
    {
      schema,
      /* чтобы получить доступ к контексту внутри subscriptions, передаю вот так context */ context:
        async (ctx: SubscriptionContext): Promise<GraphQLContext> => {
          if (ctx.connectionParams && ctx.connectionParams.session) {
            const { session } = ctx.connectionParams
            return { session, prisma, pubsub }
          }
          return { session: null, prisma, pubsub }
        },
    },
    wsServer,
  );

  const corsOptions = {
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  };

  const server = new ApolloServer({
    schema,
    csrfPrevention: true,
    cache: 'bounded',
    context: async ({ req, res }): Promise<GraphQLContext> => {
      /* тут возьму из некстАуса данные о пользователе и через контекст отдам в резолвер */
      const session = (await getSession({ req })) as Session;
      // console.log('bbbaaaaaaaaaaaaaaaa', session);

      return { session, prisma, pubsub };
    },
    plugins: [
      // Proper shutdown for the HTTP server.
      ApolloServerPluginDrainHttpServer({ httpServer }),

      // Proper shutdown for the WebSocket server.
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
      ApolloServerPluginLandingPageLocalDefault({ embed: true }),
    ],
  });
  await server.start();
  server.applyMiddleware({ app, cors: corsOptions });
  await new Promise<void>((resolve) => httpServer.listen({ port: 4000 }, resolve));
  console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`);
}

main().catch((err) => console.log(err));
