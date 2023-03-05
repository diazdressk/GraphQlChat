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
import { GraphQLContext, Session } from './util/types';
import { PrismaClient } from '@prisma/client';

async function main() {
  dotenv.config();
  const app = express();
  const httpServer = http.createServer(app);

  /* собираю схему */
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  const corsOptions = {
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  };

  const prisma = new PrismaClient();

  const server = new ApolloServer({
    schema,
    csrfPrevention: true,
    cache: 'bounded',
    context: async ({ req, res }): Promise<GraphQLContext> => {
      /* тут возьму из некстАуса данные о пользователе и через контекст отдам в резолвер */
      const session = await getSession({ req }) as Session;
      // console.log('bbbaaaaaaaaaaaaaaaa', session);

      return { session, prisma };
    },
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      ApolloServerPluginLandingPageLocalDefault({ embed: true }),
    ],
  });
  await server.start();
  server.applyMiddleware({ app, cors: corsOptions });
  await new Promise<void>((resolve) => httpServer.listen({ port: 4000 }, resolve));
  console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`);
}

main().catch((err) => console.log(err));
