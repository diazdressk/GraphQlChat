import { ApolloClient, HttpLink, InMemoryCache, split } from '@apollo/client';
import { createClient } from 'graphql-ws';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { getSession } from 'next-auth/react';

/*  */
const httpLink = new HttpLink({
  uri: 'http://localhost:4000/graphql',
  credentials: 'include',
});

/* websocket-graphql subscriptions */
const wsLink =
  typeof window !== 'undefined' /* это чтобы убедиться,что в браузере,а не в некстСервере */
    ? new GraphQLWsLink(
        createClient({
          url: 'ws://localhost4000/graphql/subscriptions',
          /* этим параметром отправлю session в бэкенд,чтобы там забрать эти данные,при инициализации */ connectionParams:
            async () => ({
              session: await getSession(),
            }),
        }),
      )
    : null;

/* если в браузере,если то подключаю и вебСокет,либо прсто линк */
const link =
  typeof window !== 'undefined' && wsLink !== null
    ? split(
        ({ query }) => {
          const definition = getMainDefinition(query);
          return (
            definition.kind === 'OperationDefinition' && definition.operation === 'subscription'
          );
        },
        wsLink,
        httpLink,
      )
    : httpLink;

export const client = new ApolloClient({
  link,
  cache: new InMemoryCache(),
});
