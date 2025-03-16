import { createRealmContext } from "@realm/react";
import { Betting, Users, Draws, Combinations, Combination, Commission, Configuration, Messages, Conversation } from "./Models";

export const realmContext = createRealmContext({
    schema: [
      Betting,
      Messages,
      Conversation,
      Commission,
      Users,
      Draws,
      Combinations,
      Combination,
      Configuration
    ],
    schemaVersion: 0
  });
  