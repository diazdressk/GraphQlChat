/* тк буду сабскрипшны делать...вебсокеты, использую аполло-сервер-экспресс.. */

/**
 * снала устанавливаю тс npm i --save-dev typescript
 * потом
 * npm i ts-node чтобы запускать тс
 */

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { PrismaClient } from '@prisma/client';
import { json } from 'body-parser';
import cors from 'cors';
import * as dotenv from 'dotenv'; /* чтобы считывать env */
import express from 'express';
import { PubSub } from 'graphql-subscriptions';
import { useServer } from 'graphql-ws/lib/use/ws';
import http from 'http';
import { getSession } from 'next-auth/react';
import { WebSocketServer } from 'ws'; /* ...'ws'---показывало вот так,это значит,что типы для библиотеки не установлены,в подсказке при наведении,показывается что нужно установить */
import resolvers from './graphql/resolvers';
import typeDefs from './graphql/typeDefs';
import { GraphQLContext, Session, SubscriptionContext } from './util/types';

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
  const pubsub = new PubSub(); /* подписка на сабскрипшны,под капотом ВЕбСокет обычный */

  const serverCleanup = useServer(
    {
      schema,
      /* чтобы получить доступ к контексту внутри subscriptions, передаю вот так context */ context:
        async (ctx: SubscriptionContext): Promise<GraphQLContext> => {
          if (ctx.connectionParams && ctx.connectionParams.session) {
            const { session } = ctx.connectionParams;
            return { session, prisma, pubsub };
          }
          return { session: null, prisma, pubsub };
        },
    },
    wsServer,
  );

  const server = new ApolloServer({
    schema,
    csrfPrevention: true,
    // context: async ({ req, res }): Promise<GraphQLContext> => {
    //   /* тут возьму из некстАуса данные о пользователе и через контекст отдам в резолвер */
    //   const session = (await getSession({ req })) as Session;
    //   // console.log('bbbaaaaaaaaaaaaaaaa', session);

    //   return { session, prisma, pubsub };
    // },
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
    ],
  });
  await server.start();

  const corsOptions = {
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  };

  app.use(
    '/graphql',
    cors<cors.CorsRequest>(corsOptions),
    json(),
    expressMiddleware(server, {
      context: async ({ req }): Promise<GraphQLContext> => {
        const session = await getSession({ req });

        return { session: session as Session, prisma, pubsub };
      },
    }),
  );

  const PORT = 4000

  await new Promise<void>((resolve) => httpServer.listen(PORT, resolve));
  console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
}

main().catch((err) => console.log(err));
