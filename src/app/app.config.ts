// src/app/app.config.ts
import { ApplicationConfig, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { InMemoryCache, ApolloLink } from '@apollo/client/core';
import { routes } from './app.routes';
import { POKEAPI_GRAPHQL_URL } from './common/constants/api.constants';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimationsAsync(),
    // PokeAPI용 Apollo Client (읽기 전용)
    provideApollo(() => {
      const httpLink = inject(HttpLink);
      
      const removePersistedQueryLink = new ApolloLink((operation, forward) => {
        if (operation.extensions && operation.extensions['persistedQuery']) {
          delete operation.extensions['persistedQuery'];
        }
        return forward(operation);
      });
      
      return {
        link: removePersistedQueryLink.concat(
          httpLink.create({ uri: POKEAPI_GRAPHQL_URL })
        ),
        cache: new InMemoryCache({
          typePolicies: {
            pokemon_v2_pokemon: { keyFields: ['id'] },
          },
        }),
        defaultOptions: {
          query: { fetchPolicy: 'network-only', errorPolicy: 'all' },
        },
      };
    }),
  ],
};